import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaperBroker, OandaBrokerAdapter, parsePriceStringToBigInt } from './index';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent, AccountRiskState } from '@meridian/risk';
import { toScaledInteger, createPrice } from '@meridian/core';

describe('parsePriceStringToBigInt (No-Float Parsing Utility & Half-Up Rounding)', () => {
  it('parses price strings into ScaledInteger BigInts with zero float operations', () => {
    expect(parsePriceStringToBigInt('1.31456')).toEqual({ amount: 131456n, scale: 5 });
    expect(parsePriceStringToBigInt('1.3000', 4)).toEqual({ amount: 13000n, scale: 4 });
    expect(parsePriceStringToBigInt('100000.00', 2)).toEqual({ amount: 10000000n, scale: 2 });
    expect(parsePriceStringToBigInt('-50.25', 2)).toEqual({ amount: -5025n, scale: 2 });
    expect(parsePriceStringToBigInt('0', 0)).toEqual({ amount: 0n, scale: 0 });
  });

  it('applies half-up rounding when truncating a string float to a target scale', () => {
    // 1.31456 truncated to scale 4: 6 >= 5 -> rounds up to 1.3146 -> 13146n
    expect(parsePriceStringToBigInt('1.31456', 4)).toEqual({ amount: 13146n, scale: 4 });
    // 1.31454 truncated to scale 4: 4 < 5 -> stays 1.3145 -> 13145n
    expect(parsePriceStringToBigInt('1.31454', 4)).toEqual({ amount: 13145n, scale: 4 });
    // 50.005 truncated to scale 2: 5 >= 5 -> rounds up to 50.01 -> 5001n
    expect(parsePriceStringToBigInt('50.005', 2)).toEqual({ amount: 5001n, scale: 2 });
  });
});

