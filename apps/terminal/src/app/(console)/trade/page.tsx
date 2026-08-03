'use client';

import React, { useState, useCallback, useEffect } from 'react';
import TradingViewChart from '../../../components/TradingViewChart';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Instrument {
  symbol: string;
  tvSymbol: string;
  price: string;
  change: string;
  spread: string;
  oandaId: string;
  digits: number;
}

interface OrderLog {
  id: string;
  timestamp: string;
  type: 'AUTO' | 'MANUAL';
  instrument: string;
  direction: 'BUY' | 'SELL';
  units: string;
  fillPrice: string;
  status: 'FILLED' | 'SUBMITTED' | 'REJECTED';
  orderId: string;
  tier: string;
}

interface AiAnalysis {
  rating: string;
  rrRatio: string;
  rsiContext: string;
  macdContext: string;
  bbContext: string;
  consensusScore: string;
  keyRisk: string;
  summary: string;
}

// ─── Instrument Catalogue ────────────────────────────────────────────────────
// Static metadata for supported instruments. Prices, 24h changes, and spreads default to '—'
// as live spot polling is managed via the TradingView engine / live broker feed.
const INSTRUMENTS: Instrument[] = [
  { symbol: 'GBP/USD', tvSymbol: 'OANDA:GBPUSD', price: '—', change: '—', spread: '—', oandaId: 'GBP_USD', digits: 5 },
  { symbol: 'EUR/USD', tvSymbol: 'OANDA:EURUSD', price: '—', change: '—', spread: '—', oandaId: 'EUR_USD', digits: 5 },
  { symbol: 'USD/JPY', tvSymbol: 'OANDA:USDJPY', price: '—', change: '—', spread: '—', oandaId: 'USD_JPY', digits: 3 },
  { symbol: 'EUR/GBP', tvSymbol: 'OANDA:EURGBP', price: '—', change: '—', spread: '—', oandaId: 'EUR_GBP', digits: 5 },
  { symbol: 'WTI Oil', tvSymbol: 'TVC:USOIL', price: '—', change: '—', spread: '—', oandaId: 'BCO_USD', digits: 2 },
  { symbol: 'SPX 500', tvSymbol: 'FOREXCOM:SPXUSD', price: '—', change: '—', spread: '—', oandaId: 'SPX500_USD', digits: 1 },
  { symbol: 'BTC/USD', tvSymbol: 'COINBASE:BTCUSD', price: '—', change: '—', spread: '—', oandaId: 'BTC_USD', digits: 2 },
  { symbol: 'XAU/USD', tvSymbol: 'OANDA:XAUUSD', price: '—', change: '—', spread: '—', oandaId: 'XAU_USD', digits: 2 },
];

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ratingColor = (r: string) => {
  if (r.includes('HIGH CONVICTION BUY')) return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
  if (r.includes('MODERATE BUY')) return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
  if (r.includes('HIGH CONVICTION SELL')) return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
  if (r.includes('MODERATE SELL')) return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
  if (r.includes('CAUTION') || r.includes('AVOID')) return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
  return { bg: '#F7F7F5', text: '#6B7280', border: '#E4E4DF' };
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TradePage() {
  const [instruments, setInstruments] = useState<Instrument[]>(INSTRUMENTS);
  const [selectedSymbol, setSelectedSymbol] = useState('GBP/USD');

  const inst = instruments.find(i => i.symbol === selectedSymbol) || instruments[0];

  const [timeframe, setTimeframe] = useState('15');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [units, setUnits] = useState('10000');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');

  const [executing, setExecuting] = useState(false);
  const [execMsg, setExecMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [logs, setLogs] = useState<OrderLog[]>([]);

  useEffect(() => {
    // 1. Fetch live prices for all 8 instruments
    fetch('/api/prices')
      .then(res => res.json())
      .then(data => {
        if (data && data.prices) {
          setInstruments(prevList => {
            return prevList.map(i => {
              if (data.prices[i.symbol]) {
                return {
                  ...i,
                  price: data.prices[i.symbol].price,
                  change: data.prices[i.symbol].change,
                  spread: i.spread === '—' ? '1.2' : i.spread,
                };
              }
              return i;
            });
          });
        }
      })
      .catch(() => {});

    // 2. Fetch persistent execution logs (Auto + Manual)
    fetch('/api/trade')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.trades) {
          setLogs(data.trades);
        }
      })
      .catch(() => {});
  }, []);

  // ── Handlers ──

  const handleSelectInstrument = useCallback((i: Instrument) => {
    setSelectedSymbol(i.symbol);
    setExecMsg(null);
  }, []);

  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setExecMsg(null);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: inst.symbol,
          direction,
          units,
          stopLoss,
          takeProfit,
          orderType,
          limitPrice,
          currentPrice: inst.price === '—' ? undefined : inst.price,
        }),
      });
      const data = await res.json() as { error?: string; fillPrice?: string; orderId?: string; success?: boolean };
      if (!res.ok || data.error) {
        setExecMsg({ ok: false, text: data.error || 'Execution failed' });
      } else {
        const fillPriceVal = data.fillPrice || 'MARKET';
        const orderIdVal = data.orderId || 'UNASSIGNED';
        const newLog: OrderLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          type: 'MANUAL',
          instrument: inst.symbol,
          direction,
          units: Number(units).toLocaleString(),
          fillPrice: fillPriceVal,
          status: 'FILLED',
          orderId: orderIdVal,
          tier: 'MANUAL DESK',
        };
        setLogs(prev => [newLog, ...prev]);
        setExecMsg({ ok: true, text: `ORDER FILLED — ${direction} ${Number(units).toLocaleString()} ${inst.symbol} @ ${fillPriceVal} | ID: ${orderIdVal}` });
      }
    } catch (e: any) {
      setExecMsg({ ok: false, text: `Network error: ${e.message}` });
    } finally {
      setExecuting(false);
    }
  }, [inst, direction, units, stopLoss, takeProfit, orderType, limitPrice]);

  const handleAnalyse = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/trade-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: inst.symbol,
          direction,
          units,
          stopLoss,
          takeProfit,
          timeframe,
          currentPrice: inst.price,
        }),
      });
      const data = await res.json() as { error?: string; success?: boolean; analysis?: AiAnalysis };
      if (!res.ok || data.error) {
        setAiError(data.error || 'Analysis failed');
      } else {
        setAiAnalysis(data.analysis || null);
      }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }, [inst, direction, units, stopLoss, takeProfit, timeframe]);

  const aColor = aiAnalysis ? ratingColor(aiAnalysis.rating) : null;
  // FAIL-CLOSED: Tier 4 execution is only active when NEXT_PUBLIC_TIER_4_ENABLED is explicitly 'true'.
  // Any other value (absent, 'false', misspelled) correctly maps to disabled/observe mode.
  const tier4Active = process.env.NEXT_PUBLIC_TIER_4_ENABLED === 'true';

  // ── Render ──

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: '"DM Mono", monospace', color: '#14181B' }}>

      {/* Page Header */}
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', letterSpacing: '1.5px' }}>
            TRADING DESK — OANDA v20 INTEGRATED — TRADINGVIEW TECHNICAL ENGINE
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-0.5px', margin: 0, color: '#14181B' }}>
            Trade
          </h1>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '10px',
          padding: '4px 10px',
          border: `1px solid ${tier4Active ? '#86EFAC' : '#FCA5A5'}`,
          backgroundColor: tier4Active ? '#F0FDF4' : '#FEF2F2',
          color: tier4Active ? '#166534' : '#991B1B',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block',
            backgroundColor: tier4Active ? '#22C55E' : '#EF4444',
            boxShadow: tier4Active ? '0 0 6px #22C55E' : 'none',
          }} />
          {tier4Active ? 'LIVE EXECUTION — TIER 4 ACTIVE' : 'OBSERVE MODE — TIER 4 DISABLED'}
        </div>
      </div>

      {/* Instrument Selector */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {instruments.map(i => {
          const selected = i.symbol === inst.symbol;
          const up = i.change.startsWith('+');
          return (
            <button
              key={i.symbol}
              onClick={() => handleSelectInstrument(i)}
              style={{
                padding: '6px 12px',
                backgroundColor: selected ? '#1C3A5E' : '#FFFFFF',
                color: selected ? '#FFFFFF' : '#14181B',
                border: `1px solid ${selected ? '#1C3A5E' : '#E4E4DF'}`,
                cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minWidth: '72px',
              }}
            >
              <span style={{ fontWeight: 600 }}>{i.symbol}</span>
              <span style={{ fontSize: '9px', color: selected ? '#C8F135' : (up ? '#16A34A' : '#DC2626') }}>
                {i.price} <span>{i.change}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Ticker Detail Strip */}
      <div style={{
        border: '1px solid #E4E4DF',
        backgroundColor: '#F7F7F5',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span><span style={{ color: '#6B7280' }}>PAIR </span><span style={{ fontWeight: 600, color: '#1C3A5E' }}>{inst.symbol}</span></span>
          <span><span style={{ color: '#6B7280' }}>SPOT </span><span style={{ fontWeight: 600 }}>{inst.price}</span></span>
          <span><span style={{ color: '#6B7280' }}>24H </span><span style={{ fontWeight: 600, color: inst.change.startsWith('+') ? '#16A34A' : '#DC2626' }}>{inst.change}</span></span>
          <span><span style={{ color: '#6B7280' }}>SPREAD </span><span style={{ fontWeight: 600 }}>{inst.spread} pips</span></span>
          <span><span style={{ color: '#6B7280' }}>OANDA ID </span><span style={{ color: '#1C3A5E' }}>{inst.oandaId}</span></span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ color: '#6B7280', marginRight: '4px' }}>TF:</span>
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              style={{
                padding: '2px 7px',
                backgroundColor: timeframe === tf.value ? '#1C3A5E' : '#FFFFFF',
                color: timeframe === tf.value ? '#FFFFFF' : '#6B7280',
                border: '1px solid #E4E4DF',
                fontSize: '9px',
                cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
              }}
            >{tf.label}</button>
          ))}
        </div>
      </div>

      {/* Main Workspace: Chart + Right Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>

        {/* Chart */}
        <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#0A0D12', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            padding: '8px 14px',
            fontSize: '10px',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#94A3B8' }}>TRADINGVIEW ENGINE // <span style={{ color: '#E2E8F0' }}>{inst.tvSymbol}</span></span>
            <span style={{ color: '#C8F135', fontSize: '9px' }}>RSI · MACD · BB · EMA · SMA · STOCH · ATR · VWAP</span>
          </div>
          <TradingViewChart
            symbol={inst.tvSymbol}
            interval={timeframe}
            theme="dark"
            height={560}
            showSidebar
          />
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Order Type Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {(['MARKET', 'LIMIT'] as const).map(ot => (
              <button
                key={ot}
                onClick={() => setOrderType(ot)}
                style={{
                  padding: '6px',
                  backgroundColor: orderType === ot ? '#1C3A5E' : '#F7F7F5',
                  color: orderType === ot ? '#FFFFFF' : '#6B7280',
                  border: `1px solid ${orderType === ot ? '#1C3A5E' : '#E4E4DF'}`,
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontFamily: '"DM Mono", monospace',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >{ot} ORDER</button>
            ))}
          </div>

          {/* Direction Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              onClick={() => setDirection('BUY')}
              style={{
                padding: '10px',
                backgroundColor: direction === 'BUY' ? '#DCFCE7' : '#F7F7F5',
                color: direction === 'BUY' ? '#166534' : '#6B7280',
                border: `1px solid ${direction === 'BUY' ? '#86EFAC' : '#E4E4DF'}`,
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
                fontWeight: 700,
              }}
            >▲ BUY</button>
            <button
              onClick={() => setDirection('SELL')}
              style={{
                padding: '10px',
                backgroundColor: direction === 'SELL' ? '#FEE2E2' : '#F7F7F5',
                color: direction === 'SELL' ? '#991B1B' : '#6B7280',
                border: `1px solid ${direction === 'SELL' ? '#FCA5A5' : '#E4E4DF'}`,
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
                fontWeight: 700,
              }}
            >▼ SELL</button>
          </div>

          {/* Order Desk */}
          <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: '#1C3A5E', fontWeight: 600, borderBottom: '1px solid #E4E4DF', paddingBottom: '8px', marginBottom: '10px', letterSpacing: '0.5px' }}>
              ORDER PARAMETERS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
              <div>
                <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>UNITS / VOLUME</label>
                <input
                  type="text" value={units} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnits((e.target as HTMLInputElement).value)}
                  style={{ width: '100%', padding: '7px 8px', border: '1px solid #E4E4DF', fontFamily: '"DM Mono", monospace', fontSize: '11px', boxSizing: 'border-box', color: '#14181B' }}
                />
              </div>

              {orderType === 'LIMIT' && (
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>LIMIT PRICE</label>
                  <input
                    type="text" value={limitPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLimitPrice((e.target as HTMLInputElement).value)}
                    placeholder={inst.price}
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #1C3A5E', fontFamily: '"DM Mono", monospace', fontSize: '11px', boxSizing: 'border-box', color: '#14181B' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>STOP LOSS</label>
                  <input
                    type="text" value={stopLoss} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStopLoss((e.target as HTMLInputElement).value)}
                    placeholder="Optional (e.g. 1.3050)"
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #FCA5A5', fontFamily: '"DM Mono", monospace', fontSize: '11px', boxSizing: 'border-box', color: '#991B1B' }}
                  />
                </div>
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>TAKE PROFIT</label>
                  <input
                    type="text" value={takeProfit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTakeProfit((e.target as HTMLInputElement).value)}
                    placeholder="Optional (e.g. 1.3250)"
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #86EFAC', fontFamily: '"DM Mono", monospace', fontSize: '11px', boxSizing: 'border-box', color: '#166534' }}
                  />
                </div>
              </div>
            </div>

            {/* Execution Feedback */}
            {execMsg && (
              <div style={{
                marginTop: '10px',
                padding: '8px',
                backgroundColor: execMsg.ok ? '#DCFCE7' : '#FEE2E2',
                border: `1px solid ${execMsg.ok ? '#86EFAC' : '#FCA5A5'}`,
                color: execMsg.ok ? '#166534' : '#991B1B',
                fontSize: '9px',
                lineHeight: '1.5',
              }}>
                {execMsg.text}
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={executing}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '11px',
                backgroundColor: direction === 'BUY' ? '#166534' : '#991B1B',
                color: '#FFFFFF',
                border: 'none',
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1px',
                cursor: executing ? 'wait' : 'pointer',
                opacity: executing ? 0.7 : 1,
              }}
            >
              {executing ? 'ROUTING VIA RISK GATE...' : `SUBMIT ${direction} TO OANDA →`}
            </button>
          </div>

          {/* AI Co-Pilot */}
          <div style={{ border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#F8FAFC', padding: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#C8F135', letterSpacing: '0.5px' }}>AI CO-PILOT</div>
              <button
                onClick={handleAnalyse}
                disabled={aiLoading}
                style={{
                  padding: '3px 8px',
                  backgroundColor: '#1E293B',
                  color: aiLoading ? '#6B7280' : '#C8F135',
                  border: '1px solid #334155',
                  fontSize: '9px',
                  fontFamily: '"DM Mono", monospace',
                  cursor: aiLoading ? 'wait' : 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                {aiLoading ? 'ANALYSING...' : 'RUN ANALYSIS →'}
              </button>
            </div>

            {aiError && (
              <div style={{ fontSize: '9px', color: '#F87171', marginBottom: '8px' }}>{aiError}</div>
            )}

            {aiAnalysis && aColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
                {/* Rating Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: aColor.bg,
                    color: aColor.text,
                    border: `1px solid ${aColor.border}`,
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}>
                    {aiAnalysis.rating}
                  </span>
                  <span style={{ color: '#94A3B8', fontSize: '9px' }}>R:R {aiAnalysis.rrRatio}</span>
                </div>

                {/* Indicator Readout */}
                <div style={{
                  backgroundColor: '#0A0D12',
                  border: '1px solid #1E293B',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '9px',
                  color: '#CBD5E1',
                }}>
                  <div>RSI: <span style={{ color: '#C8F135' }}>{aiAnalysis.rsiContext}</span></div>
                  <div>MACD: <span style={{ color: '#C8F135' }}>{aiAnalysis.macdContext}</span></div>
                  <div>BB: <span style={{ color: '#C8F135' }}>{aiAnalysis.bbContext}</span></div>
                  <div style={{ marginTop: '2px', color: '#FCD34D' }}>RISK: <span style={{ color: '#FCA5A5' }}>{aiAnalysis.keyRisk}</span></div>
                  <div style={{ color: '#94A3B8' }}>CONSENSUS: <span style={{ color: '#C8F135' }}>{aiAnalysis.consensusScore}</span></div>
                </div>

                {/* Summary */}
                <p style={{ fontSize: '10px', color: '#94A3B8', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                  "{aiAnalysis.summary}"
                </p>
              </div>
            )}

            {!aiAnalysis && !aiLoading && (
              <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center', padding: '16px 0' }}>
                Configure your trade parameters then click RUN ANALYSIS for AI co-pilot evaluation.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Log Table */}
      <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF' }}>
        <div style={{
          backgroundColor: '#F7F7F5',
          padding: '10px 16px',
          fontSize: '10px',
          fontWeight: 700,
          borderBottom: '1px solid #E4E4DF',
          color: '#1C3A5E',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          letterSpacing: '0.5px',
        }}>
          <span>EXECUTION LOG — AUTO + MANUAL TRADES</span>
          <span style={{ fontSize: '9px', color: '#6B7280', fontWeight: 400 }}>OANDA v20 REST API</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: '"DM Mono", monospace' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4DF', textAlign: 'left', color: '#6B7280' }}>
              {['TIMESTAMP', 'SOURCE', 'INSTRUMENT', 'DIRECTION', 'UNITS', 'FILL PRICE', 'ORDER ID', 'STATUS'].map(h => (
                <th key={h} style={{ padding: '8px 14px', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '16px 14px', color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
                  NO EXECUTIONS RECORDED IN CURRENT SESSION
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #F0F0EC' }}>
                  <td style={{ padding: '9px 14px', color: '#6B7280' }}>{log.timestamp}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      padding: '1px 6px',
                      backgroundColor: log.type === 'AUTO' ? '#1C3A5E' : '#F7F7F5',
                      color: log.type === 'AUTO' ? '#C8F135' : '#14181B',
                      fontSize: '8px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}>{log.tier}</span>
                  </td>
                  <td style={{ padding: '9px 14px', fontWeight: 600 }}>{log.instrument}</td>
                  <td style={{ padding: '9px 14px', fontWeight: 700, color: log.direction === 'BUY' ? '#16A34A' : '#DC2626' }}>{log.direction}</td>
                  <td style={{ padding: '9px 14px' }}>{log.units}</td>
                  <td style={{ padding: '9px 14px' }}>{log.fillPrice}</td>
                  <td style={{ padding: '9px 14px', color: '#6B7280', fontSize: '9px' }}>{log.orderId}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      padding: '1px 6px',
                      backgroundColor: log.status === 'FILLED' ? '#DCFCE7' : '#FEF3C7',
                      color: log.status === 'FILLED' ? '#166534' : '#92400E',
                      border: `1px solid ${log.status === 'FILLED' ? '#86EFAC' : '#FCD34D'}`,
                      fontSize: '8px',
                      fontWeight: 700,
                    }}>{log.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
