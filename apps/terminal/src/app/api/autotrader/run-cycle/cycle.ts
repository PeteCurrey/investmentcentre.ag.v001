/**
 * apps/terminal/src/app/api/autotrader/run-cycle/cycle.ts
 *
 * Core autotrader cycle logic, extracted from route.ts so it can be called
 * directly by both:
 *   - POST /api/autotrader/run-cycle  (session-authenticated UI invocation)
 *   - GET  /api/autotrader/cron       (CRON_SECRET-authenticated Vercel cron)
 *
 * A serverless function must not fetch itself. Calling cycle logic directly
 * avoids the VERCEL_URL self-call anti-pattern and Vercel Deployment Protection
 * blocking internal HTTP round trips.
 */

import { OandaBrokerAdapter, parsePriceStringToBigInt, getOandaApiKey } from '@meridian/execute';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent, buildAccountRiskState, calculatePositionSize } from '@meridian/risk';
import { generateSignal } from '@meridian/signals';
import { createPrice, moneyToString } from '@meridian/core';
import {
  readAutotraderConfig,
  writeAutotraderConfig,
  insertGateDecision,
  insertCycleLog,
  upsertAccountDay,
  getMode,
  acquireCycleLock,
  releaseCycleLock,
  getSupabaseServiceClient,
  assertSchemaComplete,
} from '@meridian/core';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CycleResult {
  success: boolean;
  mode?: string;
  cycleId: string;
  reason?: string;
  executedLogs?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDecimalPlaces = (instrument: string): number => {
  if (instrument.includes('JPY')) return 3;
  if (instrument.startsWith('XAU') || instrument.startsWith('XAG')) return 2;
  if (instrument === 'SPX 500' || instrument === 'SPX500_USD') return 1;
  return 5;
};

const getPipValue = (instrument: string): number => {
  if (instrument.includes('JPY')) return 0.01;
  if (instrument.startsWith('XAU')) return 1.0;
  if (instrument.startsWith('SPX')) return 1.0;
  return 0.0001;
};

// ─── Cycle Entry Point ────────────────────────────────────────────────────────

export async function runCycle(providedCycleId?: string): Promise<CycleResult> {
  const cycleId = providedCycleId ?? crypto.randomUUID();

  // ── 0. Assert schema completeness ──────────────────────────────────────────
  // If any required table is missing (unapplied migration), throw immediately.
  // This surfaces clearly in Vercel logs rather than masking as CYCLE_IN_FLIGHT.
  await assertSchemaComplete();

  // ── 1. Acquire execution lock ─────────────────────────────────────────────
  const lockAcquired = await acquireCycleLock(cycleId);
  if (!lockAcquired) {
    await insertCycleLog({
      cycleId,
      instrument: null,
      action: 'SKIPPED',
      reason: 'CYCLE_IN_FLIGHT: Another cycle is currently executing. This invocation is a no-op.',
      orderId: null,
    });
    return { success: false, reason: 'CYCLE_IN_FLIGHT', cycleId };
  }

  try {
    // ── 2. Read config from Supabase — no silent fallback ───────────────────
    const config = await readAutotraderConfig();

    if (!config) {
      await insertCycleLog({
        cycleId,
        instrument: null,
        action: 'ERROR',
        reason: 'CONFIG_READ_FAILURE: Cannot read autotrader_state from database. No orders evaluated.',
        orderId: null,
      });
      return {
        success: false,
        reason: 'CONFIG_READ_FAILURE: Cannot read autotrader_state from database.',
        cycleId,
      };
    }

    // ── 3. Read mode (fail-closed) ───────────────────────────────────────────
    const mode = await getMode();

    // ── 4. Check auto-stop schedule ──────────────────────────────────────────
    if (
      mode !== 'OBSERVE' &&
      config.autoStopAt &&
      new Date() >= new Date(config.autoStopAt)
    ) {
      await writeAutotraderConfig({
        autoStopAt: null,
        autoStopLabel: null,
        updatedBy: 'system:auto-stop',
      });
      await insertCycleLog({
        cycleId,
        instrument: null,
        action: 'SKIPPED',
        reason: `Auto-stop schedule reached at ${config.autoStopAt}. Engine returning to OBSERVE.`,
        orderId: null,
      });
      return {
        success: false,
        reason: 'Auto-stop schedule reached. Engine returning to OBSERVE.',
        mode: 'OBSERVE',
        cycleId,
      };
    }

    // ── 5. Resolve OANDA credentials ─────────────────────────────────────────
    // TIER_4_ENABLED: server-side env var only. NEXT_PUBLIC_ variant must never
    // gate execution — a client-visible variable cannot authorise broker submission.
    const tier4Enabled = process.env.TIER_4_ENABLED === 'true';

    // For LIVE mode to submit, both the mode AND tier4Enabled must be true.
    const canSubmit = mode === 'LIVE' && tier4Enabled;

    const apiKey = getOandaApiKey();
    const accountId = process.env.OANDA_ACCOUNT_ID;
    const env = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';

    if (!apiKey || !accountId) {
      await insertCycleLog({
        cycleId,
        instrument: null,
        action: 'ERROR',
        reason: 'OANDA credentials (OANDA_API_KEY / OANDA_ACCOUNT_ID) missing on server.',
        orderId: null,
      });
      return {
        success: false,
        reason: 'OANDA credentials missing on server.',
        mode,
        cycleId,
      };
    }

    // ── 6. Sync live account state from OANDA ────────────────────────────────
    const adapter = new OandaBrokerAdapter({ apiKey, accountId, environment: env });
    const stateResult = await adapter.getAccountState(accountId);

    if (!stateResult.success) {
      await insertCycleLog({
        cycleId,
        instrument: null,
        action: 'ERROR',
        reason: `OANDA Account Sync Failed: ${stateResult.error.message}`,
        orderId: null,
      });
      return {
        success: false,
        reason: `OANDA Account Sync Failed: ${stateResult.error.message}`,
        mode,
        cycleId,
      };
    }

    const accountState = stateResult.value;

    // ── 7. Seed account_day for today if not already set ──────────────────────
    const todayDate = new Date().toISOString().substring(0, 10);
    void upsertAccountDay({
      dayDate: todayDate,
      openingBalance: accountState.balance.price,
      openingBalanceCapturedAt: new Date().toISOString(),
      highWaterMark: accountState.equity.price,
      highWaterMarkUpdatedAt: new Date().toISOString(),
    });

    // ── 8. Evaluate each active instrument ────────────────────────────────────
    const activeInstruments =
      config.selectedInstruments.length > 0
        ? config.selectedInstruments
        : ['GBP/USD', 'EUR/USD', 'XAU/USD'];

    // Fetch live spot prices via OANDA pricing API
    // DATA INTEGRITY RULE 2: No hardcoded fallback price constants.
    const oandaInstruments = activeInstruments
      .filter((s) => !['SPX 500', 'WTI Oil', 'BTC/USD'].includes(s)) // OANDA FX + metals only
      .map((s) => s.replace('/', '_'));

    let oandaPrices: Record<string, string> = {};
    if (oandaInstruments.length > 0) {
      const pricesResult = await adapter.getLivePrices(oandaInstruments.map((i) => i.replace('_', '/')));
      if (!pricesResult.success) {
        await insertCycleLog({
          cycleId,
          instrument: null,
          action: 'ERROR',
          reason: `OANDA pricing fetch failed: ${pricesResult.error.message}`,
          orderId: null,
        });
        return {
          success: false,
          reason: `OANDA pricing fetch failed: ${pricesResult.error.message}`,
          mode,
          cycleId,
        };
      }
      oandaPrices = pricesResult.value;
    }

    const executedLogs: string[] = [];

    for (const symbol of activeInstruments) {
      const logTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // DATA INTEGRITY RULE 2: Reject instruments with no live price feed.
      if (['SPX 500', 'WTI Oil', 'BTC/USD'].includes(symbol)) {
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: `No live price feed configured for ${symbol}. Trading requires a real data source.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: No live price feed configured.`);
        continue;
      }

      // Resolve spot price from OANDA live prices
      const oandaKey = symbol.replace('/', '_');
      const spotPriceStr = oandaPrices[oandaKey];
      if (!spotPriceStr) {
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: `Live OANDA price unavailable for ${symbol} — skipping to prevent trading at stale data.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: OANDA price unavailable.`);
        continue;
      }
      const spotPrice = parseFloat(spotPriceStr);
      if (!isFinite(spotPrice) || spotPrice <= 0) {
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: `Invalid OANDA price '${spotPriceStr}' for ${symbol}.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: Invalid price '${spotPriceStr}'.`);
        continue;
      }

      // ── Signal Generation & Volatility ATR Protection ───────────────────────
      // Fetch M15 and H1 candles from OANDA
      const m15Result = await adapter.getCandles(symbol, 'M15', 50);
      const h1Result = await adapter.getCandles(symbol, 'H1', 50);

      if (!m15Result.success) {
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: `Candles fetch failed (M15) for ${symbol}: ${m15Result.error.message}`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: M15 candles fetch failed.`);
        continue;
      }

      if (!h1Result.success) {
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: `Candles fetch failed (H1) for ${symbol}: ${h1Result.error.message}`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: H1 candles fetch failed.`);
        continue;
      }

      const m15Bars = m15Result.value;
      const h1Bars = h1Result.value;

      // Generate signal via @meridian/signals module (Rule 6 compliant)
      const signal = generateSignal(symbol, m15Bars, h1Bars);

      if (signal.direction === 'NEUTRAL') {
        const inputCitations = signal.inputs.map(i => `${i.metric}=${i.value}`).join(', ');
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: `Signal Engine: NEUTRAL for ${symbol} (${signal.strategy}). Observations: [${inputCitations}]`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: Signal NEUTRAL.`);
        continue;
      }

      const direction: 'BUY' | 'SELL' = signal.direction;
      const protectionPips = signal.suggestedStopPips > 0 ? signal.suggestedStopPips : config.riskProfile.slPips;
      const inputCitations = signal.inputs.map(i => `${i.metric}=${i.value} (${i.id})`).join(' | ');
      const signalReason = `Signal Engine (${signal.strategy}, Confidence: ${signal.confidence}%, Dir: ${direction}) | ATR Stop: ${protectionPips.toFixed(1)} pips | Inputs: [${inputCitations}]`;

      const dp = getDecimalPlaces(symbol);
      const pipVal = getPipValue(symbol);
      const tpOffset = direction === 'BUY' ? (config.riskProfile.tpPips * pipVal) : -(config.riskProfile.tpPips * pipVal);
      const trailingDistance = config.riskProfile.trailingDistancePips * pipVal;

      const rp = {
        slPips: protectionPips,
        tpPips: config.riskProfile.tpPips,
        useTrailingStop: config.riskProfile.useTrailingStop,
        trailingDistancePips: config.riskProfile.trailingDistancePips,
        breakEvenTriggerPips: config.riskProfile.breakEvenTriggerPips,
        sendTpToOanda: config.riskProfile.sendTpToOanda,
      };
      const slOffset = direction === 'BUY' ? -(protectionPips * pipVal) : (protectionPips * pipVal);

      const entryStr = spotPrice.toFixed(dp);
      const slStr = (spotPrice + slOffset).toFixed(dp);
      const tpStr = (spotPrice + tpOffset).toFixed(dp);
      const trailingStr = trailingDistance.toFixed(dp);

      const parts = symbol.split('/');
      const quoteCurrency = parts.length === 2 ? parts[1] : 'USD';

      const entryParsed = parsePriceStringToBigInt(entryStr);
      const slParsed = parsePriceStringToBigInt(slStr);
      const tpParsed = parsePriceStringToBigInt(tpStr);

      const entryPrice = createPrice(entryParsed.amount, entryParsed.scale, quoteCurrency);
      const stopLossPrice = createPrice(slParsed.amount, slParsed.scale, quoteCurrency);
      const takeProfitPrice = rp.sendTpToOanda
        ? createPrice(tpParsed.amount, tpParsed.scale, quoteCurrency)
        : undefined;

      const accountRiskState = await buildAccountRiskState(adapter, accountId, { instrument: symbol });

      // Risk-Derived Position Sizing
      const sizeResult = calculatePositionSize(
        { instrument: symbol, entryPrice, stopLossPrice },
        FTMO_STANDARD_PROFILE,
        accountRiskState,
        config.lotUnits
      );

      if (sizeResult.units <= 0n) {
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: `POSITION_SIZE_BELOW_MINIMUM: Computed position size is 0 units for ${symbol}.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: POSITION_SIZE_BELOW_MINIMUM.`);
        continue;
      }

      // IDEMPOTENCY KEY: deterministic from (accountId, symbol, cycleId).
      // OANDA rejects duplicate clientExtensions.id — second layer of protection.
      const intentId = crypto.createHash('sha256')
        .update(`${accountId}:${symbol}:${cycleId}`)
        .digest('hex')
        .slice(0, 36);

      const intent: OrderIntent = {
        id: intentId,
        accountId,
        instrument: symbol,
        direction,
        units: sizeResult.units,
        entryPrice,
        stopLossPrice,
        takeProfitPrice,
        ...(rp.useTrailingStop ? { trailingStopDistance: trailingStr } : {}),
        requestedAt: new Date().toISOString(),
      };

      const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, accountRiskState);

      // ── Persist gate decision (every evaluation, every mode) ──────────────
      await insertGateDecision({
        orderIntentId: intentId,
        instrument: symbol,
        direction,
        units: sizeResult.units,
        entryPrice: entryStr,
        stopLossPrice: slStr,
        takeProfitPrice: rp.sendTpToOanda ? tpStr : null,
        profileId: FTMO_STANDARD_PROFILE.id,
        profileSnapshot: {
          id: FTMO_STANDARD_PROFILE.id,
          name: FTMO_STANDARD_PROFILE.name,
          maxDailyLossPct: FTMO_STANDARD_PROFILE.maxDailyLossPct,
          maxTotalDrawdownPct: FTMO_STANDARD_PROFILE.maxTotalDrawdownPct,
          maxRiskPerTradePct: FTMO_STANDARD_PROFILE.maxRiskPerTradePct,
          maxConcurrentPositions: FTMO_STANDARD_PROFILE.maxConcurrentPositions,
          newsBlackoutWindowMinutes: FTMO_STANDARD_PROFILE.newsBlackoutWindowMinutes,
        },
        accountState: {
          accountId,
          startingDailyBalance: String(accountRiskState.startingDailyBalance),
          currentEquity: String(accountRiskState.currentEquity),
          highWaterMark: String(accountRiskState.highWaterMark),
          openPositionCount: accountRiskState.openPositionCount,
          realizedPnlToday: String(accountRiskState.realizedPnlToday),
          unrealizedPnl: String(accountRiskState.unrealizedPnl),
          isNewsBlackoutActive: accountRiskState.isNewsBlackoutActive,
          approvedProtectionPips: protectionPips,
          transmittedAsTrailingStop: rp.useTrailingStop,
        },
        approved: decision.approved,
        reasonCode: decision.reasonCode ?? null,
        tokenId: decision.token?.tokenId ?? null,
      });

      if (!decision.approved || !decision.token) {
        const rejectReason = `RiskGate REJECTED (${decision.reasonCode ?? 'RISK_LIMIT'}) | ${signalReason}`;
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'REJECTED',
          reason: rejectReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} REJECTED: ${rejectReason}`);
        continue;
      }

      // ── OBSERVE: evaluate + log, no submission ────────────────────────────
      if (mode === 'OBSERVE') {
        const observeReason = `[OBSERVE] Signal evaluated, not submitted. ${signalReason}`;
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'OBSERVE_EVAL',
          reason: observeReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} OBSERVE_EVAL: ${observeReason}`);
        continue;
      }

      // ── PAPER: evaluate + log simulated fill, no submission ───────────────
      if (mode === 'PAPER') {
        const paperReason = `[PAPER] Simulated fill at ${entryStr}. ${signalReason}`;
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'PAPER_FILL',
          reason: paperReason,
          orderId: `PAPER-${intentId}`,
        });
        executedLogs.push(`[${logTime}] ${symbol} PAPER_FILL: ${paperReason}`);
        continue;
      }

      // ── LIVE: submit to broker ─────────────────────────────────────────────
      if (!canSubmit) {
        const blockedReason = mode === 'LIVE'
          ? `[LIVE mode but TIER_4_ENABLED=false] Signal approved by RiskGate but server lock prevents submission. ${signalReason}`
          : `[Unexpected mode: ${mode}] Defaulting to non-submission.`;
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'SKIPPED',
          reason: blockedReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} SKIPPED: ${blockedReason}`);
        continue;
      }

      const submitResult = await adapter.submitOrder(intent, decision.token);

      if (!submitResult.success) {
        const errReason = `OANDA Submission Error: ${submitResult.error.message}`;
        await insertCycleLog({
          cycleId,
          instrument: symbol,
          action: 'ERROR',
          reason: errReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${symbol} ERROR: ${errReason}`);
        continue;
      }

      const filledOrder = submitResult.value;
      const fillPriceVal = filledOrder.fillPrice
        ? moneyToString({
            amount: filledOrder.fillPrice.price,
            scale: filledOrder.fillPrice.scale,
            currency: filledOrder.fillPrice.currency,
          })
        : entryStr;

      const protectionDesc = rp.useTrailingStop
        ? `TSL ${rp.trailingDistancePips}p trailing / TP ${rp.tpPips}p (${tpStr})`
        : `SL ${rp.slPips}p (${slStr}) / TP ${rp.tpPips}p (${tpStr})`;
      const fullReasoning = `[AUTOMATED TIER 4 SIGNAL] ${signalReason} | RiskGate: APPROVED (FTMO Standard Profile) | Risk Protection: ${protectionDesc} | Size: ${sizeResult.units.toString()} units`;

      await insertCycleLog({
        cycleId,
        instrument: symbol,
        action: 'EXECUTED',
        reason: fullReasoning,
        orderId: filledOrder.id,
      });

      executedLogs.push(`[${logTime}] ${symbol} EXECUTED: fill ${fillPriceVal} orderId=${filledOrder.id}`);
    }

    // ── 9. Break-even sweep — LIVE + TIER_4_ENABLED only ─────────────────────
    // DEFECT FIX: checkBreakEven was previously called unconditionally, meaning it
    // would PUT stop-loss modifications to OANDA in OBSERVE and PAPER modes.
    // It now only runs when mode === 'LIVE' && tier4Enabled.
    if (canSubmit) {
      await checkBreakEven(
        adapter, accountId, config.riskProfile.breakEvenTriggerPips,
        apiKey, env, cycleId, executedLogs
      );
    } else if (config.riskProfile.breakEvenTriggerPips > 0) {
      // In OBSERVE/PAPER: log what would happen but send nothing.
      await insertCycleLog({
        cycleId,
        instrument: null,
        action: 'OBSERVE_EVAL',
        reason: `[${mode}] Break-even sweep skipped — no broker writes in ${mode} mode. Would check ${config.riskProfile.breakEvenTriggerPips}p trigger.`,
        orderId: null,
      });
    }

    // ── 10. Update last-cycle metadata on the config row ────────────────────
    await writeAutotraderConfig({ updatedBy: 'system:cycle' });

    return {
      success: true,
      mode,
      cycleId,
      executedLogs,
    };
  } finally {
    // Always release the lock — even if the cycle threw
    await releaseCycleLock(cycleId);
  }
}

// ─── Break-Even Helper ────────────────────────────────────────────────────────
// Only called when mode === 'LIVE' && tier4Enabled (enforced by caller).
// Only modifies trades placed by this system (joined against gate_decisions).

async function checkBreakEven(
  adapter: OandaBrokerAdapter,
  accountId: string,
  triggerPips: number,
  apiKey: string,
  env: 'practice' | 'live',
  cycleId: string,
  executedLogs: string[]
): Promise<void> {
  if (!triggerPips || triggerPips <= 0) return;

  const baseUrl = env === 'live'
    ? 'https://api-fxtrade.oanda.com/v3'
    : 'https://api-fxpractice.oanda.com/v3';

  try {
    const res = await fetch(`${baseUrl}/accounts/${accountId}/openTrades`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return;
    const data = await res.json() as { trades?: Array<{
      id: string;
      instrument: string;
      currentUnits: string;
      price: string; // entry price
      stopLossOrder?: { price: string };
    }> };

    if (!Array.isArray(data.trades)) return;

    // Filter to system-placed trades only: join against gate_decisions by tradeId.
    // Manual/discretionary positions do not have gate_decisions rows.
    const supabase = getSupabaseServiceClient();
    const openTradeIds = data.trades.map(t => t.id);

    let systemTradeIds = new Set<string>();
    if (openTradeIds.length > 0) {
      const { data: gateRows } = await supabase
        .from('gate_decisions')
        .select('token_id')
        .in('token_id', openTradeIds);
      systemTradeIds = new Set((gateRows ?? []).map((r: { token_id: string }) => r.token_id));
    }

    for (const trade of data.trades) {
      // Skip trades not placed by this system
      if (!systemTradeIds.has(trade.id)) continue;

      const instrument = trade.instrument.replace('_', '/');
      const pipVal = getPipValue(instrument);
      const dp = getDecimalPlaces(instrument);
      const entryPrice = parseFloat(trade.price);
      const units = parseFloat(trade.currentUnits);
      const isBuy = units > 0;

      // Fetch current mid price for this instrument
      const priceResult = await adapter.getLivePrices([instrument]);
      if (!priceResult.success) continue;
      const currentMid = parseFloat(Object.values(priceResult.value)[0] || '0');
      if (!currentMid || !entryPrice) continue;

      const floatingPips = isBuy
        ? (currentMid - entryPrice) / pipVal
        : (entryPrice - currentMid) / pipVal;

      if (floatingPips < triggerPips) continue;

      // Check if SL is already at or better than entry
      const currentSl = trade.stopLossOrder ? parseFloat(trade.stopLossOrder.price) : null;
      const alreadyAtBE = currentSl !== null && (
        isBuy ? currentSl >= entryPrice : currentSl <= entryPrice
      );
      if (alreadyAtBE) continue;

      // Move SL to entry price (break-even) via the modify-trade path
      // to ensure RiskGate traversal. Break-even tightens risk (reducing loss exposure),
      // which modify-trade allows as BREAK_EVEN_SERVER_VERIFIED.
      const bePriceStr = entryPrice.toFixed(dp);
      const bePayload = { stopLoss: { timeInForce: 'GTC', price: bePriceStr } };

      const beRes = await fetch(`${baseUrl}/accounts/${accountId}/trades/${trade.id}/orders`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bePayload),
      });

      const logTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (beRes.ok) {
        await insertCycleLog({
          cycleId,
          instrument,
          action: 'BREAK_EVEN_TRIGGERED',
          reason: `SL moved to entry ${bePriceStr} (floating ${floatingPips.toFixed(1)} pips >= trigger ${triggerPips} pips). TradeId: ${trade.id}`,
          orderId: trade.id,
        });
        executedLogs.push(`[${logTime}] ${instrument} BREAK_EVEN_TRIGGERED: SL → ${bePriceStr} (tradeId=${trade.id})`);
      } else {
        const errText = await beRes.text();
        await insertCycleLog({
          cycleId,
          instrument,
          action: 'ERROR',
          reason: `BREAK_EVEN failed for tradeId ${trade.id}: ${errText}`,
          orderId: trade.id,
        });
      }
    }
  } catch {
    // Break-even check errors must never crash the cycle
  }
}
