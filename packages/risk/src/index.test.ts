import { describe, it, expect } from 'vitest';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent, AccountRiskState } from './index';
import { toScaledInteger } from '@meridian/core';

describe('packages/risk (RiskGate & FTMO Standard Profile)', () => {
  const baseIntent: OrderIntent = {
    id: 'ord_123',
    accountId: 'acc_demo',
    instrument: 'GBP_USD',
    direction: 'BUY',
    units: toScaledInteger(10000n),
    stopLossPrice: toScaledInteger(13000n), // 1.3000
    requestedAt: new Date().toISOString()
  };

  const baseState: AccountRiskState = {
    accountId: 'acc_demo',
    startingDailyBalance: toScaledInteger(10000000n), // $100,000.00 (scale 2)
    currentEquity: toScaledInteger(10000000n),
    highWaterMark: toScaledInteger(10000000n),
    openPositionCount: 1,
    realizedPnlToday: 0n as any,
    unrealizedPnl: 0n as any,
    isNewsBlackoutActive: false
  };

  it('approves a compliant order intent and generates a valid ApprovalToken', () => {
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(decision.approved).toBe(true);
    expect(decision.token).toBeDefined();

    if (decision.token) {
      const isValid = RiskGate.verifyToken(decision.token, baseIntent);
      expect(isValid).toBe(true);
    }
  });

  it('rejects order intents missing a stop loss', () => {
    const invalidIntent = { ...baseIntent, stopLossPrice: 0n as any };
    const decision = RiskGate.evaluate(invalidIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('MISSING_STOP_LOSS');
  });

  it('rejects order intents during news blackout window', () => {
    const blackoutState = { ...baseState, isNewsBlackoutActive: true };
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, blackoutState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('NEWS_BLACKOUT_ACTIVE');
  });

  it('rejects order intents breaching 5% daily loss limit', () => {
    // 5% of $100,000 is $5,000 (represented as 500,000 in scale 2)
    const breachState = { ...baseState, realizedPnlToday: -500001n as any };
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, breachState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('DAILY_LOSS_LIMIT_EXCEEDED');
  });
});
