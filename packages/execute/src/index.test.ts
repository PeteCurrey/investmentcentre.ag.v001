import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PaperBroker, OandaBrokerAdapter } from './index';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent, AccountRiskState } from '@meridian/risk';
import { toScaledInteger } from '@meridian/core';

describe('packages/execute (PaperBroker & Security Boundary)', () => {
  const broker = new PaperBroker();

  const intent: OrderIntent = {
    id: 'ord_exec_1',
    accountId: 'acc_demo',
    instrument: 'GBP_USD',
    direction: 'BUY',
    units: toScaledInteger(10000n),
    stopLossPrice: toScaledInteger(13000n),
    requestedAt: new Date().toISOString()
  };

  const state: AccountRiskState = {
    accountId: 'acc_demo',
    startingDailyBalance: toScaledInteger(10000000n),
    currentEquity: toScaledInteger(10000000n),
    highWaterMark: toScaledInteger(10000000n),
    openPositionCount: 0,
    realizedPnlToday: 0n as any,
    unrealizedPnl: 0n as any,
    isNewsBlackoutActive: false
  };

  it('successfully fills order when valid RiskGate ApprovalToken is provided', async () => {
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);
    expect(decision.token).toBeDefined();

    const res = await broker.submitOrder(intent, decision.token!);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.status).toBe('FILLED');
      expect(res.value.clientOrderId).toBe(intent.id);
    }
  });

  it('rejects order execution when ApprovalToken is forged or missing', async () => {
    const forgedToken = {
      tokenId: 'tok_fake',
      orderIntentId: intent.id,
      accountId: intent.accountId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      hmacSignature: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    };

    const res = await broker.submitOrder(intent, forgedToken);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toMatch(/Security Exception/);
    }
  });
});

describe('packages/execute (OandaBrokerAdapter & Security/Safety Boundary)', () => {
  const intent: OrderIntent = {
    id: 'ord_exec_oanda_1',
    accountId: 'acc_oanda_demo',
    instrument: 'GBP/USD',
    direction: 'BUY',
    units: toScaledInteger(10000n),
    stopLossPrice: toScaledInteger(13000n),
    requestedAt: new Date().toISOString()
  };

  const state: AccountRiskState = {
    accountId: 'acc_oanda_demo',
    startingDailyBalance: toScaledInteger(10000000n),
    currentEquity: toScaledInteger(10000000n),
    highWaterMark: toScaledInteger(10000000n),
    openPositionCount: 0,
    realizedPnlToday: 0n as any,
    unrealizedPnl: 0n as any,
    isNewsBlackoutActive: false
  };

  beforeEach(() => {
    delete process.env.TIER_4_ENABLED;
  });

  afterEach(() => {
    delete process.env.TIER_4_ENABLED;
  });

  it('verifies ApprovalToken even with unconfigured practice OANDA credentials', async () => {
    const oanda = new OandaBrokerAdapter({ environment: 'practice' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);

    const res = await oanda.submitOrder(intent, decision.token!);
    expect(res.success).toBe(true); // Should return simulated fill since API keys are blank
  });

  it('rejects forged token on OANDA adapter', async () => {
    const oanda = new OandaBrokerAdapter({ environment: 'practice' });
    const forgedToken = {
      tokenId: 'tok_fake',
      orderIntentId: intent.id,
      accountId: intent.accountId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      hmacSignature: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    };

    const res = await oanda.submitOrder(intent, forgedToken);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toMatch(/Security Exception/);
    }
  });

  it('enforces TIER_4_ENABLED check when OANDA is in live mode', async () => {
    const oanda = new OandaBrokerAdapter({ environment: 'live' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);

    // 1. Without TIER_4_ENABLED=true
    const resNoTier4 = await oanda.submitOrder(intent, decision.token!);
    expect(resNoTier4.success).toBe(false);
    if (!resNoTier4.success) {
      expect(resNoTier4.error.message).toMatch(/TIER_4_ENABLED/);
    }

    // 2. With TIER_4_ENABLED=true (simulated path since keys are blank)
    process.env.TIER_4_ENABLED = 'true';
    const resWithTier4 = await oanda.submitOrder(intent, decision.token!);
    expect(resWithTier4.success).toBe(true);
  });
});
