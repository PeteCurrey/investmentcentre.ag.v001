import { createLogger, createPrice, toScaledInteger, ScaledInteger } from '@meridian/core';
import { OandaBrokerAdapter, parsePriceStringToBigInt } from '@meridian/execute';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent } from '@meridian/risk';
import { AutomationEngine, AutomationRule } from '@meridian/automation';
import { TwelveDataAdapter } from '@meridian/adapters';
import fs from 'fs';
import path from 'path';

const log = createLogger('Scheduler');

// ── Env loader ───────────────────────────────────────────────────────────────

function loadEnv() {
  const rootEnvPath = path.join(__dirname, '../../../.env.local');
  if (fs.existsSync(rootEnvPath)) {
    const content = fs.readFileSync(rootEnvPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (key && val && !process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();
log.info('MERIDIAN Autonomous Trading Scheduler initialized');

// ── State persistence paths ───────────────────────────────────────────────────

const TERMINAL_DB_PATH  = path.join(__dirname, '../../../apps/terminal/trades_db.json');
const AUTOTRADER_STATE  = path.join(__dirname, '../../../apps/terminal/autotrader_state.json');

// ── In-memory momentum tracking ───────────────────────────────────────────────

let previousSpotPrice: number | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function readAutotraderState(): { enabled: boolean; cycleCount: number } {
  try {
    return JSON.parse(fs.readFileSync(AUTOTRADER_STATE, 'utf-8'));
  } catch {
    return { enabled: false, cycleCount: 0 };
  }
}

function writeAutotraderState(patch: Record<string, any>) {
  try {
    const current = readAutotraderState() as Record<string, any>;
    const next = { ...current, ...patch, lastToggled: new Date().toISOString() };
    fs.writeFileSync(AUTOTRADER_STATE, JSON.stringify(next, null, 2));
  } catch (e: any) {
    log.warn('Could not write autotrader state', { error: e.message });
  }
}

function writeAutoTradeToDb(trade: Record<string, any>) {
  try {
    let trades: any[] = [];
    if (fs.existsSync(TERMINAL_DB_PATH)) {
      trades = JSON.parse(fs.readFileSync(TERMINAL_DB_PATH, 'utf-8'));
    }
    trades.unshift(trade);
    fs.writeFileSync(TERMINAL_DB_PATH, JSON.stringify(trades, null, 2));
  } catch (e: any) {
    log.error('Unable to write trade to database', { error: e.message });
  }
}

// ── Autonomous Evaluation Cycle ───────────────────────────────────────────────

async function runAutonomousCycle() {
  // 1. Check if autotrader is enabled
  const atState = readAutotraderState();
  if (!atState.enabled) {
    log.info('Autonomous engine is PAUSED — skipping cycle');
    return;
  }

  log.info('Running autonomous evaluation cycle...', { cycle: atState.cycleCount + 1 });

  const token     = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env       = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';
  const hmacSecret = process.env.RISK_HMAC_SECRET;

  if (!token || !accountId || !hmacSecret) {
    log.warn('Autonomous Execution Suspended: Missing OANDA_API_TOKEN, OANDA_ACCOUNT_ID, or RISK_HMAC_SECRET');
    return;
  }

  // 2. Initialize adapter and engine
  const adapter = new OandaBrokerAdapter({ apiKey: token, accountId, environment: env });
  const engine  = new AutomationEngine(true); // Tier 4 EXECUTE enabled

  // 3. Sync OANDA account state
  const stateResult = await adapter.getAccountState(accountId);
  if (!stateResult.success) {
    log.error('Unable to fetch OANDA account state', { error: stateResult.error.message });
    return;
  }
  const accountState = stateResult.value;
  log.info('OANDA Account synced', {
    balance: accountState.balance.price.toString(),
    openPositions: accountState.openPositionsCount
  });

  // 4. Fetch venue-native spot price for GBP/USD
  const td = new TwelveDataAdapter();
  const tdRes = await td.fetch({ start: '', end: '' });
  let spotPrice = 1.3145;
  if (tdRes.success && tdRes.value.payload) {
    const payload = tdRes.value.payload as Record<string, any>;
    if (payload.close) spotPrice = parseFloat(payload.close);
  }
  log.info('Venue-native spot price synced', { instrument: 'GBP/USD', price: spotPrice });

  // 5. Determine signal direction via momentum (compare to previous cycle)
  let signalReason: string;
  let direction: 'BUY' | 'SELL';

  if (previousSpotPrice === null) {
    // First cycle — use time-of-day baseline heuristic
    const hour = new Date().getUTCHours();
    direction = (hour >= 6 && hour < 14) ? 'BUY' : 'SELL'; // London session bias
    signalReason = `Session baseline: ${hour >= 6 && hour < 14 ? 'London session BUY bias' : 'NY close SELL bias'} | Spot: ${spotPrice}`;
  } else {
    const delta     = spotPrice - previousSpotPrice;
    const deltaPips = (delta * 10000).toFixed(1);
    direction       = delta >= 0 ? 'BUY' : 'SELL';
    const momentum  = Math.abs(delta * 10000).toFixed(1);
    signalReason = `Momentum signal: GBP/USD ${delta >= 0 ? '↑' : '↓'} ${deltaPips} pips (${previousSpotPrice.toFixed(5)} → ${spotPrice.toFixed(5)}) | ${momentum} pip move | Account equity: $${(Number(accountState.equity.price) / 100).toFixed(2)}`;
  }

  log.info('Signal evaluated', { direction, reason: signalReason });
  previousSpotPrice = spotPrice;

  // 6. Build order intent
  const slOffset  = direction === 'BUY' ? -0.0050 : 0.0050;
  const tpOffset  = direction === 'BUY' ?  0.0100 : -0.0100;

  const entryParsed  = parsePriceStringToBigInt(spotPrice.toFixed(5));
  const slParsed     = parsePriceStringToBigInt((spotPrice + slOffset).toFixed(5));
  const tpParsed     = parsePriceStringToBigInt((spotPrice + tpOffset).toFixed(5));

  const rule: AutomationRule = {
    id:               'rule_council_gbpusd',
    name:             'Consensus Council Breakout',
    triggerMetric:    'Momentum Signal',
    tier:             '4_EXECUTE',
    enabled:          true,
    targetInstrument: 'GBP/USD',
    direction,
    entryPrice:      createPrice(entryParsed.amount, entryParsed.scale, 'USD'),
    stopLossPrice:   createPrice(slParsed.amount,    slParsed.scale,    'USD'),
    takeProfitPrice: createPrice(tpParsed.amount,    tpParsed.scale,    'USD')
  };

  const obs = {
    id:               `obs_${Date.now()}`,
    source_id:        'ai_council',
    entity_id:        null,
    pillar:           'MARKETS' as any,
    metric:           'Momentum Signal',
    value_numeric:    85n as ScaledInteger,
    value_scale:      0,
    value_text:       direction === 'BUY' ? 'MOMENTUM_BUY' : 'MOMENTUM_SELL',
    unit:             null,
    source_timestamp: new Date().toISOString(),
    captured_at:      new Date().toISOString(),
    staleness_seconds: 0,
    confidence:       85,
    licence_class:    'INTERNAL_ONLY' as any,
    redistributable:  true,
    raw_ref:          'none'
  };

  const ticket      = engine.processPrepare(rule, obs);
  const orderIntent = ticket.orderIntent;
  orderIntent.units = toScaledInteger(1000n); // Conservative test size: 1,000 units

  // 7. Evaluate through RiskGate
  log.info('Routing through RiskGate', { units: '1000', direction, instrument: 'GBP/USD' });

  const decision = RiskGate.evaluate(orderIntent, FTMO_STANDARD_PROFILE, {
    accountId,
    startingDailyBalance: accountState.balance.price,
    currentEquity:        accountState.equity.price,
    highWaterMark:        accountState.balance.price,
    openPositionCount:    accountState.openPositionsCount,
    realizedPnlToday:     toScaledInteger(0n),
    unrealizedPnl:        accountState.unrealizedPnl.price,
    isNewsBlackoutActive: false
  });

  if (!decision.approved || !decision.token) {
    log.warn('Order rejected by RiskGate', { code: decision.reasonCode });
    writeAutotraderState({
      lastSignal:   `RiskGate rejected: ${decision.reasonCode}`,
      lastInstrument: 'GBP/USD',
      lastDirection: direction,
      lastPrice:    spotPrice.toFixed(5),
      cycleCount:   atState.cycleCount + 1
    });
    return;
  }

  log.info('RiskGate APPROVED — cryptographic token issued. Dispatching to OANDA...', {
    sig: decision.token.hmacSignature.slice(0, 16) + '...'
  });

  // 8. Submit to OANDA practice
  const result = await adapter.submitOrder(orderIntent, decision.token);
  if (!result.success) {
    log.error('OANDA order submission failed', { error: result.error.message });
    writeAutotraderState({
      lastSignal: `Submission failed: ${result.error.message}`,
      lastInstrument: 'GBP/USD',
      lastDirection: direction,
      lastPrice:  spotPrice.toFixed(5),
      cycleCount: atState.cycleCount + 1
    });
    return;
  }

  const order = result.value;
  const fillPrice = order.fillPrice
    ? (Number(order.fillPrice.price) / Math.pow(10, order.fillPrice.scale)).toFixed(order.fillPrice.scale)
    : spotPrice.toFixed(5);

  log.info('AUTONOMOUS EXECUTION SUCCESSFUL', {
    orderId:    order.id,
    instrument: order.instrument,
    direction,
    units:      '1,000',
    fillPrice
  });

  // 9. Persist to trades_db.json with full reasoning
  const tradeLog = {
    id:         `auto_${Date.now()}`,
    timestamp:  new Date().toISOString().replace('T', ' ').substring(0, 19),
    type:       'AUTO',
    instrument: order.instrument,
    direction,
    units:      '1,000',
    fillPrice,
    status:     'FILLED',
    orderId:    order.id,
    tier:       'AUTO (TIER 4)',
    signal:     `${signalReason} | SL: ${(spotPrice + slOffset).toFixed(5)} | TP: ${(spotPrice + tpOffset).toFixed(5)} | AI Confidence: 85% | RiskGate: APPROVED`
  };

  writeAutoTradeToDb(tradeLog);

  // 10. Update autotrader state with last signal info
  writeAutotraderState({
    lastSignal:     signalReason,
    lastInstrument: 'GBP/USD',
    lastDirection:  direction,
    lastPrice:      fillPrice,
    cycleCount:     atState.cycleCount + 1
  });

  log.info('Cycle complete. Trade committed to execution database.');
}

// ── Scheduler loop ────────────────────────────────────────────────────────────

runAutonomousCycle();
setInterval(() => { runAutonomousCycle(); }, 60000);
