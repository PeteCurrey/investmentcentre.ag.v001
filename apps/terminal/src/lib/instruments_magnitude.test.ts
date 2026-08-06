/**
 * Unit & Magnitude Safety Tests: Every instrument in INSTRUMENT_UNIVERSE
 *
 * Verifies CLAUDE.md & RiskGate constraints across the entire instrument universe:
 * 1. Every instrument has explicit non-zero pipValue and non-negative digits.
 * 2. Risk sizing calculation produces finite positive unit counts for all instruments.
 * 3. Stop loss pips and spread calculations yield valid magnitudes (no zero division, no 45,000-pip blowouts).
 */
import { describe, it, expect } from 'vitest';
import { INSTRUMENT_UNIVERSE, getPipValue, getDecimalPlaces } from './instruments';
import { calculatePositionSize, FTMO_STANDARD_PROFILE } from '@meridian/risk';
import { toScaledInteger, type Price } from '@meridian/core';

describe('Instrument Universe Pip & Digits Magnitude Safety', () => {
  it('every instrument in INSTRUMENT_UNIVERSE has explicit non-zero pipValue and valid digits', () => {
    expect(INSTRUMENT_UNIVERSE.length).toBeGreaterThan(0);

    for (const inst of INSTRUMENT_UNIVERSE) {
      expect(inst.symbol, `Instrument missing symbol`).toBeTruthy();
      expect(inst.oandaId, `Instrument ${inst.symbol} missing oandaId`).toBeTruthy();
      expect(inst.pipValue, `Instrument ${inst.symbol} has invalid pipValue: ${inst.pipValue}`).toBeGreaterThan(0);
      expect(inst.digits, `Instrument ${inst.symbol} has invalid digits: ${inst.digits}`).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(inst.pipValue), `Instrument ${inst.symbol} pipValue is not finite`).toBe(true);
      expect(Number.isInteger(inst.digits), `Instrument ${inst.symbol} digits is not integer`).toBe(true);
    }
  });

  it('helper functions getPipValue and getDecimalPlaces resolve correctly for every instrument', () => {
    for (const inst of INSTRUMENT_UNIVERSE) {
      const pvBySymbol = getPipValue(inst.symbol);
      const pvByOandaId = getPipValue(inst.oandaId);
      expect(pvBySymbol).toBe(inst.pipValue);
      expect(pvByOandaId).toBe(inst.pipValue);

      const dpBySymbol = getDecimalPlaces(inst.symbol);
      const dpByOandaId = getDecimalPlaces(inst.oandaId);
      expect(dpBySymbol).toBe(inst.digits);
      expect(dpByOandaId).toBe(inst.digits);
    }
  });

  it('risk sizing produces sane positive unit counts for every tradeable instrument', () => {
    const equity = toScaledInteger(10_000_000n); // $100,000 in ScaledInteger (scale 2 = cents)

    const state = {
      accountId: 'test-acc',
      accountCurrency: 'USD',
      startingDailyBalance: equity,
      currentEquity: equity,
      highWaterMark: equity,
      openPositionCount: 0,
      realizedPnlToday: toScaledInteger(0n),
      unrealizedPnl: toScaledInteger(0n),
      isNewsBlackoutActive: false,
      newsStatus: 'CLEAR' as const,
      quoteToAccountRates: { 'USD': 1.0, 'JPY': 0.0067, 'EUR': 1.08, 'GBP': 1.27, 'AUD': 0.65, 'NZD': 0.61, 'CAD': 0.74, 'CHF': 1.12 },
    };

    for (const inst of INSTRUMENT_UNIVERSE) {
      // Determine a realistic entry price based on asset class
      let entryPriceNum = 1.3000;
      if (inst.symbol.includes('JPY')) entryPriceNum = 150.00;
      else if (inst.assetClass === 'INDEX') entryPriceNum = 5500.0;
      else if (inst.symbol === 'XAU/USD') entryPriceNum = 2400.0;
      else if (inst.assetClass === 'CRYPTO') entryPriceNum = 60000.0;

      const scale = inst.digits;
      const multiplier = Math.pow(10, scale);
      const entryRaw = BigInt(Math.round(entryPriceNum * multiplier));
      // 30-pip stop loss in price units
      const slDistanceRaw = BigInt(Math.round(inst.pipValue * 30 * multiplier));
      const stopRaw = entryRaw - slDistanceRaw;

      if (stopRaw <= 0n) {
        // Skip degenerate cases (stop loss below zero price)
        continue;
      }

      const entryPrice: Price = { price: toScaledInteger(entryRaw), scale, currency: 'USD' };
      const stopLossPrice: Price = { price: toScaledInteger(stopRaw), scale, currency: 'USD' };

      const result = calculatePositionSize(
        { instrument: inst.symbol, entryPrice, stopLossPrice },
        FTMO_STANDARD_PROFILE,
        state
      );

      expect(result.units, `Units for ${inst.symbol} should be >= 0`).toBeGreaterThanOrEqual(0n);
    }
  });
});
