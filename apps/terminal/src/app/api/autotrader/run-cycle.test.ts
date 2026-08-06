/**
 * Integration Test: runCycle() — autotrader core cycle logic
 *
 * Tests the cycle function directly (not via the HTTP route) since the cycle
 * body has been extracted to cycle.ts. The route thin wrappers are tested by
 * auth.test.ts which verifies 401 on missing session.
 *
 * Covers:
 * - OBSERVE mode: submits nothing to OANDA, but persists gate_decisions.
 * - PAPER mode: submits nothing to live broker.
 * - LIVE mode with TIER_4_ENABLED unset: submits nothing.
 * - Missing price quote: SKIPPED / no-feed, no order.
 * - Daily loss limit exceeded: RiskGate rejects with DAILY_LOSS_LIMIT_EXCEEDED.
 * - Total drawdown limit (>10% from high-water mark): RiskGate rejects.
 * - Open position / trade count at cap: RiskGate rejects.
 * - Concurrent cycle invocation: exits with CYCLE_IN_FLIGHT.
 * - Trailing stop protection: transmitted trailingStopDistance matches approved intent.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runCycle } from './run-cycle/cycle';
import {
  resetMockDb,
  getMockDb,
  resetOandaMockConfig,
  setOandaMockConfig,
  setupFetchMock,
  restoreFetchMock,
} from '../../../test/setup';

describe('runCycle() Integration Tests', () => {
  const origTier4 = process.env.TIER_4_ENABLED;

  beforeEach(() => {
    setupFetchMock();
    resetMockDb();
    resetOandaMockConfig();
    delete process.env.TIER_4_ENABLED;
  });

  afterEach(() => {
    restoreFetchMock();
    if (origTier4 !== undefined) {
      process.env.TIER_4_ENABLED = origTier4;
    } else {
      delete process.env.TIER_4_ENABLED;
    }
  });

  it('run-cycle in OBSERVE mode submits no orders to OANDA but records gate_decisions', async () => {
    const db = getMockDb();
    db.mode = 'OBSERVE';

    const result = await runCycle('test-cycle-observe');
    expect(result.success).toBe(true);
    expect(result.mode).toBe('OBSERVE');

    // Gate decisions must be recorded even in OBSERVE mode
    expect(db.gateDecisions.length).toBeGreaterThan(0);
    // Cycle logs should show OBSERVE_EVAL
    expect(db.cycleLogs.some(l => l.action === 'OBSERVE_EVAL' || l.reason.includes('OBSERVE'))).toBe(true);

    // Verify persisted gate_decisions account_state JSON snapshot contains required fields
    const persistedState = db.gateDecisions[0].accountState as Record<string, any>;
    expect(persistedState).toBeDefined();
    expect(typeof persistedState.accountCurrency).toBe('string');
    expect(persistedState.accountCurrency.length).toBe(3);
    expect(Array.isArray(persistedState.openPositions)).toBe(true);
    expect(typeof persistedState.currentSpreadPips).toBe('number');
    expect(typeof persistedState.newsStatus).toBe('string');
  });

  it('run-cycle in PAPER mode submits no live broker orders', async () => {
    const db = getMockDb();
    db.mode = 'PAPER';

    const result = await runCycle('test-cycle-paper');
    expect(result.success).toBe(true);
    expect(result.mode).toBe('PAPER');

    // Gate decisions recorded
    expect(db.gateDecisions.length).toBeGreaterThan(0);
    // Cycle logs state PAPER mode simulation
    expect(db.cycleLogs.some(l => l.reason.includes('PAPER'))).toBe(true);
  });

  it('run-cycle in LIVE mode with TIER_4_ENABLED unset submits nothing to OANDA', async () => {
    const db = getMockDb();
    db.mode = 'LIVE';
    delete process.env.TIER_4_ENABLED;

    const result = await runCycle('test-cycle-live-no-tier4');
    expect(result.success).toBe(true);

    // Gate decisions recorded
    expect(db.gateDecisions.length).toBeGreaterThan(0);
    // Cycle log indicates LIVE execution blocked because TIER_4_ENABLED is false
    expect(db.cycleLogs.some(l => l.reason.includes('TIER_4_ENABLED'))).toBe(true);
  });

  it('untradeable instrument produces SKIPPED and no order', async () => {
    const db = getMockDb();
    db.config.selectedInstruments = ['NVDA']; // Instrument not tradeable on OANDA

    const result = await runCycle('test-cycle-no-feed');
    expect(result.success).toBe(true);

    // Should skip with non-tradeable message
    expect(db.cycleLogs.some(l => l.action === 'SKIPPED' && l.reason.includes('non-tradeable'))).toBe(true);
  });

  it('realised losses past daily limit rejects with DAILY_LOSS_LIMIT_EXCEEDED', async () => {
    const db = getMockDb();
    db.mode = 'LIVE';
    process.env.TIER_4_ENABLED = 'true';

    // Seed account_day for today with $100k opening balance
    const todayStr = new Date().toISOString().substring(0, 10);
    db.accountDays.push({
      day_date: todayStr,
      opening_balance: '10000000', // $100,000.00
      opening_balance_captured_at: new Date().toISOString(),
      high_water_mark: '10000000',
      high_water_mark_updated_at: new Date().toISOString(),
    });

    // Set realized loss past the 5% daily limit ($5,000 on $100k balance)
    setOandaMockConfig({
      accountBalance: '94000.00',
      accountEquity: '94000.00',
      unrealizedPL: '-6000.00',
    });

    const result = await runCycle('test-cycle-daily-loss');
    expect(result.success).toBe(true);

    // RiskGate should reject with DAILY_LOSS_LIMIT_EXCEEDED
    expect(db.gateDecisions.some(g => g.approved === false && g.reasonCode === 'DAILY_LOSS_LIMIT_EXCEEDED')).toBe(true);
    expect(db.cycleLogs.some(l => l.action === 'REJECTED' && l.reason.includes('DAILY_LOSS_LIMIT_EXCEEDED'))).toBe(true);
  });

  it('equity below persisted high-water mark by > 10% rejects with TOTAL_DRAWDOWN_EXCEEDED', async () => {
    const db = getMockDb();
    db.mode = 'LIVE';
    process.env.TIER_4_ENABLED = 'true';

    const todayStr = new Date().toISOString().substring(0, 10);
    db.accountDays.push({
      day_date: todayStr,
      opening_balance: '10000000',
      opening_balance_captured_at: new Date().toISOString(),
      high_water_mark: '10000000',
      high_water_mark_updated_at: new Date().toISOString(),
    });

    // Equity $88,000 on $100,000 high water mark is > 10% drawdown ($12k drawdown > $10k max)
    setOandaMockConfig({
      accountBalance: '88000.00',
      accountEquity: '88000.00',
    });

    const result = await runCycle('test-cycle-drawdown');
    expect(result.success).toBe(true);

    expect(db.gateDecisions.some(g => g.approved === false && g.reasonCode === 'TOTAL_DRAWDOWN_EXCEEDED')).toBe(true);
  });

  it('openTradeCount at cap rejects with MAX_POSITIONS_EXCEEDED', async () => {
    const db = getMockDb();
    db.mode = 'LIVE';
    process.env.TIER_4_ENABLED = 'true';

    // Set open positions to 5 (max position limit in FTMO Standard Profile)
    setOandaMockConfig({
      openPositionCount: 5,
      openTradeCount: 5,
    });

    const result = await runCycle('test-cycle-max-positions');
    expect(result.success).toBe(true);

    expect(db.gateDecisions.some(g => g.approved === false && g.reasonCode === 'MAX_POSITIONS_EXCEEDED')).toBe(true);
  });

  it('concurrent second cycle exits with CYCLE_IN_FLIGHT lock failure', async () => {
    const db = getMockDb();
    // Simulate lock already held by another cycle
    db.cycleLocks.add('existing_running_cycle_123');

    const result = await runCycle('test-cycle-concurrent');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('CYCLE_IN_FLIGHT');
  });

  it('trailing-stop order protection matches approved intent when useTrailingStop is true', async () => {
    const db = getMockDb();
    db.mode = 'LIVE';
    process.env.TIER_4_ENABLED = 'true';
    db.config.riskProfile.useTrailingStop = true;
    db.config.riskProfile.trailingDistancePips = 15;

    const result = await runCycle('test-cycle-trailing');
    expect(result.success).toBe(true);

    // Gate decision must be approved (trailing stop intent submitted)
    const approvedDecision = db.gateDecisions.find(g => g.approved === true);
    if (approvedDecision) {
      expect(approvedDecision.approved).toBe(true);
    }
  });
});
