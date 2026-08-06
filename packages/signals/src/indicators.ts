/**
 * packages/signals/src/indicators.ts
 *
 * Pure mathematical indicator functions.
 * All functions are stateless and deterministic given the same input arrays.
 */

import { OHLCBar } from './types';

/**
 * Exponential Moving Average (EMA) over `period` bars.
 * Returns the EMA for every bar from period-1 onwards.
 * Returns [] if insufficient data.
 */
export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];

  // Seed with SMA of first `period` closes
  const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(seed);

  for (let i = period; i < closes.length; i++) {
    result.push(closes[i] * k + result[result.length - 1] * (1 - k));
  }

  return result;
}

/**
 * Average True Range (ATR) over `period` bars.
 * Returns the ATR value for the most recent bar (single float), or null if insufficient data.
 */
export function calculateATR(bars: OHLCBar[], period: number = 14): number | null {
  if (bars.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const highLow = bars[i].high - bars[i].low;
    const highPrevClose = Math.abs(bars[i].high - bars[i - 1].close);
    const lowPrevClose = Math.abs(bars[i].low - bars[i - 1].close);
    trueRanges.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  // Wilder's smoothed ATR: seed with simple average of first `period` TRs
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

/**
 * Donchian Channels over `period` bars (excluding current bar).
 * Returns the highest high and lowest low over the lookback window.
 */
export function calculateDonchianChannels(
  bars: OHLCBar[],
  period: number = 20
): { upper: number; lower: number } | null {
  // Exclude the current (last) bar — channels are based on closed bars
  const lookback = bars.slice(-(period + 1), -1);
  if (lookback.length < period) return null;

  const upper = Math.max(...lookback.map(b => b.high));
  const lower = Math.min(...lookback.map(b => b.low));
  return { upper, lower };
}

import { getPipValue } from '@meridian/core';

/**
 * Convert ATR value (in price terms) to pips for a given instrument using authoritative getPipValue lookup.
 */
export function atrToPips(atr: number, instrument: string): number {
  return atr / getPipValue(instrument);
}