describe('packages/execute (PaperBroker & Security Boundary)', () => {
  const origSecret = process.env.RISK_HMAC_SECRET;
  const validSecret = 'valid_test_secret_key_that_is_at_least_32_chars_long!';

  beforeEach(() => {
    process.env.RISK_HMAC_SECRET = validSecret;
  });

  afterEach(() => {
    if (origSecret) {
      process.env.RISK_HMAC_SECRET = origSecret;
    } else {
      delete process.env.RISK_HMAC_SECRET;
    }
  });

  const broker = new PaperBroker();

  const intent: OrderIntent = {
    id: 'ord_exec_1',
    accountId: 'acc_demo',
    instrument: 'GBP_USD',
    direction: 'BUY',
    units: toScaledInteger(10000n),
    entryPrice: createPrice(toScaledInteger(13145n), 4, 'USD'),
    stopLossPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),
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
  const origSecret = process.env.RISK_HMAC_SECRET;
  const validSecret = 'valid_test_secret_key_that_is_at_least_32_chars_long!';

  const intent: OrderIntent = {
    id: 'ord_exec_oanda_1',
    accountId: 'acc_oanda_demo',
    instrument: 'GBP/USD',
    direction: 'BUY',
    units: toScaledInteger(10000n),
    entryPrice: createPrice(toScaledInteger(13145n), 4, 'USD'),
    stopLossPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),
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
    process.env.RISK_HMAC_SECRET = validSecret;
    delete process.env.TIER_4_ENABLED;
  });

  afterEach(() => {
    if (origSecret) {
      process.env.RISK_HMAC_SECRET = origSecret;
    } else {
      delete process.env.RISK_HMAC_SECRET;
    }
    delete process.env.TIER_4_ENABLED;
    vi.restoreAllMocks();
  });

  it('fails loudly when credentials are unconfigured instead of using simulated fallbacks', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: '', accountId: '' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);

    const submitRes = await oanda.submitOrder(intent, decision.token!);
    expect(submitRes.success).toBe(false);
    if (!submitRes.success) {
      expect(submitRes.error.message).toMatch(/unconfigured/);
    }

    const cancelRes = await oanda.cancelOrder('ord_123');
    expect(cancelRes.success).toBe(false);
    if (!cancelRes.success) {
      expect(cancelRes.error.message).toMatch(/unconfigured/);
    }

    const posRes = await oanda.getPositions('acc_oanda_demo');
    expect(posRes.success).toBe(false);
    if (!posRes.success) {
      expect(posRes.error.message).toMatch(/unconfigured/);
    }

    const stateRes = await oanda.getAccountState('acc_oanda_demo');
    expect(stateRes.success).toBe(false);
    if (!stateRes.success) {
      expect(stateRes.error.message).toMatch(/unconfigured/);
    }
  });

  it('rejects forged token on OANDA adapter', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_key', accountId: 'test_acc', environment: 'practice' });
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

  it('submits order payload carrying clientExtensions.id and parses Zod validated response', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_api_key_123', accountId: '101-001-123456-001', environment: 'practice' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);

    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          orderCreateTransaction: { id: '1001' },
          orderFillTransaction: { id: '1002', price: '1.3000' }
        })
      };
    }));

    const res = await oanda.submitOrder(intent, decision.token!);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.status).toBe('FILLED');
      expect(res.value.id).toBe('1001');
    }
    expect(capturedBody.order.clientExtensions.id).toBe(intent.id);
  });

  it('dynamically computes fill price scale from raw OANDA response decimal precision', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_api_key_123', accountId: '101-001-123456-001', environment: 'practice' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);

    // OANDA 5-decimal pip price: "1.31456" -> should produce 131456n at scale 5 (intent.stopLossPrice.scale is 4)
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        orderFillTransaction: { id: '1002', price: '1.31456' }
      })
    })));

    const res = await oanda.submitOrder(intent, decision.token!);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.fillPrice).toBe(131456n);
    }
  });

  it('applies half-up rounding when OANDA returns 5-decimal position pricing against target scale 4', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_api_key_123', accountId: '101-001-123456-001', environment: 'practice' });

    // Mock OANDA returning 5-decimal entry price "1.31456" and 3-decimal unrealized PnL "50.005"
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        positions: [{
          instrument: 'GBP_USD',
          long: { units: '10000', averagePrice: '1.31456' },
          unrealizedPL: '50.005'
        }]
      })
    })));

    const posRes = await oanda.getPositions('101-001-123456-001');
    expect(posRes.success).toBe(true);
    if (posRes.success) {
      // 1.31456 rounded half-up to scale 4 is 1.3146 -> 13146n (not truncated to 13145n)
      expect(posRes.value[0].entryPrice).toBe(13146n);
      // 50.005 rounded half-up to scale 2 is 50.01 -> 5001n (not truncated to 5000n)
      expect(posRes.value[0].unrealizedPnl).toBe(5001n);
    }
  });

  it('returns stopLossPrice as undefined from getPositions — not 0n — so callers cannot misread unknown as unprotected', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_api_key_123', accountId: '101-001-123456-001', environment: 'practice' });

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        positions: [{ instrument: 'EUR_USD', long: { units: '5000', averagePrice: '1.0850' }, unrealizedPL: '-10.00' }]
      })
    })));

    const posRes = await oanda.getPositions('101-001-123456-001');
    expect(posRes.success).toBe(true);
    if (posRes.success) {
      // stopLossPrice is NOT sourced from /openPositions — must be undefined, not 0n.
      // 0n would be indistinguishable from "position has no stop-loss", a maximum-severity risk event.
      expect(posRes.value[0].stopLossPrice).toBeUndefined();
    }
  });

  it('serialises stop-loss price to OANDA decimal string format using pure string arithmetic (no float division)', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_api_key_123', accountId: '101-001-123456-001', environment: 'practice' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);

    let capturedSLPrice: string | undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init: any) => {
      const body = JSON.parse(init.body);
      capturedSLPrice = body.order.stopLossOnFill?.price;
      return { ok: true, json: async () => ({ orderFillTransaction: { id: '3001', price: '1.3000' } }) };
    }));

    await oanda.submitOrder(intent, decision.token!);
    // intent.stopLossPrice is createPrice(toScaledInteger(13000n), 4, 'USD') -> price=13000n, scale=4
    // Expected serialisation: "1.3000" (4 decimal places, no float rounding hazard)
    expect(capturedSLPrice).toBe('1.3000');
  });


  it('attaches explicit source and fetchedAt provenance on positions and account state', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_api_key_123', accountId: '101-001-123456-001', environment: 'practice' });

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/openPositions')) {
        return {
          ok: true,
          json: async () => ({
            positions: [{ instrument: 'GBP_USD', long: { units: '10000', averagePrice: '1.3145' }, unrealizedPL: '50.00' }]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          account: { id: '101-001-123456-001', balance: '100000.00', NAV: '100050.00', unrealizedPL: '50.00', openPositionCount: 1, currency: 'USD' }
        })
      };
    }));

    const posRes = await oanda.getPositions('101-001-123456-001');
    expect(posRes.success).toBe(true);
    if (posRes.success) {
      expect(posRes.value[0].source).toBe('oanda.rest.v3');
      expect(posRes.value[0].fetchedAt).toBeDefined();
    }

    const stateRes = await oanda.getAccountState('101-001-123456-001');
    expect(stateRes.success).toBe(true);
    if (stateRes.success) {
      expect(stateRes.value.source).toBe('oanda.rest.v3');
      expect(stateRes.value.fetchedAt).toBeDefined();
    }
  });

  it('rejects OANDA response when Zod schema validation fails', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_api_key_123', accountId: '101-001-123456-001', environment: 'practice' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        orderCreateTransaction: 'invalid_type_should_be_object' // Zod validation failure
      })
    })));

    const res = await oanda.submitOrder(intent, decision.token!);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toMatch(/Invalid Schema/);
    }
  });

  it('enforces fail-closed TIER_4_ENABLED check when OANDA is in live mode', async () => {
    const oanda = new OandaBrokerAdapter({ apiKey: 'test_key', accountId: 'test_acc', environment: 'live' });
    const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, state);

    // 1. Without TIER_4_ENABLED=true (unset)
    const resNoTier4 = await oanda.submitOrder(intent, decision.token!);
    expect(resNoTier4.success).toBe(false);
    if (!resNoTier4.success) {
      expect(resNoTier4.error.message).toMatch(/TIER_4_ENABLED/);
    }

    // 2. With TIER_4_ENABLED=true
    process.env.TIER_4_ENABLED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        orderFillTransaction: { id: '2001', price: '1.3000' }
      })
    })));

    const resWithTier4 = await oanda.submitOrder(intent, decision.token!);
    expect(resWithTier4.success).toBe(true);
  });
});
