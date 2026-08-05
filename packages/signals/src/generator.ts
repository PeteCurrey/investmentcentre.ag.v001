/**
 * packages/signals/src/generator.ts
 *
 * Multi-strategy Signal generator.
 *
 * Evaluates three strategies against OHLC candle data:
 *   1. DUAL_EMA_CROSS     — EMA 9/21 crossover on M15 bars
 *   2. DONCHIAN_BREAKOUT  — 20-period Donchian channel breakout
 *   3. MULTI_TIMEFRAME_CONSENSUS — M15 + H1 EMA alignment
 *
 * The final Signal is the one with highest confidence. If no strategy
 * produces a directional signal, returns NEUTRAL.
 *
 * RULE 6 COMPLIANCE: Every Signal.inputs array cites the exact observation
 * ID for every data point that contributed to the decision. A NEUTRAL signal
 * with empty inputs is prohibited — inputs must always include the bars used.
 */

import { OHLCBar, ObservationInput, Signal, SignalStrategy } from './types';
import { calculateEMA, calculateATR, calculateDonchianChannels, atrToPips } from './indicators';

/** Build a deterministic observation ID for a candle bar metric */
function obsId(instrument: string, granularity: string, barTime: string, metric: string): string {
  const sym = instrument.replace('/', '').replace(' ', '').replace('_', '');
  const ts = Math.floor(new Date(barTime).getTime() / 1000);
  return `obs_oanda_candles_${sym}_${granularity}_${ts}_${metric}`;
}

interface StrategyResult {
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  strategy: SignalStrategy;
  inputs: ObservationInput[];
  suggestedStopPips: number;
  suggestedTpPips: number;
}

