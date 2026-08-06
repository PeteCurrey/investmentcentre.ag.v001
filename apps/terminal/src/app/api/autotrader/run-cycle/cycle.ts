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
  getMode,
  acquireCycleLock,
  releaseCycleLock,
  getSupabaseServiceClient,
  assertSchemaComplete,
} from '@meridian/core';
import {
  getInstrument,
  getOandaId,
  getDisplaySymbol,
  getPipValue,
  getDecimalPlaces,
} from '../../../../lib/instruments';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CycleResult {
  success: boolean;
  mode?: string;
  cycleId: string;
  reason?: string;
  executedLogs?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum stop distance as a % of entry price before a signal is rejected.
 *  FX pairs: 5%. Index CFDs: 10% (index ATRs are legitimately larger). */
const MAX_STOP_DISTANCE_PCT: Record<string, number> = {
  FX: 5.0,
  INDEX: 10.0,
  COMMODITY: 10.0,
};

function getMaxStopDistancePct(inst: ReturnType<typeof getInstrument>): number {
  if (!inst) return MAX_STOP_DISTANCE_PCT.FX;
  if (inst.assetClass === 'INDEX' || inst.assetClass === 'COMMODITY') return MAX_STOP_DISTANCE_PCT.INDEX;
  return MAX_STOP_DISTANCE_PCT.FX;
}

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

    // ── 7. account_day is managed exclusively by buildAccountRiskState ─────────
    // DO NOT call upsertAccountDay() here — it would overwrite the opening_balance
    // baseline on every cycle, destroying daily-loss calculations.
    // buildAccountRiskState() in @meridian/risk inserts the row on first call
    // each day and only advances the high_water_mark monotonically thereafter.

    // ── 7.5. Fetch OANDA account tradeable instruments ────────────────────────
    let accountInstruments: Set<string> | null = null;
    const accountInstResult = await adapter.getAccountInstruments();
    if (accountInstResult.success) {
      accountInstruments = accountInstResult.value;
    }

    // ── 8. Evaluate each active instrument ────────────────────────────────────
    const activeInstruments =
      config.selectedInstruments.length > 0
        ? config.selectedInstruments
        : ['GBP/USD', 'EUR/USD', 'XAU/USD'];

    const executedLogs: string[] = [];

    // Filter candidate instruments by tradeability and resolve exact OANDA IDs
    const validCandidateOandaIds: string[] = [];
    const skippedPreflightMap = new Set<string>();

    for (const rawSymbol of activeInstruments) {
      const logTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const displaySymbol = getDisplaySymbol(rawSymbol);
      const inst = getInstrument(rawSymbol);
      const oandaId = inst?.oandaId || getOandaId(rawSymbol);

      // Check 1: Master universe tradeability flag (e.g. US_STOCK, UK_STOCK, CRYPTO non-tradeable)
      if (inst && !inst.oandaTradeable) {
        skippedPreflightMap.add(rawSymbol);
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: `[${displaySymbol}] (${inst.assetClass}) is marked non-tradeable on OANDA accounts.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: Non-tradeable asset class (${inst.assetClass}).`);
        continue;
      }

      // Check 2: OANDA account-level tradeability list
      if (accountInstruments && oandaId && !accountInstruments.has(oandaId)) {
        skippedPreflightMap.add(rawSymbol);
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: `[${displaySymbol}] Instrument '${oandaId}' is not offered on OANDA account ${accountId}.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: Not offered on OANDA account.`);
        continue;
      }

      if (oandaId) {
        validCandidateOandaIds.push(oandaId);
      }
    }

    // Fetch prices for valid tradeable candidates (batch with resilient fallback)
    let oandaPrices: Record<string, string> = {};
    if (validCandidateOandaIds.length > 0) {
      const batchResult = await adapter.getLivePrices(validCandidateOandaIds);
      if (batchResult.success) {
        oandaPrices = batchResult.value;
      } else {
        // Fallback: fetch prices per-instrument individually so 1 bad quote never kills the cycle
        for (const oid of validCandidateOandaIds) {
          const singleRes = await adapter.getLivePrices([oid]);
          if (singleRes.success) {
            Object.assign(oandaPrices, singleRes.value);
          }
        }
      }
    }

    // ── Build quoteToAccountRates from live prices ────────────────────────────
    // Account currency is GBP. For each instrument, determine how to convert
    // the quote currency into GBP so position sizing uses correct P&L units.
    //   • Quote = GBP (e.g. EUR/GBP, UK100/GBP) → rate = 1.0
    //   • Quote = USD → rate = 1 / GBP_USD_price (or USD/GBP if we have it)
    //   • Otherwise    → rate = 1.0 (conservative; logs a warning)
    const ACCOUNT_CURRENCY = 'GBP';
    const quoteToAccountRates: Record<string, number> = {};
    const gbpUsdPrice = parseFloat(oandaPrices['GBP_USD'] ?? oandaPrices['GBPUSD'] ?? '0');
    for (const oid of validCandidateOandaIds) {
      const priceStr = oandaPrices[oid];
      if (!priceStr) continue;
      const instForOid = Array.from(validCandidateOandaIds)
        .map(id => getInstrument(id))
        .find(i => i?.oandaId === oid);
      const parts = (instForOid?.symbol ?? '').split('/');
      const quoteCcy = parts.length === 2 ? parts[1] : 'USD';
      if (quoteCcy === ACCOUNT_CURRENCY) {
        quoteToAccountRates[quoteCcy] = 1.0;
      } else if (quoteCcy === 'USD' && gbpUsdPrice > 0) {
        // USD quote → divide by GBP/USD rate to get USD→GBP conversion
        quoteToAccountRates['USD'] = 1.0 / gbpUsdPrice;
      } else {
        quoteToAccountRates[quoteCcy] = 1.0; // fallback — conservative
      }
    }
    quoteToAccountRates[ACCOUNT_CURRENCY] = 1.0; // always safe

    for (const rawSymbol of activeInstruments) {
      const logTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const displaySymbol = getDisplaySymbol(rawSymbol);
      const inst = getInstrument(rawSymbol);
      const oandaId = inst?.oandaId || getOandaId(rawSymbol);

      // Skip if pre-flight tradeability check already logged a SKIPPED entry
      if (skippedPreflightMap.has(rawSymbol)) {
        continue;
      }

      // Resolve spot price from OANDA live prices
      const spotPriceStr = oandaId ? oandaPrices[oandaId] : undefined;
      if (!spotPriceStr) {
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: `Live OANDA price unavailable for ${displaySymbol} (${oandaId}) — skipping to prevent trading at stale data.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: OANDA price unavailable.`);
        continue;
      }

      const spotPrice = parseFloat(spotPriceStr);
      if (!isFinite(spotPrice) || spotPrice <= 0) {
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: `Invalid OANDA price '${spotPriceStr}' for ${displaySymbol}.`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: Invalid price '${spotPriceStr}'.`);
        continue;
      }

      // ── Signal Generation & Volatility ATR Protection ───────────────────────
      // Fetch M15 and H1 candles using exact OANDA ID
      const candleTarget = oandaId || displaySymbol;
      const m15Result = await adapter.getCandles(candleTarget, 'M15', 50);
      const h1Result = await adapter.getCandles(candleTarget, 'H1', 50);

      if (!m15Result.success) {
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: `Candles fetch failed (M15) for ${displaySymbol}: ${m15Result.error.message}`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: M15 candles fetch failed.`);
        continue;
      }

      if (!h1Result.success) {
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: `Candles fetch failed (H1) for ${displaySymbol}: ${h1Result.error.message}`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: H1 candles fetch failed.`);
        continue;
      }

      const m15Bars = m15Result.value;
      const h1Bars = h1Result.value;

      // Generate signal via @meridian/signals module
      const signal = generateSignal(displaySymbol, m15Bars, h1Bars);

      if (signal.direction === 'NEUTRAL') {
        const inputCitations = signal.inputs.map(i => `${i.metric}=${i.value}`).join(', ');
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: `Signal Engine: NEUTRAL for ${displaySymbol} (${signal.strategy}). Observations: [${inputCitations}]`,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: Signal NEUTRAL.`);
        continue;
      }

      const direction: 'BUY' | 'SELL' = signal.direction;
      const protectionPips = signal.suggestedStopPips > 0 ? signal.suggestedStopPips : config.riskProfile.slPips;
      const inputCitations = signal.inputs.map(i => `${i.metric}=${i.value} (${i.id})`).join(' | ');
      const signalReason = `Signal Engine (${signal.strategy}, Confidence: ${signal.confidence}%, Dir: ${direction}) | ATR Stop: ${protectionPips.toFixed(1)} pips | Inputs: [${inputCitations}]`;

      const dp = inst?.digits ?? getDecimalPlaces(displaySymbol);
      const pipVal = getPipValue(displaySymbol);
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

      const parts = displaySymbol.split('/');
      const quoteCurrency = parts.length === 2 ? parts[1] : 'USD';

      const entryParsed = parsePriceStringToBigInt(entryStr);
      const slParsed = parsePriceStringToBigInt(slStr);
      const tpParsed = parsePriceStringToBigInt(tpStr);

      const entryPrice = createPrice(entryParsed.amount, entryParsed.scale, quoteCurrency);
      const stopLossPrice = createPrice(slParsed.amount, slParsed.scale, quoteCurrency);
      const takeProfitPrice = rp.sendTpToOanda
        ? createPrice(tpParsed.amount, tpParsed.scale, quoteCurrency)
        : undefined;

      const accountRiskState = await buildAccountRiskState(adapter, accountId, {
        instrument: displaySymbol,
        quoteToAccountRates,
      });

      // ── Stop distance sanity check ─────────────────────────────────────────
      // A stop that is an implausibly large % of price indicates a unit conversion
      // error (e.g. ATR in price units treated as pips). Reject loudly rather than
      // silently size to zero.
      const stopDistancePrice = Math.abs(slOffset);
      const stopDistancePct = (stopDistancePrice / spotPrice) * 100;
      const maxStopPct = getMaxStopDistancePct(inst);
      if (stopDistancePct > maxStopPct) {
        const implausibleReason =
          `STOP_DISTANCE_IMPLAUSIBLE: stop distance $${stopDistancePrice.toFixed(dp)} ` +
          `(${stopDistancePct.toFixed(1)}% of entry $${entryStr}) exceeds ${maxStopPct}% ` +
          `maximum for ${inst?.assetClass ?? 'FX'}. ` +
          `ATR stop: ${protectionPips.toFixed(1)} pips × pipValue ${pipVal} = $${(protectionPips * pipVal).toFixed(dp)}.`;
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'REJECTED',
          reason: implausibleReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} REJECTED: ${implausibleReason}`);
        continue;
      }

      // Risk-Derived Position Sizing
      const sizeResult = calculatePositionSize(
        { instrument: displaySymbol, entryPrice, stopLossPrice },
        FTMO_STANDARD_PROFILE,
        accountRiskState,
        config.lotUnits
      );

      if (sizeResult.units <= 0n) {
        // Include full arithmetic so the cause is visible without reverse-engineering
        const equityNum = Number(accountRiskState.currentEquity) / 100;
        const riskBudgetNum = Number(sizeResult.maxRiskAllowedInAccountCurrency) / 100;
        const enrichedReason =
          `POSITION_SIZE_BELOW_MINIMUM: Computed 0 units for ${displaySymbol}. ` +
          `Equity: £${equityNum.toFixed(2)}, ` +
          `RiskBudget: £${riskBudgetNum.toFixed(2)}, ` +
          `StopPips: ${protectionPips.toFixed(1)}, ` +
          `PipValue: ${pipVal}, ` +
          `StopDistance: $${stopDistancePrice.toFixed(dp)}.`;
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: enrichedReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: ${enrichedReason}`);
        continue;
      }

      // IDEMPOTENCY KEY: deterministic within a 1-minute window.
      // Using cycleId (which is random per invocation) would re-submit the same
      // signal on every cron retry within the same minute window. Instead we
      // key on (accountId, displaySymbol, direction, minute-bucket) so that
      // any invocation within the same minute produces the same key.
      const minuteBucket = Math.floor(Date.now() / 60_000);
      const intentId = crypto.createHash('sha256')
        .update(`${accountId}:${displaySymbol}:${direction}:${minuteBucket}`)
        .digest('hex')
        .slice(0, 36);

      const intent: OrderIntent = {
        id: intentId,
        accountId,
        instrument: displaySymbol,
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
        instrument: displaySymbol,
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
          instrument: displaySymbol,
          action: 'REJECTED',
          reason: rejectReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} REJECTED: ${rejectReason}`);
        continue;
      }

      // ── OBSERVE: evaluate + log, no submission ────────────────────────────
      if (mode === 'OBSERVE') {
        const observeReason = `[OBSERVE] Signal evaluated, not submitted. ${signalReason}`;
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'OBSERVE_EVAL',
          reason: observeReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} OBSERVE_EVAL: ${observeReason}`);
        continue;
      }

      // ── PAPER: evaluate + log simulated fill, no submission ───────────────
      if (mode === 'PAPER') {
        const paperReason = `[PAPER] Simulated fill at ${entryStr}. ${signalReason}`;
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'PAPER_FILL',
          reason: paperReason,
          orderId: `PAPER-${intentId}`,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} PAPER_FILL: ${paperReason}`);
        continue;
      }

      // ── LIVE: submit to broker ─────────────────────────────────────────────
      if (!canSubmit) {
        const blockedReason = mode === 'LIVE'
          ? `[LIVE mode but TIER_4_ENABLED=false] Signal approved by RiskGate but server lock prevents submission. ${signalReason}`
          : `[Unexpected mode: ${mode}] Defaulting to non-submission.`;
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'SKIPPED',
          reason: blockedReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} SKIPPED: ${blockedReason}`);
        continue;
      }

      const submitResult = await adapter.submitOrder(intent, decision.token);

      if (!submitResult.success) {
        const errReason = `OANDA Submission Error: ${submitResult.error.message}`;
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
          action: 'ERROR',
          reason: errReason,
          orderId: null,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} ERROR: ${errReason}`);
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
        instrument: displaySymbol,
        action: 'EXECUTED',
        reason: fullReasoning,
        orderId: filledOrder.id,
      });

      executedLogs.push(`[${logTime}] ${displaySymbol} EXECUTED: fill ${fillPriceVal} orderId=${filledOrder.id}`);
    }

    // ── 9. Break-even sweep — LIVE + TIER_4_ENABLED only ─────────────────────
    if (canSubmit) {
      await checkBreakEven(
        adapter, accountId, config.riskProfile.breakEvenTriggerPips,
        apiKey, env, cycleId, executedLogs
      );
    } else if (config.riskProfile.breakEvenTriggerPips > 0) {
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
      if (!systemTradeIds.has(trade.id)) continue;

      const displaySymbol = getDisplaySymbol(trade.instrument);
      const oandaId = trade.instrument;
      const pipVal = getPipValue(displaySymbol);
      const dp = getDecimalPlaces(displaySymbol);
      const entryPrice = parseFloat(trade.price);
      const units = parseFloat(trade.currentUnits);
      const isBuy = units > 0;

      const priceResult = await adapter.getLivePrices([oandaId]);
      if (!priceResult.success) continue;
      const currentMid = parseFloat(Object.values(priceResult.value)[0] || '0');
      if (!currentMid || !entryPrice) continue;

      const floatingPips = isBuy
        ? (currentMid - entryPrice) / pipVal
        : (entryPrice - currentMid) / pipVal;

      if (floatingPips < triggerPips) continue;

      const currentSl = trade.stopLossOrder ? parseFloat(trade.stopLossOrder.price) : null;
      const alreadyAtBE = currentSl !== null && (
        isBuy ? currentSl >= entryPrice : currentSl <= entryPrice
      );
      if (alreadyAtBE) continue;

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
          instrument: displaySymbol,
          action: 'BREAK_EVEN_TRIGGERED',
          reason: `SL moved to entry ${bePriceStr} (floating ${floatingPips.toFixed(1)} pips >= trigger ${triggerPips} pips). TradeId: ${trade.id}`,
          orderId: trade.id,
        });
        executedLogs.push(`[${logTime}] ${displaySymbol} BREAK_EVEN_TRIGGERED: SL → ${bePriceStr} (tradeId=${trade.id})`);
      } else {
        const errText = await beRes.text();
        await insertCycleLog({
          cycleId,
          instrument: displaySymbol,
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
