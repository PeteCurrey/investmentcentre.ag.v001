import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent, AccountRiskState, requireHmacSecret, checkNewsBlackoutActive, checkNewsBlackoutStatus, CalendarEvent } from './index';
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

  it('rejects order intents during news blackout window with NEWS_BLACKOUT_ACTIVE', () => {
    const blackoutState = { ...baseState, newsStatus: 'BLACKOUT' as const, isNewsBlackoutActive: true };
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, blackoutState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('NEWS_BLACKOUT_ACTIVE');
  });

  it('rejects order intents when calendar is unavailable with NEWS_CALENDAR_UNAVAILABLE', () => {
    const unknownState = { ...baseState, newsStatus: 'UNKNOWN' as const, isNewsBlackoutActive: true };
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, unknownState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('NEWS_CALENDAR_UNAVAILABLE');
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

  it('enforces spread boundary check with SPREAD_EXCEEDS_MAXIMUM', () => {
    // GBP/USD max spread in profile is 3.0 pips. Pass currentSpreadPips = 5.0 -> REJECTED
    const spreadState = { ...baseState, currentSpreadPips: 5.0 };
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, spreadState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('SPREAD_EXCEEDS_MAXIMUM');
  });

  it('enforces correlated exposure check with MAX_CORRELATED_EXPOSURE_EXCEEDED', () => {
    // Profile allows maxCorrelatedExposure = 2.
    // Existing positions have 2 BUY positions in USD_MAJORS (EUR/USD and AUD/USD).
    // Attempting a 3rd BUY position on GBP/USD -> REJECTED
    const correlatedState: AccountRiskState = {
      ...baseState,
      openPositions: [
        { instrument: 'EUR/USD', direction: 'BUY', riskAmountInAccountCurrency: 50000n as any },
        { instrument: 'AUD/USD', direction: 'BUY', riskAmountInAccountCurrency: 50000n as any },
      ],
    };
    const decision = RiskGate.evaluate(baseIntent, FTMO_STANDARD_PROFILE, correlatedState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('MAX_CORRELATED_EXPOSURE_EXCEEDED');
  });

  it('enforces aggregate risk check with MAX_AGGREGATE_RISK_EXCEEDED', () => {
    // Equity is $100,000. maxAggregateRiskPct is 5.0% ($5,000.00 = 500000n cents).
    // Existing open positions carry $4,800.00 (480000n cents) risk.
    // New intent carries $500.00 (50000n cents) risk -> total $5,300.00 > $5,000.00 -> REJECTED
    const aggregateState: AccountRiskState = {
      ...baseState,
      openPositions: [
        { instrument: 'EUR/USD', direction: 'BUY', riskAmountInAccountCurrency: 480000n as any },
      ],
    };
    // intent with 50,000 units at 145 pips = $725.00 risk. Total aggregate = $4,800 + $725 = $5,525 > $5,000
    const highRiskIntent = { ...baseIntent, units: toScaledInteger(50000n) };
    const decision = RiskGate.evaluate(highRiskIntent, FTMO_STANDARD_PROFILE, aggregateState);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('MAX_AGGREGATE_RISK_EXCEEDED');
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

describe('checkNewsBlackoutStatus & checkNewsBlackoutActive (Tri-State Calendar)', () => {
  const origTeKey = process.env.TRADING_ECONOMICS_KEY;
  const origFredKey = process.env.FRED_API_KEY;
  const origCalendarUrl = process.env.ECONOMIC_CALENDAR_URL;
  const origAllowUnchecked = process.env.ALLOW_UNCHECKED_NEWS_IN_PAPER;
  const origTier4 = process.env.TIER_4_ENABLED;
  const mockFetch = vi.fn();

  beforeEach(() => {
    delete process.env.TRADING_ECONOMICS_KEY;
    delete process.env.FRED_API_KEY;
    delete process.env.ECONOMIC_CALENDAR_URL;
    delete process.env.ALLOW_UNCHECKED_NEWS_IN_PAPER;
    delete process.env.TIER_4_ENABLED;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env.TRADING_ECONOMICS_KEY = origTeKey;
    process.env.FRED_API_KEY = origFredKey;
    process.env.ECONOMIC_CALENDAR_URL = origCalendarUrl;
    if (origAllowUnchecked !== undefined) process.env.ALLOW_UNCHECKED_NEWS_IN_PAPER = origAllowUnchecked;
    else delete process.env.ALLOW_UNCHECKED_NEWS_IN_PAPER;
    if (origTier4 !== undefined) process.env.TIER_4_ENABLED = origTier4;
    else delete process.env.TIER_4_ENABLED;
    vi.restoreAllMocks();
  });

  it('fails closed: returns UNKNOWN status and active=true if no calendar source is configured', async () => {
    const status = await checkNewsBlackoutStatus(['USD', 'GBP']);
    expect(status).toBe('UNKNOWN');

    const active = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(active).toBe(true);
  });

  it('fails closed: returns UNKNOWN status and active=true if fetch throws an error', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const status = await checkNewsBlackoutStatus(['USD', 'GBP']);
    expect(status).toBe('UNKNOWN');

    const active = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(active).toBe(true);
  });

  it('fails closed: returns UNKNOWN status and active=true if fetch returns a non-ok response', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const status = await checkNewsBlackoutStatus(['USD', 'GBP']);
    expect(status).toBe('UNKNOWN');

    const active = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(active).toBe(true);
  });

  it('returns CLEAR status and active=false if there are no events in the custom calendar', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const status = await checkNewsBlackoutStatus(['USD', 'GBP']);
    expect(status).toBe('CLEAR');

    const active = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(active).toBe(false);
  });

  it('returns BLACKOUT status and active=true if a HIGH impact event for target currency is within window', async () => {
    process.env.ECONOMIC_CALENDAR_URL = 'http://mock-calendar/events';
    const now = new Date();
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

    const status = await checkNewsBlackoutStatus(['USD', 'GBP']);
    expect(status).toBe('BLACKOUT');

    const active = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(active).toBe(true);
  });

  it('FRED coverage gap: returns UNKNOWN for GBP/USD when no US event because GBP leg is uncovered', async () => {
    process.env.FRED_API_KEY = 'test-fred-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ release_dates: [] })
    });

    // GBP is not covered by FRED US macro calendar -> coverage gap -> UNKNOWN
    const status = await checkNewsBlackoutStatus(['GBP', 'USD']);
    expect(status).toBe('UNKNOWN');

    const active = await checkNewsBlackoutActive(['GBP', 'USD']);
    expect(active).toBe(true);
  });

  it('FRED fully covered: returns CLEAR for XAU/USD when no US event because XAU/USD is fully USD-correlated', async () => {
    process.env.FRED_API_KEY = 'test-fred-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ release_dates: [] })
    });

    // XAU and USD are both in USD_CORRELATED_CURRENCIES -> fully covered -> CLEAR
    const status = await checkNewsBlackoutStatus(['XAU', 'USD']);
    expect(status).toBe('CLEAR');

    const active = await checkNewsBlackoutActive(['XAU', 'USD']);
    expect(active).toBe(false);
  });

  it('ALLOW_UNCHECKED_NEWS_IN_PAPER: resolves UNKNOWN to CLEAR in paper mode when explicitly enabled', async () => {
    process.env.ALLOW_UNCHECKED_NEWS_IN_PAPER = 'true';
    delete process.env.TIER_4_ENABLED; // paper mode

    const status = await checkNewsBlackoutStatus(['USD', 'GBP']);
    expect(status).toBe('CLEAR');

    const active = await checkNewsBlackoutActive(['USD', 'GBP']);
    expect(active).toBe(false);
  });

  it('ALLOW_UNCHECKED_NEWS_IN_PAPER: throws security exception if enabled in LIVE mode (TIER_4_ENABLED=true)', async () => {
    process.env.ALLOW_UNCHECKED_NEWS_IN_PAPER = 'true';
    process.env.TIER_4_ENABLED = 'true';

    await expect(checkNewsBlackoutStatus(['USD', 'GBP'])).rejects.toThrow(
      'Security Exception: ALLOW_UNCHECKED_NEWS_IN_PAPER is strictly forbidden when TIER_4_ENABLED=true (LIVE mode).'
    );
  });
});


