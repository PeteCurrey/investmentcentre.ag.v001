import { NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/auth';
import { OandaBrokerAdapter, parsePriceStringToBigInt } from '@meridian/execute';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent } from '@meridian/risk';
import { toScaledInteger, createPrice, moneyToString } from '@meridian/core';
import {
  readAutotraderConfig,
  writeAutotraderConfig,
  insertGateDecision,
  insertCycleLog,
  upsertAccountDay,
  getMode,
} from '@meridian/core';
import { TwelveDataAdapter } from '@meridian/adapters';
import crypto from 'crypto';

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

// ─── POST /api/autotrader/run-cycle ──────────────────────────────────────────

export async function POST() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const cycleId = crypto.randomUUID();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // ── 1. Read config from Supabase — no silent fallback ────────────────────
  const config = await readAutotraderConfig();

  if (!config) {
    // State cannot be read: log the failure but submit nothing.
    await insertCycleLog({
      cycleId,
      instrument: null,
      action: 'ERROR',
      reason: 'CONFIG_READ_FAILURE: Cannot read autotrader_state from database. No orders evaluated.',
      orderId: null,
    });
    return NextResponse.json(
      {
        success: false,
        reason: 'CONFIG_READ_FAILURE: Cannot read autotrader_state from database.',
        cycleId,
      },
      { status: 503 }
    );
  }

  // ── 2. Read mode (fail-closed) ────────────────────────────────────────────
  const mode = await getMode();

  // ── 3. Check auto-stop schedule ───────────────────────────────────────────
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
    return NextResponse.json({
      success: false,
      reason: 'Auto-stop schedule reached. Engine returning to OBSERVE.',
      mode: 'OBSERVE',
      cycleId,
    });
  }

  // ── 4. Resolve OANDA credentials ──────────────────────────────────────────
  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';

  // TIER_4_ENABLED: server-side env var only. NEXT_PUBLIC_ variant must never
  // gate execution — a client-visible variable cannot authorise broker submission.
  const tier4Enabled = process.env.TIER_4_ENABLED === 'true';

  // For LIVE mode to submit, both the mode AND tier4Enabled must be true.
  const canSubmit = mode === 'LIVE' && tier4Enabled;

  if (!token || !accountId) {
    await insertCycleLog({
      cycleId,
      instrument: null,
      action: 'ERROR',
      reason: 'OANDA credentials (OANDA_API_TOKEN / OANDA_ACCOUNT_ID) missing on server.',
      orderId: null,
    });
    return NextResponse.json({
      success: false,
      reason: 'OANDA credentials missing on server.',
      mode,
      cycleId,
    });
  }

  // ── 5. Sync live account state from OANDA ────────────────────────────────
  const adapter = new OandaBrokerAdapter({ apiKey: token, accountId, environment: env });
  const stateResult = await adapter.getAccountState(accountId);

  if (!stateResult.success) {
    await insertCycleLog({
      cycleId,
      instrument: null,
      action: 'ERROR',
      reason: `OANDA Account Sync Failed: ${stateResult.error.message}`,
      orderId: null,
    });
    return NextResponse.json({
      success: false,
      reason: `OANDA Account Sync Failed: ${stateResult.error.message}`,
      mode,
      cycleId,
    });
  }

  const accountState = stateResult.value;

  // ── 6. Seed account_day for today if not already set ─────────────────────
  const todayDate = new Date().toISOString().substring(0, 10);
  void upsertAccountDay({
    dayDate: todayDate,
    openingBalance: accountState.balance.price,
    openingBalanceCapturedAt: new Date().toISOString(),
    highWaterMark: accountState.equity.price,
    highWaterMarkUpdatedAt: new Date().toISOString(),
  });

  // ── 7. Evaluate each active instrument ───────────────────────────────────
  const activeInstruments =
    config.selectedInstruments.length > 0
      ? config.selectedInstruments
      : ['GBP/USD', 'EUR/USD', 'XAU/USD'];

  const configuredUnits = config.lotUnits > 0 ? config.lotUnits : 100;

  // Fetch live spot prices via TwelveData
  const td = new TwelveDataAdapter();
  const tdRes = await td.fetch({ start: '', end: '' });
  let baseGbpUsd = 1.3145;
  if (tdRes.success && tdRes.value.payload) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- external adapter payload
    const payload = tdRes.value.payload as Record<string, any>;
    if (payload.close) baseGbpUsd = parseFloat(payload.close);
  }

  const executedLogs: string[] = [];

  for (const symbol of activeInstruments) {
    const logTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Spot price logic — unchanged from original (signal logic must not change in this phase)
    let spotPrice = baseGbpUsd;
    if (symbol === 'EUR/USD') spotPrice = parseFloat((baseGbpUsd * 0.825).toFixed(4));
    else if (symbol === 'USD/JPY') spotPrice = parseFloat((156.42 / baseGbpUsd).toFixed(2));
    else if (symbol === 'XAU/USD') spotPrice = 2385.40;
    else if (symbol === 'SPX 500') spotPrice = 5432.50;
    else if (symbol === 'WTI Oil') spotPrice = 76.45;
    else if (symbol === 'BTC/USD') spotPrice = 64320.00;

    const hour = new Date().getUTCHours();
    const direction: 'BUY' | 'SELL' = (hour >= 6 && hour < 14) ? 'BUY' : 'SELL';
    const signalReason = `Session Bias (${hour >= 6 && hour < 14 ? 'London BUY' : 'NY SELL'}) | Spot: ${spotPrice}`;

    let unitsToTrade = configuredUnits;
    if (symbol === 'XAU/USD') unitsToTrade = Math.min(configuredUnits, 1);
    else if (symbol === 'SPX 500' || symbol === 'WTI Oil') unitsToTrade = Math.min(configuredUnits, 10);
    else if (symbol === 'BTC/USD') unitsToTrade = 1;

    const rp = {
      slPips: config.riskProfile.slPips,
      tpPips: config.riskProfile.tpPips,
      useTrailingStop: config.riskProfile.useTrailingStop,
      trailingDistancePips: config.riskProfile.trailingDistancePips,
      breakEvenTriggerPips: config.riskProfile.breakEvenTriggerPips,
      sendTpToOanda: config.riskProfile.sendTpToOanda,
    };

    const dp = getDecimalPlaces(symbol);
    const pipVal = getPipValue(symbol);
    const slOffset = direction === 'BUY' ? -(rp.slPips * pipVal) : (rp.slPips * pipVal);
    const tpOffset = direction === 'BUY' ? (rp.tpPips * pipVal) : -(rp.tpPips * pipVal);
    const trailingDistance = rp.trailingDistancePips * pipVal;

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

    const intentId = `auto_${crypto.randomUUID()}`;
    const intent: OrderIntent = {
      id: intentId,
      accountId,
      instrument: symbol,
      direction,
      units: toScaledInteger(BigInt(unitsToTrade)),
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      ...(rp.useTrailingStop ? { trailingStopDistance: trailingStr } : {}),
      requestedAt: new Date().toISOString(),
    };

    const accountRiskState = {
      accountId,
      startingDailyBalance: accountState.balance.price,
      currentEquity: accountState.equity.price,
      highWaterMark: accountState.balance.price,
      openPositionCount: accountState.openPositionsCount,
      realizedPnlToday: toScaledInteger(0n),
      unrealizedPnl: accountState.unrealizedPnl.price,
      isNewsBlackoutActive: false,
    };

    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, accountRiskState);

    // ── Persist gate decision (every evaluation, every mode) ────────────────
    await insertGateDecision({
      orderIntentId: intentId,
      instrument: symbol,
      direction,
      units: BigInt(unitsToTrade),
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
        startingDailyBalance: String(accountState.balance.price),
        currentEquity: String(accountState.equity.price),
        openPositionCount: accountState.openPositionsCount,
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

    // ── OBSERVE: evaluate + log, no submission ───────────────────────────────
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

    // ── PAPER: evaluate + log simulated fill, no submission ──────────────────
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

    // ── LIVE: submit to broker ────────────────────────────────────────────────
    // Both mode === 'LIVE' AND tier4Enabled must be true (canSubmit).
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
    const fullReasoning = `[AUTOMATED TIER 4 SIGNAL] ${signalReason} | RiskGate: APPROVED (FTMO Standard Profile) | Risk Protection: ${protectionDesc} | Size: ${unitsToTrade} units`;

    await insertCycleLog({
      cycleId,
      instrument: symbol,
      action: 'EXECUTED',
      reason: fullReasoning,
      orderId: filledOrder.id,
    });

    executedLogs.push(`[${logTime}] ${symbol} EXECUTED: fill ${fillPriceVal} orderId=${filledOrder.id}`);
  }

  // ── 8. Update last-cycle metadata on the config row ───────────────────────
  await writeAutotraderConfig({ updatedBy: 'system:cycle' });

  return NextResponse.json({
    success: true,
    mode,
    cycleId,
    executedLogs,
  });
}
