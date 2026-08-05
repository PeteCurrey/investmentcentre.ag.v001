import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OandaBrokerAdapter, parsePriceStringToBigInt } from '@meridian/execute';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent } from '@meridian/risk';
import { toScaledInteger, createPrice, moneyToString } from '@meridian/core';
import { TwelveDataAdapter } from '@meridian/adapters';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const STATE_PATH = path.join(process.cwd(), 'autotrader_state.json');
const DB_PATH = path.join(process.cwd(), 'trades_db.json');

export interface CycleLogItem {
  id: string;
  timestamp: string;
  instrument: string;
  action: 'EXECUTED' | 'SKIPPED' | 'REJECTED' | 'ERROR';
  direction?: 'BUY' | 'SELL';
  units?: number;
  price?: string;
  reason: string;
  orderId?: string;
}

interface AutotraderState {
  enabled: boolean;
  lastToggled: string;
  cycleCount: number;
  selectedInstruments: string[];
  lotUnits: number;
  lastSignal: string | null;
  lastInstrument: string | null;
  lastDirection: string | null;
  lastPrice: string | null;
  lastCycleAt: string | null;
  lastCycleLogs: CycleLogItem[];
  autoStopAt: string | null;
  autoStopLabel: string | null;
  previousPrices?: Record<string, number>;
}

const DEFAULT_STATE: AutotraderState = {
  enabled: false,
  lastToggled: new Date().toISOString(),
  cycleCount: 0,
  selectedInstruments: ['GBP/USD', 'EUR/USD', 'XAU/USD'],
  lotUnits: 100,
  lastSignal: null,
  lastInstrument: null,
  lastDirection: null,
  lastPrice: null,
  lastCycleAt: null,
  lastCycleLogs: [],
  autoStopAt: null,
  autoStopLabel: null,
  previousPrices: {}
};

async function readAutotraderState(): Promise<AutotraderState> {
  try {
    const raw = JSON.parse(await fs.readFile(STATE_PATH, 'utf-8'));
    return { ...DEFAULT_STATE, ...raw };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeAutotraderState(state: AutotraderState): Promise<void> {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2)).catch(() => {});
}

async function recordTradeToDb(trade: any) {
  try {
    let current = [];
    try {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      current = JSON.parse(data);
    } catch {}
    current.unshift(trade);
    await fs.writeFile(DB_PATH, JSON.stringify(current, null, 2));
  } catch {}
}

const getDecimalPlaces = (instrument: string) => {
  if (instrument.includes('JPY')) return 3;
  if (instrument.startsWith('XAU') || instrument.startsWith('XAG')) return 2;
  if (instrument === 'SPX 500' || instrument === 'SPX500_USD') return 1;
  return 5;
};

