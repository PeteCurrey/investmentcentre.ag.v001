'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import TradingViewChart from '../../../components/TradingViewChart';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Instrument {
  symbol: string; tvSymbol: string; price: string; change: string;
  spread: string; oandaId: string; digits: number;
}

interface ExecLogEntry {
  id: string; timestamp: string; type: 'AUTO' | 'MANUAL';
  instrument: string; direction: 'BUY' | 'SELL';
  units: string; fillPrice: string; closePrice?: string;
  pnl?: string; pnlSign?: string; pnlPositive?: boolean;
  status: string; orderId: string; tier: string;
  signal?: string | null;
  closedAt?: string;
}

interface Position {
  id: string; instrument: string; direction: string; units: string;
  entryPrice: string; unrealizedPL: string; pnlSign: string;
  pnlPositive: boolean; openedAt: string; tradeId: string;
  financing: string;
}

interface AccountSummary {
  balance: string; nav: string; unrealizedPL: string;
  pnlPositive: boolean; openTradesCount: number; currency: string;
}

interface AutotraderState {
  enabled: boolean; lastToggled: string; cycleCount: number;
  lastSignal: string | null; lastInstrument: string | null;
  lastDirection: string | null; lastPrice: string | null;
}

interface AiAnalysis {
  rating: string; rrRatio: string; rsiContext: string;
  macdContext: string; bbContext: string; consensusScore: string;
  keyRisk: string; summary: string;
}

// ─── Static Catalogue ─────────────────────────────────────────────────────────

const INSTRUMENTS: Instrument[] = [
  { symbol: 'GBP/USD', tvSymbol: 'OANDA:GBPUSD',    price: '—', change: '—', spread: '—', oandaId: 'GBP_USD',    digits: 5 },
  { symbol: 'EUR/USD', tvSymbol: 'OANDA:EURUSD',    price: '—', change: '—', spread: '—', oandaId: 'EUR_USD',    digits: 5 },
  { symbol: 'USD/JPY', tvSymbol: 'OANDA:USDJPY',    price: '—', change: '—', spread: '—', oandaId: 'USD_JPY',    digits: 3 },
  { symbol: 'EUR/GBP', tvSymbol: 'OANDA:EURGBP',    price: '—', change: '—', spread: '—', oandaId: 'EUR_GBP',    digits: 5 },
  { symbol: 'WTI Oil', tvSymbol: 'TVC:USOIL',       price: '—', change: '—', spread: '—', oandaId: 'BCO_USD',    digits: 2 },
  { symbol: 'SPX 500', tvSymbol: 'FOREXCOM:SPXUSD', price: '—', change: '—', spread: '—', oandaId: 'SPX500_USD', digits: 1 },
  { symbol: 'BTC/USD', tvSymbol: 'COINBASE:BTCUSD', price: '—', change: '—', spread: '—', oandaId: 'BTC_USD',    digits: 2 },
  { symbol: 'XAU/USD', tvSymbol: 'OANDA:XAUUSD',    price: '—', change: '—', spread: '—', oandaId: 'XAU_USD',    digits: 2 },
];