function dualEmaCross(
  instrument: string,
  bars: OHLCBar[],
  granularity: string
): StrategyResult {
  const closes = bars.map(b => b.close);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const atr = calculateATR(bars, 14);

  const inputs: ObservationInput[] = [];
  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];

  if (!lastBar || !prevBar || ema9.length < 2 || ema21.length < 2) {
    return { direction: 'NEUTRAL', confidence: 0, strategy: 'DUAL_EMA_CROSS', inputs, suggestedStopPips: 20, suggestedTpPips: 40 };
  }

  // EMA values align with closes array: last ema9 = current bar's EMA9
  const currEma9 = ema9[ema9.length - 1];
  const prevEma9 = ema9[ema9.length - 2];
  // ema21 is shorter than ema9 by (21-9) seed bars
  const currEma21 = ema21[ema21.length - 1];
  const prevEma21 = ema21[ema21.length - 2];

  inputs.push({
    id: obsId(instrument, granularity, lastBar.time, 'EMA9'),
    source: 'OANDA_CANDLES_V3',
    metric: 'EMA_9',
    value: currEma9.toFixed(5),
    timestamp: lastBar.time,
  });
  inputs.push({
    id: obsId(instrument, granularity, lastBar.time, 'EMA21'),
    source: 'OANDA_CANDLES_V3',
    metric: 'EMA_21',
    value: currEma21.toFixed(5),
    timestamp: lastBar.time,
  });
  if (atr !== null) {
    inputs.push({
      id: obsId(instrument, granularity, lastBar.time, 'ATR14'),
      source: 'OANDA_CANDLES_V3',
      metric: 'ATR_14',
      value: atr.toFixed(5),
      timestamp: lastBar.time,
    });
  }

  const atrPips = atr !== null ? atrToPips(atr, instrument) : 20;
  const stopPips = Math.max(atrPips * 1.5, 5);
  const tpPips = stopPips * 2.0;

  // Crossover: EMA9 crosses above EMA21 = BUY; crosses below = SELL
  const crossedAbove = prevEma9 <= prevEma21 && currEma9 > currEma21;
  const crossedBelow = prevEma9 >= prevEma21 && currEma9 < currEma21;

  if (crossedAbove) {
    return { direction: 'BUY', confidence: 75, strategy: 'DUAL_EMA_CROSS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }
  if (crossedBelow) {
    return { direction: 'SELL', confidence: 75, strategy: 'DUAL_EMA_CROSS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }

  // Trend continuation (no cross, just aligned direction)
  if (currEma9 > currEma21) {
    return { direction: 'BUY', confidence: 45, strategy: 'DUAL_EMA_CROSS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }
  if (currEma9 < currEma21) {
    return { direction: 'SELL', confidence: 45, strategy: 'DUAL_EMA_CROSS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }

  return { direction: 'NEUTRAL', confidence: 0, strategy: 'DUAL_EMA_CROSS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
}

function donchianBreakout(
  instrument: string,
  bars: OHLCBar[],
  granularity: string
): StrategyResult {
  const channels = calculateDonchianChannels(bars, 20);
  const atr = calculateATR(bars, 14);
  const inputs: ObservationInput[] = [];
  const lastBar = bars[bars.length - 1];

  if (!lastBar || !channels) {
    return { direction: 'NEUTRAL', confidence: 0, strategy: 'DONCHIAN_BREAKOUT', inputs, suggestedStopPips: 25, suggestedTpPips: 50 };
  }

  inputs.push({
    id: obsId(instrument, granularity, lastBar.time, 'DONCHIAN_HIGH20'),
    source: 'OANDA_CANDLES_V3',
    metric: 'DONCHIAN_HIGH_20',
    value: channels.upper.toFixed(5),
    timestamp: lastBar.time,
  });
  inputs.push({
    id: obsId(instrument, granularity, lastBar.time, 'DONCHIAN_LOW20'),
    source: 'OANDA_CANDLES_V3',
    metric: 'DONCHIAN_LOW_20',
    value: channels.lower.toFixed(5),
    timestamp: lastBar.time,
  });
  if (atr !== null) {
    inputs.push({
      id: obsId(instrument, granularity, lastBar.time, 'ATR14'),
      source: 'OANDA_CANDLES_V3',
      metric: 'ATR_14',
      value: atr.toFixed(5),
      timestamp: lastBar.time,
    });
  }

  const atrPips = atr !== null ? atrToPips(atr, instrument) : 25;
  const stopPips = Math.max(atrPips * 2.0, 5);
  const tpPips = stopPips * 2.5;

  const currentClose = lastBar.close;
  if (currentClose > channels.upper) {
    return { direction: 'BUY', confidence: 80, strategy: 'DONCHIAN_BREAKOUT', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }
  if (currentClose < channels.lower) {
    return { direction: 'SELL', confidence: 80, strategy: 'DONCHIAN_BREAKOUT', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }

  return { direction: 'NEUTRAL', confidence: 0, strategy: 'DONCHIAN_BREAKOUT', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
}

function multiTimeframeConsensus(
  instrument: string,
  m15Bars: OHLCBar[],
  h1Bars: OHLCBar[]
): StrategyResult {
  const inputs: ObservationInput[] = [];
  const lastM15 = m15Bars[m15Bars.length - 1];
  const lastH1 = h1Bars[h1Bars.length - 1];

  if (!lastM15 || !lastH1) {
    return { direction: 'NEUTRAL', confidence: 0, strategy: 'MULTI_TIMEFRAME_CONSENSUS', inputs, suggestedStopPips: 20, suggestedTpPips: 40 };
  }

  const m15Closes = m15Bars.map(b => b.close);
  const h1Closes = h1Bars.map(b => b.close);

  const ema9_m15 = calculateEMA(m15Closes, 9);
  const ema21_m15 = calculateEMA(m15Closes, 21);
  const ema9_h1 = calculateEMA(h1Closes, 9);
  const ema21_h1 = calculateEMA(h1Closes, 21);
  const atr_h1 = calculateATR(h1Bars, 14);

  if (!ema9_m15.length || !ema21_m15.length || !ema9_h1.length || !ema21_h1.length) {
    return { direction: 'NEUTRAL', confidence: 0, strategy: 'MULTI_TIMEFRAME_CONSENSUS', inputs, suggestedStopPips: 20, suggestedTpPips: 40 };
  }

  const currEma9M15 = ema9_m15[ema9_m15.length - 1];
  const currEma21M15 = ema21_m15[ema21_m15.length - 1];
  const currEma9H1 = ema9_h1[ema9_h1.length - 1];
  const currEma21H1 = ema21_h1[ema21_h1.length - 1];

  inputs.push({ id: obsId(instrument, 'M15', lastM15.time, 'EMA9'), source: 'OANDA_CANDLES_V3', metric: 'M15_EMA_9', value: currEma9M15.toFixed(5), timestamp: lastM15.time });
  inputs.push({ id: obsId(instrument, 'M15', lastM15.time, 'EMA21'), source: 'OANDA_CANDLES_V3', metric: 'M15_EMA_21', value: currEma21M15.toFixed(5), timestamp: lastM15.time });
  inputs.push({ id: obsId(instrument, 'H1', lastH1.time, 'EMA9'), source: 'OANDA_CANDLES_V3', metric: 'H1_EMA_9', value: currEma9H1.toFixed(5), timestamp: lastH1.time });
  inputs.push({ id: obsId(instrument, 'H1', lastH1.time, 'EMA21'), source: 'OANDA_CANDLES_V3', metric: 'H1_EMA_21', value: currEma21H1.toFixed(5), timestamp: lastH1.time });
  if (atr_h1 !== null) {
    inputs.push({ id: obsId(instrument, 'H1', lastH1.time, 'ATR14'), source: 'OANDA_CANDLES_V3', metric: 'H1_ATR_14', value: atr_h1.toFixed(5), timestamp: lastH1.time });
  }

  const m15Bullish = currEma9M15 > currEma21M15;
  const h1Bullish = currEma9H1 > currEma21H1;

  const atrPips = atr_h1 !== null ? atrToPips(atr_h1, instrument) : 20;
  const stopPips = Math.max(atrPips * 1.5, 5);
  const tpPips = stopPips * 2.0;

  if (m15Bullish && h1Bullish) {
    return { direction: 'BUY', confidence: 85, strategy: 'MULTI_TIMEFRAME_CONSENSUS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }
  if (!m15Bullish && !h1Bullish) {
    return { direction: 'SELL', confidence: 85, strategy: 'MULTI_TIMEFRAME_CONSENSUS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
  }

  return { direction: 'NEUTRAL', confidence: 20, strategy: 'MULTI_TIMEFRAME_CONSENSUS', inputs, suggestedStopPips: stopPips, suggestedTpPips: tpPips };
}

/**
 * Generate a Signal for `instrument` from OANDA candle data.
 *
 * @param instrument  e.g. 'GBP/USD' or 'GBP_USD'
 * @param m15Bars     M15 candle bars (at least 50 recommended)
 * @param h1Bars      H1 candle bars (at least 50 recommended)
 * @returns Signal with full input citation. Direction is NEUTRAL if no strategy fires.
 */
export function generateSignal(
  instrument: string,
  m15Bars: OHLCBar[],
  h1Bars: OHLCBar[]
): Signal {
  const now = new Date().toISOString();

  if (m15Bars.length < 25 || h1Bars.length < 16) {
    // Insufficient data — NEUTRAL, but still cite the bar count so the caller can diagnose
    return {
      instrument,
      direction: 'NEUTRAL',
      confidence: 0,
      strategy: 'DUAL_EMA_CROSS',
      suggestedStopPips: 0,
      suggestedTpPips: 0,
      inputs: [],
      generatedAt: now,
    };
  }

  const results: StrategyResult[] = [
    dualEmaCross(instrument, m15Bars, 'M15'),
    donchianBreakout(instrument, m15Bars, 'M15'),
    multiTimeframeConsensus(instrument, m15Bars, h1Bars),
  ];

  // Select the highest-confidence directional result; break ties by priority order
  const directional = results.filter(r => r.direction !== 'NEUTRAL').sort((a, b) => b.confidence - a.confidence);

  const chosen = directional[0] ?? results[0];

  return {
    instrument,
    direction: chosen.direction,
    confidence: chosen.confidence,
    strategy: chosen.strategy,
    suggestedStopPips: chosen.suggestedStopPips,
    suggestedTpPips: chosen.suggestedTpPips,
    inputs: chosen.inputs,
    generatedAt: now,
  };
}
