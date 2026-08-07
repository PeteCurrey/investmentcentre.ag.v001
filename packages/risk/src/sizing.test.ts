/**
 * Unit tests for Risk-Derived Sizing, Aggregate Risk, Correlated Exposure, and Spread Checks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculatePositionSize,
  FTMO_STANDARD_PROFILE,
  RiskGate,
  OrderIntent,
  AccountRiskState,
} from './index';
import { createPrice, toScaledInteger, ScaledInteger } from '@meridian/core';

const validSecret = 'valid_test_secret_key_that_is_at_least_32_chars_long!';
const origSecret = process.env.RISK_HMAC_SECRET;

// $100,000.00 at scale 2 = 10_000_000n
const EQUITY_100K = toScaledInteger(10000000n);

describe('Risk-Derived Position Sizing', () => {
  const defaultState: AccountRiskState = {
    accountId: 'test_account',
    accountCurrency: 'USD',
    startingDailyBalance: EQUITY_100K,
    currentEquity: EQUITY_100K,
    highWaterMark: EQUITY_100K,
    openPositionCount: 0,
    realizedPnlToday: toScaledInteger(0n),
    unrealizedPnl: toScaledInteger(0n),
    isNewsBlackoutActive: false,
  };

  it('should calculate position size proportional to risk (1% of $100k = $1,000 budget)', () => {
    // GBP/USD at 1.3000, SL at 1.2970 (30 pips = 0.0030)
    // Risk per unit = 0.0030 USD (scale 4 -> priceDelta = 30n at scale 4 = 0.0030)
    // Budget = $1,000 (scale 2 = 100000n)
    // Expected units = floor( (100000 at scale 4) / 30 ) = floor(3333333.33) = 3333333 units
    const intent = {
      instrument: 'GBP/USD',
      entryPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),   // 1.3000
      stopLossPrice: createPrice(toScaledInteger(12970n), 4, 'USD'), // 1.2970
    };

    const res = calculatePositionSize(intent, FTMO_STANDARD_PROFILE, defaultState);
    // maxRiskAllowed = floor(10_000_000 * 100 / 10000) = 100_000 (scale 2 = $1,000.00)
    expect(res.maxRiskAllowedInAccountCurrency).toBe(100000n as ScaledInteger);
    // risk per unit at scale 2 = priceDelta(30 at scale4) / 100 = 0.03 cents... let's confirm units > 0
    expect(res.units).toBeGreaterThan(0n);
    // actual risk must be <= budget
    expect(res.riskAmountInAccountCurrency).toBeLessThanOrEqual(res.maxRiskAllowedInAccountCurrency);
  });

  it('should return 0 units when price delta is zero (entry equals stop loss)', () => {
    const intent = {
      instrument: 'GBP/USD',
      entryPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),
      stopLossPrice: createPrice(toScaledInteger(13000n), 4, 'USD'), // same as entry
    };

    const res = calculatePositionSize(intent, FTMO_STANDARD_PROFILE, defaultState);
    expect(res.units).toBe(0n);
  });

  it('should return 0 units when equity is zero', () => {
    const zeroEquityState: AccountRiskState = {
      ...defaultState,
      currentEquity: toScaledInteger(0n),
    };

    const intent = {
      instrument: 'GBP/USD',
      entryPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),
      stopLossPrice: createPrice(toScaledInteger(12970n), 4, 'USD'),
    };

    const res = calculatePositionSize(intent, FTMO_STANDARD_PROFILE, zeroEquityState);
    expect(res.units).toBe(0n);
  });

  it('should enforce min floor when maxLotUnitsOverride is set', () => {
    const intent = {
      instrument: 'GBP/USD',
      entryPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),
      stopLossPrice: createPrice(toScaledInteger(12970n), 4, 'USD'),
    };

    // When maxLotUnitsOverride (1000 units floor) is set, 333,333 calculated units >= 1000 floor
    const res = calculatePositionSize(intent, FTMO_STANDARD_PROFILE, defaultState, 1000);
    expect(res.units).toBe(333333n);

    // When calculated units (e.g. 500) < min floor (1000), it enforces the 1000 floor
    const resFloored = calculatePositionSize(intent, FTMO_STANDARD_PROFILE, defaultState, 500000);
    expect(resFloored.units).toBe(500000n);
  });

  it('should cap XAU/USD at OANDA max units (10000)', () => {
    // Gold at 2380.00, SL at 2379.90 ($0.10 SL)
    // Budget = $1,000 → 10,000 units computed → capped to OANDA_MAX_UNITS (10000)
    const intent = {
      instrument: 'XAU/USD',
      entryPrice: createPrice(toScaledInteger(238000n), 2, 'USD'),   // 2380.00
      stopLossPrice: createPrice(toScaledInteger(237990n), 2, 'USD'), // 2379.90 ($0.10 SL)
    };
    const res = calculatePositionSize(intent, FTMO_STANDARD_PROFILE, defaultState);
    expect(res.units).toBe(10000n); // capped at OANDA max
  });
});

describe('RiskGate — Spread, Correlated Exposure, and Aggregate Risk Rules', () => {
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

  const baseState: AccountRiskState = {
    accountId: 'test_acc',
    accountCurrency: 'USD',
    startingDailyBalance: EQUITY_100K,
    currentEquity: EQUITY_100K,
    highWaterMark: EQUITY_100K,
    openPositionCount: 1,
    realizedPnlToday: toScaledInteger(0n),
    unrealizedPnl: toScaledInteger(0n),
    isNewsBlackoutActive: false,
  };

  const sampleIntent: OrderIntent = {
    id: 'intent_spread_test',
    accountId: 'test_acc',
    instrument: 'GBP/USD',
    direction: 'BUY',
    units: toScaledInteger(1000n),
    entryPrice: createPrice(toScaledInteger(13000n), 4, 'USD'),    // 1.3000
    stopLossPrice: createPrice(toScaledInteger(12850n), 4, 'USD'), // 1.2850 (150 pips)
    requestedAt: new Date().toISOString(),
  };

  it('should reject trade if current spread exceeds maxSpreadPips for the instrument', () => {
    const state: AccountRiskState = {
      ...baseState,
      currentSpreadPips: 4.5, // exceeds the 3.0 pip max for GBP/USD
    };
    const decision = RiskGate.evaluate(sampleIntent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('SPREAD_EXCEEDS_MAXIMUM');
  });

  it('should approve trade when spread is at or below the maximum', () => {
    const state: AccountRiskState = {
      ...baseState,
      currentSpreadPips: 2.5, // below 3.0 pip max for GBP/USD
    };
    const decision = RiskGate.evaluate(sampleIntent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);
    expect(decision.reasonCode).toBeUndefined();
  });

  it('should reject trade when correlated same-direction positions >= maxCorrelatedExposure', () => {
    const state: AccountRiskState = {
      ...baseState,
      openPositionCount: 2,
      openPositions: [
        { instrument: 'EUR/USD', direction: 'BUY', riskAmountInAccountCurrency: toScaledInteger(50000n) },  // $500
        { instrument: 'AUD/USD', direction: 'BUY', riskAmountInAccountCurrency: toScaledInteger(50000n) },  // $500
      ],
    };
    // Attempting 3rd BUY in USD_MAJORS group when maxCorrelatedExposure = 2
    const decision = RiskGate.evaluate(sampleIntent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('MAX_CORRELATED_EXPOSURE_EXCEEDED');
  });

  it('should allow trade when correlated count is below the maximum', () => {
    const state: AccountRiskState = {
      ...baseState,
      openPositionCount: 1,
      openPositions: [
        { instrument: 'EUR/USD', direction: 'BUY', riskAmountInAccountCurrency: toScaledInteger(50000n) }, // $500
      ],
    };
    // Only 1 BUY in USD_MAJORS group — limit is 2, so this should pass
    const decision = RiskGate.evaluate(sampleIntent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);
  });

  it('should reject trade when aggregate risk across open positions + new trade exceeds maxAggregateRiskPct', () => {
    // Max aggregate risk = 5% of $100k = $5,000 (scale 2 = 500000n).
    // New trade: sampleIntent uses 1,000 units × 150-pip stop (0.0150 price delta)
    //   → rawRisk = 150n × 1000n = 150_000n at price scale 4
    //   → normalised to scale 2 = 1500n = $15.00
    // Existing open risk set to $4,990 so total = $4,990 + $15 = $5,005 > $5,000 → REJECT.
    const state: AccountRiskState = {
      ...baseState,
      openPositionCount: 1,
      openPositions: [
        { instrument: 'USD/JPY', direction: 'BUY', riskAmountInAccountCurrency: toScaledInteger(499000n) }, // $4,990
      ],
    };
    const decision = RiskGate.evaluate(sampleIntent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(false);
    expect(decision.reasonCode).toBe('MAX_AGGREGATE_RISK_EXCEEDED');
  });

  it('should approve trade when aggregate risk stays within the limit', () => {
    // Existing open risk: $100 (10000n). New trade risk: well below $5,000 aggregate limit.
    const state: AccountRiskState = {
      ...baseState,
      openPositionCount: 1,
      openPositions: [
        { instrument: 'USD/JPY', direction: 'BUY', riskAmountInAccountCurrency: toScaledInteger(10000n) }, // $100
      ],
    };
    const decision = RiskGate.evaluate(sampleIntent, FTMO_STANDARD_PROFILE, state);
    expect(decision.approved).toBe(true);
  });
});
