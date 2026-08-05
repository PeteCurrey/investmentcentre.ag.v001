/**
 * packages/signals/src/types.ts
 *
 * Typed contracts for Signal generation.
 *
 * RULE: Every Signal must cite its inputs by observation ID (CLAUDE.md Rule 6).
 * A claim that cannot cite its evidence does not render.
 */

export interface ObservationInput {
  /** Deterministic ID scoped to the data source + instrument + bar timestamp.
   *  Format: obs_{source}_{instrument}_{granularity}_{unixTs}_{metric}
   *  e.g.: obs_oanda_candles_GBPUSD_H1_1722891600_EMA9 */
  id: string;
  source: 'OANDA_CANDLES_V3';
  metric: string;
  value: string;
  timestamp: string; // ISO-8601 of the observation's bar close
}

export type SignalStrategy = 'DUAL_EMA_CROSS' | 'DONCHIAN_BREAKOUT' | 'MULTI_TIMEFRAME_CONSENSUS';

export interface Signal {
  instrument: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number; // 0..100
  strategy: SignalStrategy;
  /** ATR-derived stop distance in pips (e.g. ATR14 × 1.5) */
  suggestedStopPips: number;
  /** ATR-derived take profit distance in pips (e.g. ATR14 × 3.0) */
  suggestedTpPips: number;
  /** Full citation of every observation that produced this signal — Rule 6 */
  inputs: ObservationInput[];
  generatedAt: string; // ISO-8601
}

export interface OHLCBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
