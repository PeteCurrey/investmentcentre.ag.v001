import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent, AccountRiskState, requireHmacSecret, checkNewsBlackoutActive, CalendarEvent } from './index';
import { toScaledInteger, createPrice } from '@meridian/core';

describe('packages/risk (RiskGate & FTMO Standard Profile)', () => {
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

  const baseIntent: OrderIntent = {
    id: 'ord_123',
    accountId: 'acc_demo',
    instrument: 'GBP_USD',
    direction: 'BUY',
    units: toScaledInteger(10000n),
    entryPrice: createPrice(toScaledInteger(13145n), 4, 'USD'),   // 1.3145
    stopLossPrice: createPrice(toScaledInteger(13000n), 4, 'USD'), // 1.3000 (145 pips distance)
    requestedAt: new Date().toISOString()
  };

  const baseState: AccountRiskState = {
    accountId: 'acc_demo',
    startingDailyBalance: toScaledInteger(10000000n), // $100,000.00 (scale 2)
    currentEquity: toScaledInteger(10000000n),        // $100,000.00 (scale 2)
    highWaterMark: toScaledInteger(10000000n),        // $100,000.00 (scale 2)
    openPositionCount: 1,
    realizedPnlToday: 0n as any,
    unrealizedPnl: 0n as any,
    isNewsBlackoutActive: false
  };

  it('throws an error in evaluate if RISK_HMAC_SECRET is missing or under 32 characters', () => {
    delete process.env.RISK_HMAC_SECRET;
    expect(() => requireHmacSecret()).toThrow(/RISK_HMAC_SECRET environment variable is missing or under minimum required length/);
    expect(() => RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, baseState)).toThrow(/RISK_HMAC_SECRET/);

    process.env.RISK_HMAC_SECRET = 'short_secret_under_32_chars';
    expect(() => requireHmacSecret()).toThrow(/RISK_HMAC_SECRET environment variable is missing or under minimum required length/);
    expect(() => RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, baseState)).toThrow(/RISK_HMAC_SECRET/);
  });

  it('returns false for verifyToken if RISK_HMAC_SECRET is missing or invalid', () => {
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(decision.token).toBeDefined();

    delete process.env.RISK_HMAC_SECRET;
    expect(RiskGate.verifyToken(decision.token!, baseIntent)).toBe(false);

    process.env.RISK_HMAC_SECRET = 'short_secret';
    expect(RiskGate.verifyToken(decision.token!, baseIntent)).toBe(false);
  });

  it('approves a compliant order intent and generates a valid ApprovalToken when RISK_HMAC_SECRET is valid', () => {
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(decision.approved).toBe(true);
    expect(decision.token).toBeDefined();

    if (decision.token) {
      const isValid = RiskGate.verifyToken(decision.token, baseIntent);
      expect(isValid).toBe(true);
    }
  });

  it('rejects order intents missing a stop loss', () => {
    const invalidIntent = { ...baseIntent, stopLossPrice: { price: 0n as any, scale: 4, currency: 'USD' } };
    const decision = RiskGate.evaluate(invalidIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('MISSING_STOP_LOSS');
  });

  it('rejects order intents with zero or negative units magnitude', () => {
    const zeroUnitsIntent = { ...baseIntent, units: 0n as any };
    const zeroDecision = RiskGate.evaluate(zeroUnitsIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(zeroDecision.approved).toBe(false);
    expect(zeroDecision.reasonCode).toBe('INVALID_UNITS_MAGNITUDE');

    const negativeUnitsIntent = { ...baseIntent, units: -10000n as any };
    const negDecision = RiskGate.evaluate(negativeUnitsIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(negDecision.approved).toBe(false);
    expect(negDecision.reasonCode).toBe('INVALID_UNITS_MAGNITUDE');
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

  it('enforces total drawdown boundary from high-water mark', () => {
    // Max total drawdown is 10.0% ($10,000 from $100,000 peak)
    // 1. Drawdown of $9,999.00 -> Equity $90,001.00 (9,000,100n scale 2) -> APPROVED
    const compliantEquityState = { ...baseState, currentEquity: toScaledInteger(9000100n) };
    const passDecision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, compliantEquityState);
    expect(passDecision.approved).toBe(true);

    // 2. Drawdown of $10,001.00 -> Equity $89,999.00 (8,999,900n scale 2) -> REJECTED
    const breachEquityState = { ...baseState, currentEquity: toScaledInteger(8999900n) };
    const failDecision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, breachEquityState);
    expect(failDecision.approved).toBe(false);
    expect(failDecision.reasonCode).toBe('TOTAL_DRAWDOWN_EXCEEDED');
  });

  it('enforces max risk per trade boundary for BUY orders', () => {
    // Max risk per trade is 1.0% ($1,000.00 = 100000n in scale 2)
    // 10,000 units with 145 pips (scale 4) = $145.00 risk -> APPROVED
    const tradeA = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(tradeA.approved).toBe(true);

    // 100,000 units with 145 pips (scale 4) = $1,450.00 risk -> REJECTED
    const oversizedIntent = { ...baseIntent, units: toScaledInteger(100000n) };
    const tradeB = RiskGate.evaluate(oversizedIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(tradeB.approved).toBe(false);
    expect(tradeB.reasonCode).toBe('MAX_RISK_PER_TRADE_EXCEEDED');
  });

  it('enforces max risk per trade boundary for SELL orders', () => {
    // SELL order: entry 1.3000, stop loss 1.3145 (145 pips distance)
    const sellIntent: OrderIntent = {
      ...baseIntent,
      direction: 'SELL',
      entryPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),
      stopLossPrice: createPrice(toScaledInteger(13145n), 4, 'USD'),
      units: toScaledInteger(10000n) // 10,000 units ($145.00 risk)
    };
    const tradeA = RiskGate.evaluate(sellIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(tradeA.approved).toBe(true);

    const oversizedSellIntent = { ...sellIntent, units: toScaledInteger(100000n) }; // $1,450.00 risk
    const tradeB = RiskGate.evaluate(oversizedSellIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(tradeB.approved).toBe(false);
    expect(tradeB.reasonCode).toBe('MAX_RISK_PER_TRADE_EXCEEDED');
  });

  it('enforces ceiling rounding for sub-cent trade risk boundary', () => {
    // 68,965 units * 145 pips = 9,999,925 raw risk at scale 4 -> scale 2 ceil = 100,000n ($1,000.00 -> APPROVED)
    const compliantIntent = { ...baseIntent, units: toScaledInteger(68965n) };
    const passTrade = RiskGate.evaluate(compliantIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(passTrade.approved).toBe(true);

    // 68,966 units * 145 pips = 10,000,070 raw risk at scale 4 -> scale 2 ceil = 100,001n ($1,000.01 -> REJECTED)
    const subCentOverIntent = { ...baseIntent, units: toScaledInteger(68966n) };
    const failTrade = RiskGate.evaluate(subCentOverIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(failTrade.approved).toBe(false);
    expect(failTrade.reasonCode).toBe('MAX_RISK_PER_TRADE_EXCEEDED');
  });

  it('rejects order intents with price scale or currency mismatch', () => {
    // 1. Scale mismatch (entry scale 4 vs stop loss scale 2)
    const scaleMismatchIntent: OrderIntent = {
      ...baseIntent,
      stopLossPrice: createPrice(toScaledInteger(130n), 2, 'USD')
    };
    const scaleDecision = RiskGate.evaluate(scaleMismatchIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(scaleDecision.approved).toBe(false);
    expect(scaleDecision.reasonCode).toBe('PRICE_SCALE_MISMATCH');

    // 2. Currency mismatch (entry currency USD vs stop loss currency EUR)
    const currencyMismatchIntent: OrderIntent = {
      ...baseIntent,
      stopLossPrice: createPrice(toScaledInteger(13000n), 4, 'EUR')
    };
    const currencyDecision = RiskGate.evaluate(currencyMismatchIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(currencyDecision.approved).toBe(false);
    expect(currencyDecision.reasonCode).toBe('PRICE_CURRENCY_MISMATCH');
  });

  it('rejects when openPositionCount reaches max concurrent positions cap (5)', () => {
    const cappedState = { ...baseState, openPositionCount: 5 };
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, cappedState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('MAX_POSITIONS_EXCEEDED');
  });

  it('rejects when quote currency requires conversion and rate is unavailable', () => {
    const jpyIntent: OrderIntent = {
      ...baseIntent,
      instrument: 'USD_JPY',
      entryPrice: createPrice(toScaledInteger(15642n), 2, 'JPY'),
      stopLossPrice: createPrice(toScaledInteger(15542n), 2, 'JPY')
    };
    // No quoteToAccountRates supplied
    const decision = RiskGate.evaluate(jpyIntent, FTMO_STANDARD_PROFILE, baseState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('CONVERSION_RATE_UNAVAILABLE');
  });

  it('approves when quote currency conversion rate is provided and risk is compliant', () => {
    const jpyIntent: OrderIntent = {
      ...baseIntent,
      instrument: 'USD_JPY',
      units: toScaledInteger(1000n),
      entryPrice: createPrice(toScaledInteger(15642n), 2, 'JPY'),
      stopLossPrice: createPrice(toScaledInteger(15542n), 2, 'JPY')
    };
    const jpyState: AccountRiskState = {
      ...baseState,
      quoteToAccountRates: { 'JPY': 0.00639 } // 1 JPY = 0.00639 USD
    };
    const decision = RiskGate.evaluate(jpyIntent, FTMO_STANDARD_PROFILE, jpyState);
    expect(decision.approved).toBe(true);
  });
});

describe('checkNewsBlackoutActive', () => {
  const origTeKey = process.env.TRADING_ECONOMICS_KEY;
  const origFredKey = process.env.FRED_API_KEY;
  const origCalendarUrl = process.env.ECONOMIC_CALENDAR_URL;
  const mockFetch = vi.fn();

  beforeEach(() => {
    delete process.env.TRADING_ECONOMICS_KEY;
    delete process.env.FRED_API_KEY;
    delete process.env.ECONOMIC_CALENDAR_URL;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env.TRADING_ECONOMICS_KEY = origTeKey;
    process.env.FRED_API_KEY = origFredKey;
    process.env.ECONOMIC_CALENDAR_URL = origCalendarUrl;
    vi.restoreAllMocks();
  });

  it('returns false (not fail-closed) if no calendar source is configured', async () => {
    // New behaviour: unconfigured calendar logs a warning but does not block trading.
    // Previously this returned true (fail-closed) which permanently blocked all cycles.
    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(false);
  });

  it('returns false (not fail-closed) if fetch throws an error', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(false);
  });

  it('returns false (not fail-closed) if fetch returns a non-ok response', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(false);
  });

  it('returns false if there are no events in the calendar', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(false);
  });

  it('returns true if a HIGH impact event for target currency is within window', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    const now = new Date();
    // Event scheduled 1 minute from now (window is 2 minutes)
    const eventTime = new Date(now.getTime() + 60 * 1000).toISOString();

    const mockEvents: CalendarEvent[] = [
      {
        id: 'evt_1',
        title: 'Non-Farm Payrolls',
        country: 'USD',
        impact: 'HIGH',
        scheduledAt: eventTime
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockEvents
    });

    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(true);
  });

  it('returns false if event is within window but impact is not HIGH', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    const now = new Date();
    const eventTime = new Date(now.getTime() + 60 * 1000).toISOString();

    const mockEvents: CalendarEvent[] = [
      {
        id: 'evt_1',
        title: 'Minor Report',
        country: 'USD',
        impact: 'MEDIUM',
        scheduledAt: eventTime
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockEvents
    });

    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(false);
  });

  it('returns false if event is HIGH impact within window but for a non-traded currency', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    const now = new Date();
    const eventTime = new Date(now.getTime() + 60 * 1000).toISOString();

    const mockEvents: CalendarEvent[] = [
      {
        id: 'evt_1',
        title: 'ECB Rate Decision',
        country: 'EUR',
        impact: 'HIGH',
        scheduledAt: eventTime
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockEvents
    });

    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(false);
  });

  it('returns false if event is HIGH impact and for traded currency but outside window', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    const now = new Date();
    // Event scheduled 3 minutes from now (window is 2 minutes)
    const eventTime = new Date(now.getTime() + 180 * 1000).toISOString();

    const mockEvents: CalendarEvent[] = [
      {
        id: 'evt_1',
        title: 'Non-Farm Payrolls',
        country: 'USD',
        impact: 'HIGH',
        scheduledAt: eventTime
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockEvents
    });

    const result = await checkNewsBlackoutActive(['USD', 'GBP'], 2);
    expect(result).toBe(false);
  });

  it('FRED: returns false for non-USD pair (EUR/GBP) even if FRED key set — USD events do not affect EUR/GBP', async () => {
    process.env.FRED_API_KEY = 'test-fred-key';
    // EUR/GBP has no USD leg — FRED USD events should not block it
    const result = await checkNewsBlackoutActive(['EUR', 'GBP']);
    expect(result).toBe(false);
    // fetch should NOT have been called since no USD exposure
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('FRED: returns false if FRED API returns no release dates for today', async () => {
    process.env.FRED_API_KEY = 'test-fred-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ release_dates: [] })
    });

    const result = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(result).toBe(false);
  });
});