const TIMEFRAMES = [
  { label: '1m', value: '1' }, { label: '5m', value: '5' },
  { label: '15m', value: '15' }, { label: '1H', value: '60' },
  { label: '4H', value: '240' }, { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ratingColor = (r: string) => {
  if (r.includes('HIGH CONVICTION BUY'))  return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
  if (r.includes('MODERATE BUY'))         return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
  if (r.includes('HIGH CONVICTION SELL')) return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
  if (r.includes('MODERATE SELL'))        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
  if (r.includes('CAUTION') || r.includes('AVOID')) return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
  return { bg: '#F7F7F5', text: '#6B7280', border: '#E4E4DF' };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TradePage() {
  // Instrument state
  const [instruments, setInstruments]     = useState<Instrument[]>(INSTRUMENTS);
  const [selectedSymbol, setSelectedSymbol] = useState('XAU/USD');
  const [timeframe, setTimeframe]         = useState('15');

  // Order state
  const [direction, setDirection]         = useState<'BUY' | 'SELL'>('BUY');
  const [units, setUnits]                 = useState('10000');
  const [stopLoss, setStopLoss]           = useState('');
  const [takeProfit, setTakeProfit]       = useState('');
  const [orderType, setOrderType]         = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice]       = useState('');

  // Execution state
  const [executing, setExecuting]         = useState(false);
  const [execMsg, setExecMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  // AI analysis
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiAnalysis, setAiAnalysis]       = useState<AiAnalysis | null>(null);
  const [aiError, setAiError]             = useState<string | null>(null);

  // OANDA live data
  const [positions, setPositions]         = useState<Position[]>([]);
  const [execLog, setExecLog]             = useState<ExecLogEntry[]>([]);
  const [account, setAccount]             = useState<AccountSummary | null>(null);
  const [oandaError, setOandaError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh]     = useState<string>('—');

  // Auto-trader
  const [autotrader, setAutotrader]       = useState<AutotraderState | null>(null);
  const [autoToggling, setAutoToggling]   = useState(false);
  const [countdown, setCountdown]         = useState(60);
  const countdownRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Expanded log row
  const [expandedRow, setExpandedRow]     = useState<string | null>(null);

  const inst = instruments.find(i => i.symbol === selectedSymbol) || instruments[0];
  const tier4Active = process.env.NEXT_PUBLIC_TIER_4_ENABLED === 'true';

  // ── Data fetching ──

  const fetchOandaData = useCallback(async () => {
    try {
      const res = await fetch('/api/oanda-positions');
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions || []);
        setExecLog(data.execLog || []);
        if (data.account) setAccount(data.account);
        setOandaError(null);
      } else {
        setOandaError(data.error || 'OANDA data unavailable');
      }
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e: any) {
      setOandaError(e.message);
    }
  }, []);

  const fetchAutotraderState = useCallback(async () => {
    try {
      const res = await fetch('/api/autotrader');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAutotrader(data);
    } catch {}
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      if (data?.prices) {
        setInstruments(prev => prev.map(i =>
          data.prices[i.symbol]
            ? { ...i, price: data.prices[i.symbol].price, change: data.prices[i.symbol].change, spread: '1.2' }
            : i
        ));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchOandaData();
    fetchAutotraderState();
    const poll = setInterval(() => {
      fetchOandaData();
      fetchPrices();
      fetchAutotraderState();
    }, 30000);
    return () => clearInterval(poll);
  }, [fetchOandaData, fetchPrices, fetchAutotraderState]);

  // Countdown timer when autotrader is enabled
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (autotrader?.enabled) {
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { fetchOandaData(); fetchAutotraderState(); return 60; }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [autotrader?.enabled, fetchOandaData, fetchAutotraderState]);

  // ── Handlers ──

  const handleToggleAutotrader = useCallback(async () => {
    if (!autotrader || autoToggling) return;
    setAutoToggling(true);
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !autotrader.enabled })
      });
      const data = await res.json();
      if (data.success) setAutotrader(data);
    } catch {}
    setAutoToggling(false);
  }, [autotrader, autoToggling]);

  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setExecMsg(null);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: inst.symbol, direction, units, stopLoss, takeProfit,
          orderType, limitPrice,
          currentPrice: inst.price === '—' ? undefined : inst.price,
        }),
      });
      const data = await res.json() as { error?: string; fillPrice?: string; orderId?: string };
      if (!res.ok || data.error) {
        setExecMsg({ ok: false, text: data.error || 'Execution failed' });
      } else {
        setExecMsg({ ok: true, text: `ORDER FILLED — ${direction} ${Number(units).toLocaleString()} ${inst.symbol} @ ${data.fillPrice || 'MARKET'} | ID: ${data.orderId}` });
        setTimeout(() => fetchOandaData(), 2000);
      }
    } catch (e: any) {
      setExecMsg({ ok: false, text: `Network error: ${e.message}` });
    }
    setExecuting(false);
  }, [inst, direction, units, stopLoss, takeProfit, orderType, limitPrice, fetchOandaData]);

  const handleAnalyse = useCallback(async () => {
    setAiLoading(true); setAiError(null);
    try {
      const res = await fetch('/api/trade-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrument: inst.symbol, direction, units, stopLoss, takeProfit, timeframe, currentPrice: inst.price }),
      });
      const data = await res.json() as { error?: string; analysis?: AiAnalysis };
      if (!res.ok || data.error) setAiError(data.error || 'Analysis failed');
      else setAiAnalysis(data.analysis || null);
    } catch (e: any) { setAiError(e.message); }
    setAiLoading(false);
  }, [inst, direction, units, stopLoss, takeProfit, timeframe]);

  const aColor = aiAnalysis ? ratingColor(aiAnalysis.rating) : null;

  // ── Shared styles ──
  const mono: React.CSSProperties = { fontFamily: '"DM Mono", "Fira Mono", monospace' };
  const card: React.CSSProperties = { border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF' };

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', ...mono, color: '#14181B', fontSize: '13px' }}>

      {/* ── Page Header ── */}
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', letterSpacing: '1.5px' }}>
            TRADING DESK — OANDA v20 INTEGRATED — TRADINGVIEW TECHNICAL ENGINE
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-0.5px', margin: 0, color: '#14181B' }}>Trade</h1>
        </div>
        {/* Tier 4 badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '10px',
          padding: '5px 12px', border: `1px solid ${tier4Active ? '#86EFAC' : '#FCA5A5'}`,
          backgroundColor: tier4Active ? '#F0FDF4' : '#FEF2F2',
          color: tier4Active ? '#166534' : '#991B1B',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', backgroundColor: tier4Active ? '#22C55E' : '#EF4444', boxShadow: tier4Active ? '0 0 6px #22C55E' : 'none' }} />
          {tier4Active ? 'LIVE EXECUTION — TIER 4 ACTIVE' : 'OBSERVE MODE — TIER 4 DISABLED'}
        </div>
      </div>

      {/* ── Account Summary Strip ── */}
      {account && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', backgroundColor: '#E4E4DF' }}>
          {[
            { label: 'BALANCE', value: `${account.currency} ${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, positive: true },
            { label: 'NET ASSET VALUE', value: `${account.currency} ${Number(account.nav).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, positive: true },
            { label: 'UNREALIZED P&L', value: `${account.pnlPositive ? '+' : '-'}${account.currency} ${account.unrealizedPL}`, positive: account.pnlPositive },
            { label: 'OPEN TRADES', value: String(account.openTradesCount), positive: true },
            { label: 'ACCOUNT', value: 'PRACTICE', positive: true }
          ].map(({ label, value, positive }) => (
            <div key={label} style={{ backgroundColor: '#FAFAFA', padding: '10px 14px' }}>
              <div style={{ fontSize: '9px', color: '#6B7280', letterSpacing: '1px', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: label === 'UNREALIZED P&L' ? (positive ? '#16A34A' : '#DC2626') : '#14181B' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Auto-Trading Control Panel ── */}
      <div style={{
        border: autotrader?.enabled ? '1px solid #C8F135' : '1px solid #E4E4DF',
        backgroundColor: autotrader?.enabled ? '#0F172A' : '#F7F7F5',
        padding: '14px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: autotrader?.enabled ? '#C8F135' : '#6B7280',
              boxShadow: autotrader?.enabled ? '0 0 10px #C8F135, 0 0 20px rgba(200,241,53,0.4)' : 'none',
              animation: autotrader?.enabled ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: autotrader?.enabled ? '#C8F135' : '#6B7280', letterSpacing: '1px' }}>
              AUTONOMOUS ENGINE: {autotrader?.enabled ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>

          {autotrader?.enabled && (
            <div style={{ fontSize: '10px', color: '#94A3B8', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>
                <span style={{ color: '#64748B' }}>STRATEGY: </span>
                <span style={{ color: '#E2E8F0' }}>Consensus Council Breakout · GBP/USD · FTMO Standard Profile</span>
              </div>
              {autotrader.lastSignal && (
                <div>
                  <span style={{ color: '#64748B' }}>LAST SIGNAL: </span>
                  <span style={{ color: autotrader.lastDirection === 'BUY' ? '#4ADE80' : '#F87171' }}>
                    {autotrader.lastDirection} {autotrader.lastInstrument} @ {autotrader.lastPrice}
                  </span>
                  <span style={{ color: '#64748B' }}> · {autotrader.lastSignal}</span>
                </div>
              )}
              {autotrader.cycleCount > 0 && (
                <div>
                  <span style={{ color: '#64748B' }}>CYCLES EXECUTED: </span>
                  <span style={{ color: '#E2E8F0' }}>{autotrader.cycleCount}</span>
                </div>
              )}
            </div>
          )}

          {!autotrader?.enabled && (
            <div style={{ fontSize: '10px', color: '#6B7280', paddingLeft: '18px' }}>
              Enable to start autonomous position evaluation every 60s · RiskGate enforced · OANDA practice
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {autotrader?.enabled && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#C8F135', lineHeight: 1 }}>{countdown}s</div>
              <div style={{ fontSize: '9px', color: '#64748B', letterSpacing: '1px', marginTop: '2px' }}>NEXT EVAL</div>
            </div>
          )}
          <button
            onClick={handleToggleAutotrader}
            disabled={autoToggling || !autotrader}
            style={{
              padding: '10px 20px',
              backgroundColor: autotrader?.enabled ? '#DC2626' : '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              cursor: autoToggling ? 'wait' : 'pointer',
              fontSize: '11px', fontWeight: 700,
              fontFamily: '"DM Mono", monospace',
              letterSpacing: '1px',
              opacity: autoToggling ? 0.7 : 1,
              transition: 'all 0.2s ease',
              minWidth: '140px'
            }}
          >
            {autoToggling ? '...' : autotrader?.enabled ? '⏹ PAUSE ENGINE' : '▶ START ENGINE'}
          </button>
        </div>
      </div>

      {/* ── Instrument Selector ── */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {instruments.map(i => {
          const selected = i.symbol === inst.symbol;
          const up = i.change.startsWith('+');
          return (
            <button key={i.symbol} onClick={() => { setSelectedSymbol(i.symbol); setExecMsg(null); }} style={{
              padding: '7px 13px',
              backgroundColor: selected ? '#1C3A5E' : '#FFFFFF',
              color: selected ? '#FFFFFF' : '#14181B',
              border: `1px solid ${selected ? '#1C3A5E' : '#E4E4DF'}`,
              cursor: 'pointer', ...mono, fontSize: '10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '76px',
            }}>
              <span style={{ fontWeight: 700 }}>{i.symbol}</span>
              <span style={{ fontSize: '9px', color: selected ? '#C8F135' : (up ? '#16A34A' : '#DC2626') }}>
                {i.price} {i.change}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Ticker Strip ── */}
      <div style={{ ...card, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '10px', backgroundColor: '#F7F7F5' }}>
        <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
          {[
            ['PAIR', inst.symbol, '#1C3A5E'],
            ['SPOT', inst.price, '#14181B'],
            ['24H', inst.change, inst.change.startsWith('+') ? '#16A34A' : '#DC2626'],
            ['SPREAD', `${inst.spread} pips`, '#14181B'],
            ['OANDA ID', inst.oandaId, '#1C3A5E'],
          ].map(([label, val, col]) => (
            <span key={label as string}>
              <span style={{ color: '#6B7280' }}>{label} </span>
              <span style={{ fontWeight: 700, color: col as string }}>{val}</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ color: '#6B7280', marginRight: '4px', fontSize: '9px' }}>TF:</span>
          {TIMEFRAMES.map(tf => (
            <button key={tf.value} onClick={() => setTimeframe(tf.value)} style={{
              padding: '2px 7px',
              backgroundColor: timeframe === tf.value ? '#1C3A5E' : '#FFFFFF',
              color: timeframe === tf.value ? '#FFFFFF' : '#6B7280',
              border: '1px solid #E4E4DF', fontSize: '9px', cursor: 'pointer', ...mono,
            }}>{tf.label}</button>
          ))}
        </div>
      </div>

      {/* ── Main Grid: Chart + Order Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: '14px', alignItems: 'start' }}>

        {/* Chart */}
        <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#0A0D12', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '8px 14px', fontSize: '10px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94A3B8' }}>TRADINGVIEW ENGINE // <span style={{ color: '#E2E8F0' }}>{inst.tvSymbol}</span></span>
            <span style={{ color: '#C8F135', fontSize: '9px' }}>RSI · MACD · BB · EMA · VWAP</span>
          </div>
          <TradingViewChart symbol={inst.tvSymbol} interval={timeframe} theme="dark" height={540} showSidebar />
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Order Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            {(['MARKET', 'LIMIT'] as const).map(ot => (
              <button key={ot} onClick={() => setOrderType(ot)} style={{
                padding: '7px', backgroundColor: orderType === ot ? '#1C3A5E' : '#F7F7F5',
                color: orderType === ot ? '#FFFFFF' : '#6B7280',
                border: `1px solid ${orderType === ot ? '#1C3A5E' : '#E4E4DF'}`,
                fontSize: '10px', cursor: 'pointer', ...mono, fontWeight: 600
              }}>{ot} ORDER</button>
            ))}
          </div>

          {/* Direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button onClick={() => setDirection('BUY')} style={{
              padding: '11px',
              backgroundColor: direction === 'BUY' ? '#16A34A' : '#F7F7F5',
              color: direction === 'BUY' ? '#FFFFFF' : '#6B7280',
              border: `1px solid ${direction === 'BUY' ? '#16A34A' : '#E4E4DF'}`,
              fontSize: '12px', cursor: 'pointer', ...mono, fontWeight: 800,
            }}>▲ BUY</button>
            <button onClick={() => setDirection('SELL')} style={{
              padding: '11px',
              backgroundColor: direction === 'SELL' ? '#DC2626' : '#F7F7F5',
              color: direction === 'SELL' ? '#FFFFFF' : '#6B7280',
              border: `1px solid ${direction === 'SELL' ? '#DC2626' : '#E4E4DF'}`,
              fontSize: '12px', cursor: 'pointer', ...mono, fontWeight: 800,
            }}>▼ SELL</button>
          </div>

          {/* Order Params */}
          <div style={{ ...card, padding: '14px' }}>
            <div style={{ fontSize: '10px', color: '#1C3A5E', fontWeight: 600, borderBottom: '1px solid #E4E4DF', paddingBottom: '8px', marginBottom: '10px', letterSpacing: '0.5px' }}>ORDER PARAMETERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
              <div>
                <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>UNITS / VOLUME</label>
                <input type="text" value={units} onChange={e => setUnits(e.target.value)}
                  style={{ width: '100%', padding: '7px 8px', border: '1px solid #E4E4DF', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#14181B' }} />
              </div>
              {orderType === 'LIMIT' && (
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>LIMIT PRICE</label>
                  <input type="text" value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
                    placeholder={inst.price} style={{ width: '100%', padding: '7px 8px', border: '1px solid #1C3A5E', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#14181B' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>STOP LOSS</label>
                  <input type="text" value={stopLoss} onChange={e => setStopLoss(e.target.value)}
                    placeholder="e.g. 1.3050"
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #FCA5A5', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#991B1B' }} />
                </div>
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>TAKE PROFIT</label>
                  <input type="text" value={takeProfit} onChange={e => setTakeProfit(e.target.value)}
                    placeholder="e.g. 1.3250"
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #86EFAC', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#166534' }} />
                </div>
              </div>
            </div>

            {execMsg && (
              <div style={{ marginTop: '10px', padding: '8px', backgroundColor: execMsg.ok ? '#DCFCE7' : '#FEE2E2', border: `1px solid ${execMsg.ok ? '#86EFAC' : '#FCA5A5'}`, color: execMsg.ok ? '#166534' : '#991B1B', fontSize: '9px', lineHeight: 1.5 }}>
                {execMsg.text}
              </div>
            )}

            <button onClick={handleExecute} disabled={executing} style={{
              width: '100%', marginTop: '10px', padding: '12px',
              backgroundColor: direction === 'BUY' ? '#16A34A' : '#DC2626',
              color: '#FFFFFF', border: 'none', ...mono, fontSize: '10px',
              fontWeight: 800, letterSpacing: '1.5px',
              cursor: executing ? 'wait' : 'pointer', opacity: executing ? 0.7 : 1,
            }}>
              {executing ? 'ROUTING VIA RISK GATE...' : `SUBMIT ${direction} TO OANDA →`}
            </button>
          </div>

          {/* AI Co-Pilot */}
          <div style={{ border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#F8FAFC', padding: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px' }}>AI CO-PILOT</div>
              <button onClick={handleAnalyse} disabled={aiLoading} style={{
                padding: '3px 8px', backgroundColor: '#1E293B', color: aiLoading ? '#6B7280' : '#C8F135',
                border: '1px solid #334155', fontSize: '9px', ...mono, cursor: aiLoading ? 'wait' : 'pointer', letterSpacing: '0.5px',
              }}>
                {aiLoading ? 'ANALYSING...' : 'RUN ANALYSIS →'}
              </button>
            </div>

            {aiError && <div style={{ fontSize: '9px', color: '#F87171', marginBottom: '8px' }}>{aiError}</div>}

            {aiAnalysis && aColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '3px 8px', backgroundColor: aColor.bg, color: aColor.text, border: `1px solid ${aColor.border}`, fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {aiAnalysis.rating}
                  </span>
                  <span style={{ color: '#94A3B8', fontSize: '9px' }}>R:R {aiAnalysis.rrRatio}</span>
                </div>
                <div style={{ backgroundColor: '#0A0D12', border: '1px solid #1E293B', padding: '9px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '9px', color: '#CBD5E1' }}>
                  <div>RSI: <span style={{ color: '#C8F135' }}>{aiAnalysis.rsiContext}</span></div>
                  <div>MACD: <span style={{ color: '#C8F135' }}>{aiAnalysis.macdContext}</span></div>
                  <div>BB: <span style={{ color: '#C8F135' }}>{aiAnalysis.bbContext}</span></div>
                  <div>RISK: <span style={{ color: '#FCA5A5' }}>{aiAnalysis.keyRisk}</span></div>
                  <div>CONSENSUS: <span style={{ color: '#C8F135' }}>{aiAnalysis.consensusScore}</span></div>
                </div>
                <p style={{ fontSize: '10px', color: '#94A3B8', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                  "{aiAnalysis.summary}"
                </p>
              </div>
            )}

            {!aiAnalysis && !aiLoading && (
              <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center', padding: '16px 0', lineHeight: 1.6 }}>
                Configure trade parameters then click<br />RUN ANALYSIS for AI co-pilot evaluation.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Live Open Positions ── */}
      <div style={{ ...card }}>
        <div style={{ backgroundColor: '#0F172A', padding: '10px 16px', fontSize: '10px', fontWeight: 700, color: '#C8F135', display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '1px' }}>
          <span>● LIVE OPEN POSITIONS — OANDA {process.env.NEXT_PUBLIC_OANDA_ENVIRONMENT?.toUpperCase() || 'PRACTICE'}</span>
          <span style={{ fontSize: '9px', color: '#475569', fontWeight: 400 }}>Refreshed {lastRefresh}</span>
        </div>
        {positions.length === 0 ? (
          <div style={{ padding: '16px 18px', fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>
            {oandaError ? `⚠ OANDA connection error: ${oandaError}` : 'No open positions on OANDA account.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', ...mono }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E4E4DF', color: '#6B7280', textAlign: 'left', backgroundColor: '#F7F7F5' }}>
                {['INSTRUMENT', 'DIRECTION', 'UNITS', 'ENTRY PRICE', 'UNREALIZED P&L', 'FINANCING', 'OPENED AT', 'TRADE ID'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F0F0EC', backgroundColor: p.pnlPositive ? '#F0FDF4' : '#FFF5F5' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#1C3A5E', fontSize: '11px' }}>{p.instrument}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 8px', backgroundColor: p.direction === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: p.direction === 'BUY' ? '#166534' : '#991B1B', fontWeight: 800, border: `1px solid ${p.direction === 'BUY' ? '#86EFAC' : '#FCA5A5'}`, fontSize: '9px' }}>
                      {p.direction === 'BUY' ? '▲ LONG' : '▼ SHORT'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.units}</td>
                  <td style={{ padding: '10px 14px' }}>{p.entryPrice}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: '11px', color: p.pnlPositive ? '#16A34A' : '#DC2626' }}>
                    {p.pnlSign}${p.unrealizedPL}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6B7280' }}>{p.financing}</td>
                  <td style={{ padding: '10px 14px', color: '#6B7280' }}>{p.openedAt}</td>
                  <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: '9px' }}>{p.tradeId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Execution Log ── */}
      <div style={{ ...card }}>
        <div style={{ backgroundColor: '#F7F7F5', padding: '10px 16px', fontSize: '10px', fontWeight: 700, borderBottom: '1px solid #E4E4DF', color: '#1C3A5E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '0.5px' }}>
          <span>EXECUTION LOG — AUTO + MANUAL TRADES</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#6B7280', fontWeight: 400 }}>SOURCE: OANDA v20 REST API · Live</span>
            <button onClick={fetchOandaData} style={{ padding: '2px 8px', backgroundColor: '#1C3A5E', color: '#FFFFFF', border: 'none', fontSize: '9px', cursor: 'pointer', ...mono }}>↻ REFRESH</button>
          </div>
        </div>

        {oandaError && (
          <div style={{ padding: '10px 16px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FCA5A5', fontSize: '9px', color: '#991B1B' }}>
            ⚠ {oandaError} — Showing any locally cached data.
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', ...mono }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4DF', textAlign: 'left', color: '#6B7280', backgroundColor: '#FAFAFA' }}>
              {['OPENED', 'SOURCE', 'INSTRUMENT', 'DIRECTION', 'UNITS', 'FILL PRICE', 'CLOSE PRICE', 'P&L', 'STATUS'].map(h => (
                <th key={h} style={{ padding: '8px 12px', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {execLog.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '20px 14px', color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
                  {oandaError ? 'Unable to fetch OANDA trade history.' : 'No executions on this account.'}
                </td>
              </tr>
            ) : (
              execLog.map(log => {
                const isExpanded = expandedRow === log.id;
                const rowBg = isExpanded ? '#F0F9FF' : '#FFFFFF';
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      style={{ borderBottom: '1px solid #F0F0EC', backgroundColor: rowBg, cursor: 'pointer', transition: 'background-color 0.15s' }}
                    >
                      <td style={{ padding: '9px 12px', color: '#6B7280', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 6px', backgroundColor: log.type === 'AUTO' ? '#1C3A5E' : '#F7F7F5', color: log.type === 'AUTO' ? '#C8F135' : '#14181B', fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>
                          {log.tier}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1C3A5E' }}>{log.instrument}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: log.direction === 'BUY' ? '#16A34A' : '#DC2626', fontSize: '11px' }}>
                        {log.direction === 'BUY' ? '▲' : '▼'} {log.direction}
                      </td>
                      <td style={{ padding: '9px 12px' }}>{log.units}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{log.fillPrice}</td>
                      <td style={{ padding: '9px 12px', color: '#6B7280' }}>{log.closePrice || '—'}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: log.pnlPositive ? '#16A34A' : '#DC2626' }}>
                        {log.pnl ? `${log.pnlSign}$${log.pnl}` : '—'}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 7px', backgroundColor: log.status === 'OPEN' ? '#EFF6FF' : log.status === 'CLOSED' ? '#F7F7F5' : '#DCFCE7', color: log.status === 'OPEN' ? '#1D4ED8' : log.status === 'CLOSED' ? '#374151' : '#166534', border: `1px solid ${log.status === 'OPEN' ? '#BFDBFE' : log.status === 'CLOSED' ? '#E4E4DF' : '#86EFAC'}`, fontSize: '8px', fontWeight: 700 }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ backgroundColor: '#EFF6FF', borderBottom: '2px solid #BFDBFE' }}>
                        <td colSpan={9} style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '10px' }}>
                            <div>
                              <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>TRADE DETAILS</div>
                              <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                <div><span style={{ color: '#6B7280' }}>Order ID: </span>{log.orderId}</div>
                                <div><span style={{ color: '#6B7280' }}>Opened: </span>{log.timestamp}</div>
                                {log.closedAt && <div><span style={{ color: '#6B7280' }}>Closed: </span>{log.closedAt}</div>}
                                {log.closePrice && <div><span style={{ color: '#6B7280' }}>Close price: </span>{log.closePrice}</div>}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>SIGNAL / REASONING</div>
                              <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                {log.signal
                                  ? <span style={{ color: '#1C3A5E' }}>{log.signal}</span>
                                  : <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                                      {log.type === 'AUTO'
                                        ? 'Automated signal — start scheduler to see detailed reasoning'
                                        : 'Placed via OANDA platform or MERIDIAN manual desk'}
                                    </span>
                                }
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>P&L SUMMARY</div>
                              <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                <div><span style={{ color: '#6B7280' }}>Status: </span><span style={{ fontWeight: 700 }}>{log.status}</span></div>
                                <div><span style={{ color: '#6B7280' }}>P&L: </span><span style={{ fontWeight: 700, color: log.pnlPositive ? '#16A34A' : '#DC2626' }}>{log.pnl ? `${log.pnlSign}$${log.pnl}` : 'Pending'}</span></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        <div style={{ padding: '8px 16px', fontSize: '9px', color: '#94A3B8', borderTop: '1px solid #F0F0EC', display: 'flex', justifyContent: 'space-between' }}>
          <span>Click any row to expand trade detail and reasoning.</span>
          <span>{execLog.length} trade{execLog.length !== 1 ? 's' : ''} · Last refreshed: {lastRefresh}</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