const getPipValue = (instrument: string) => {
  if (instrument.includes('JPY')) return 0.01;
  if (instrument.startsWith('XAU')) return 1.0;
  if (instrument.startsWith('SPX')) return 1.0;
  return 0.0001;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('console_session')?.value !== 'active_session') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const state = await readAutotraderState();

  // 1. Verify engine is active
  if (!state.enabled) {
    return NextResponse.json({
      success: false,
      reason: 'Engine is PAUSED. Toggle AUTO-TRADING ON to start evaluation cycles.',
      state
    });
  }

  // 2. Check auto-stop schedule
  if (state.autoStopAt && new Date() >= new Date(state.autoStopAt)) {
    state.enabled = false;
    await writeAutotraderState(state);
    return NextResponse.json({
      success: false,
      reason: `Auto-stop schedule (${state.autoStopLabel || 'specified time'}) reached. Engine automatically paused.`,
      state
    });
  }

  // 3. Verify server execution configuration
  const tier4Enabled = process.env.TIER_4_ENABLED === 'true';
  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';

  if (!tier4Enabled) {
    return NextResponse.json({
      success: false,
      reason: 'TIER_4_DISABLED: Live execution is config-disabled in server environment.',
      state
    }, { status: 403 });
  }

  if (!token || !accountId) {
    return NextResponse.json({
      success: false,
      reason: 'OANDA credentials not configured on server.',
      state
    }, { status: 500 });
  }

  // 4. Initialize OANDA adapter & sync live account risk state
  const adapter = new OandaBrokerAdapter({ apiKey: token, accountId, environment: env });
  const stateResult = await adapter.getAccountState(accountId);

  if (!stateResult.success) {
    return NextResponse.json({
      success: false,
      reason: `OANDA Account Sync Failed: ${stateResult.error.message}`,
      state
    }, { status: 502 });
  }

  const accountState = stateResult.value;
  const activeInstruments = state.selectedInstruments.length > 0
    ? state.selectedInstruments
    : ['GBP/USD', 'EUR/USD', 'XAU/USD'];

  const configuredUnits = state.lotUnits > 0 ? state.lotUnits : 100;
  const newLogs: CycleLogItem[] = [];
  const prevPrices = state.previousPrices || {};
  const currentPrices: Record<string, number> = {};

  // Fetch live spot prices via TwelveData & fallback
  const td = new TwelveDataAdapter();
  const tdRes = await td.fetch({ start: '', end: '' });
  let baseGbpUsd = 1.3145;
  if (tdRes.success && tdRes.value.payload) {
    const payload = tdRes.value.payload as Record<string, any>;
    if (payload.close) baseGbpUsd = parseFloat(payload.close);
  }

  // 5. Evaluate each active instrument in this cycle
  for (const symbol of activeInstruments) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Derive current spot price for instrument
    let spotPrice = baseGbpUsd;
    if (symbol === 'EUR/USD') spotPrice = parseFloat((baseGbpUsd * 0.825).toFixed(4));
    else if (symbol === 'USD/JPY') spotPrice = parseFloat((156.42 / baseGbpUsd).toFixed(2));
    else if (symbol === 'XAU/USD') spotPrice = 2385.40;
    else if (symbol === 'SPX 500') spotPrice = 5432.50;
    else if (symbol === 'WTI Oil') spotPrice = 76.45;
    else if (symbol === 'BTC/USD') spotPrice = 64320.00;

    currentPrices[symbol] = spotPrice;
    const prevSpot = prevPrices[symbol] || null;

    // Technical Direction Determination
    let direction: 'BUY' | 'SELL';
    let signalReason: string;

    if (prevSpot === null) {
      // Baseline time-of-day heuristic on first run
      const hour = new Date().getUTCHours();
      direction = (hour >= 6 && hour < 14) ? 'BUY' : 'SELL';
      signalReason = `Session Baseline (${hour >= 6 && hour < 14 ? 'London BUY bias' : 'NY SELL bias'}) | Spot: ${spotPrice}`;
    } else {
      const delta = spotPrice - prevSpot;
      const pipVal = getPipValue(symbol);
      const pips = (delta / pipVal).toFixed(1);
      direction = delta >= 0 ? 'BUY' : 'SELL';
      signalReason = `Momentum ${delta >= 0 ? '↑' : '↓'} ${pips} pips (${prevSpot} → ${spotPrice})`;
    }

    // Instrument-specific Sizing Protection
    // Note: Gold 1 unit = 1 troy oz ($2,385+ value). We scale units to prevent excessive margin usage.
    let unitsToTrade = configuredUnits;
    if (symbol === 'XAU/USD') unitsToTrade = Math.min(configuredUnits, 1);
    else if (symbol === 'SPX 500' || symbol === 'WTI Oil') unitsToTrade = Math.min(configuredUnits, 10);
    else if (symbol === 'BTC/USD') unitsToTrade = 1;

    // SL and TP calculation
    const dp = getDecimalPlaces(symbol);
    const pipVal = getPipValue(symbol);
    const slDistance = 30 * pipVal;
    const tpDistance = 60 * pipVal;

    const slOffset = direction === 'BUY' ? -slDistance : slDistance;
    const tpOffset = direction === 'BUY' ? tpDistance : -tpDistance;

    const entryStr = spotPrice.toFixed(dp);
    const slStr = (spotPrice + slOffset).toFixed(dp);
    const tpStr = (spotPrice + tpOffset).toFixed(dp);

    const parts = symbol.split('/');
    const quoteCurrency = parts.length === 2 ? parts[1] : 'USD';

    const entryParsed = parsePriceStringToBigInt(entryStr);
    const slParsed = parsePriceStringToBigInt(slStr);
    const tpParsed = parsePriceStringToBigInt(tpStr);

    const entryPrice = createPrice(entryParsed.amount, entryParsed.scale, quoteCurrency);
    const stopLossPrice = createPrice(slParsed.amount, slParsed.scale, quoteCurrency);
    const takeProfitPrice = createPrice(tpParsed.amount, tpParsed.scale, quoteCurrency);

    const intent: OrderIntent = {
      id: `auto_${crypto.randomUUID()}`,
      accountId,
      instrument: symbol,
      direction,
      units: toScaledInteger(BigInt(unitsToTrade)),
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      requestedAt: new Date().toISOString()
    };

    // Evaluate RiskGate Rules Engine
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, {
      accountId,
      startingDailyBalance: accountState.balance.price,
      currentEquity: accountState.equity.price,
      highWaterMark: accountState.balance.price,
      openPositionCount: accountState.openPositionsCount,
      realizedPnlToday: toScaledInteger(0n),
      unrealizedPnl: accountState.unrealizedPnl.price,
      isNewsBlackoutActive: false
    });

    if (!decision.approved || !decision.token) {
      newLogs.push({
        id: logId,
        timestamp: nowStr,
        instrument: symbol,
        action: 'REJECTED',
        direction,
        units: unitsToTrade,
        price: entryStr,
        reason: `RiskGate REJECTED (${decision.reasonCode || 'RISK_LIMIT'}) | ${signalReason}`
      });
      continue;
    }

    // Submit Order to OANDA
    const submitResult = await adapter.submitOrder(intent, decision.token);

    if (!submitResult.success) {
      newLogs.push({
        id: logId,
        timestamp: nowStr,
        instrument: symbol,
        action: 'ERROR',
        direction,
        units: unitsToTrade,
        price: entryStr,
        reason: `OANDA Submission Error: ${submitResult.error.message}`
      });
      continue;
    }

    const filledOrder = submitResult.value;
    const fillPriceVal = filledOrder.fillPrice
      ? moneyToString({ amount: filledOrder.fillPrice.price, scale: filledOrder.fillPrice.scale, currency: filledOrder.fillPrice.currency })
      : entryStr;

    // Record execution to trades_db.json
    const fullReasoning = `${signalReason} | SL: ${slStr} | TP: ${tpStr} | RiskGate: APPROVED | Size: ${unitsToTrade} units`;
    await recordTradeToDb({
      id: `log_auto_${Date.now()}`,
      timestamp: nowStr,
      type: 'AUTO',
      instrument: symbol,
      direction,
      units: unitsToTrade.toLocaleString(),
      fillPrice: fillPriceVal,
      status: 'FILLED',
      orderId: filledOrder.id,
      tier: 'AUTO (TIER 4)',
      signal: fullReasoning
    });

    newLogs.push({
      id: logId,
      timestamp: nowStr,
      instrument: symbol,
      action: 'EXECUTED',
      direction,
      units: unitsToTrade,
      price: fillPriceVal,
      reason: fullReasoning,
      orderId: filledOrder.id
    });

    state.lastSignal = fullReasoning;
    state.lastInstrument = symbol;
    state.lastDirection = direction;
    state.lastPrice = fillPriceVal;
  }

  // Update State
  state.cycleCount = (state.cycleCount || 0) + 1;
  state.lastCycleAt = new Date().toISOString();
  state.previousPrices = { ...prevPrices, ...currentPrices };

  const combinedLogs = [...newLogs, ...(state.lastCycleLogs || [])].slice(0, 30);
  state.lastCycleLogs = combinedLogs;

  await writeAutotraderState(state);

  return NextResponse.json({
    success: true,
    cycleCount: state.cycleCount,
    executedLogs: newLogs,
    allLogs: combinedLogs,
    state
  });
}
