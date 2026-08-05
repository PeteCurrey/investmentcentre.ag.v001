'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import TradingViewChart from '../../../components/TradingViewChart';

// ─── Types ─────────────────────────────────────────────────────────────────

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
  signal?: string | null; closedAt?: string;
}
interface Position {
  id: string; instrument: string; direction: string; units: string;
  entryPrice: string; unrealizedPL: string; pnlSign: string;
  pnlPositive: boolean; openedAt: string; tradeId: string; financing: string;
}
interface AccountSummary {
  balance: string; nav: string; unrealizedPL: string;
  pnlPositive: boolean; openTradesCount: number; currency: string;
}
interface CycleLogItem {
  id: string; timestamp: string; instrument: string;
  action: 'EXECUTED' | 'SKIPPED' | 'REJECTED' | 'ERROR';
  direction?: 'BUY' | 'SELL'; units?: number; price?: string;
  reason: string; orderId?: string;
}
interface AutotraderState {
  enabled: boolean; lastToggled: string; cycleCount: number;
  selectedInstruments: string[]; lotUnits: number;
  lastSignal: string | null; lastInstrument: string | null;
  lastDirection: string | null; lastPrice: string | null;
  lastCycleAt: string | null; lastCycleLogs: CycleLogItem[];
  autoStopAt: string | null; autoStopLabel: string | null;
}
interface AiAnalysis {
  rating: string; rrRatio: string; rsiContext: string;
  macdContext: string; bbContext: string; consensusScore: string;
  keyRisk: string; summary: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

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
];

const SESSION_PRESETS = [
  { label: 'London Close',  description: '17:00 UTC',  utcHour: 17, utcMin: 0 },
  { label: 'NY Close',      description: '21:00 UTC',  utcHour: 21, utcMin: 0 },
  { label: 'Tokyo Close',   description: '08:00 UTC',  utcHour: 8,  utcMin: 0 },
  { label: 'End of Day',    description: '23:59 UTC',  utcHour: 23, utcMin: 59 },
];

const LOT_PRESETS = [10, 100, 500, 1000, 5000];

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildStopTime(utcHour: number, utcMin: number): string {
  const now = new Date();
  const stop = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, utcMin, 0));
  if (stop <= now) stop.setUTCDate(stop.getUTCDate() + 1);
  return stop.toISOString();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const ratingColor = (r: string) => {
  if (r.includes('HIGH CONVICTION BUY'))  return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
  if (r.includes('MODERATE BUY'))         return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
  if (r.includes('HIGH CONVICTION SELL')) return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
  if (r.includes('MODERATE SELL'))        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
  if (r.includes('CAUTION') || r.includes('AVOID')) return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
  return { bg: '#F7F7F5', text: '#6B7280', border: '#E4E4DF' };
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function TradePage() {
  // Instrument state
  const [instruments, setInstruments]     = useState<Instrument[]>(INSTRUMENTS);
  const [selectedSymbol, setSelectedSymbol] = useState('XAU/USD');
  const [timeframe, setTimeframe]         = useState('15');

  // Manual Order state
  const [direction, setDirection]         = useState<'BUY' | 'SELL'>('BUY');
  const [units, setUnits]                 = useState('100');
  const [stopLoss, setStopLoss]           = useState('');
  const [takeProfit, setTakeProfit]       = useState('');
  const [orderType, setOrderType]         = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice]       = useState('');
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

  // Autotrader state
  const [autotrader, setAutotrader]       = useState<AutotraderState | null>(null);
  const [autoToggling, setAutoToggling]   = useState(false);
  const [runningCycle, setRunningCycle]   = useState(false);
  const [cycleCountdown, setCycleCountdown] = useState(60);
  const cycleRef                          = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-Trading Settings
  const [showConfig, setShowConfig]       = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [customStopTime, setCustomStopTime] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [customLotUnits, setCustomLotUnits] = useState('100');

  // UI state
  const [expandedRow, setExpandedRow]     = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const inst = instruments.find(i => i.symbol === selectedSymbol) || instruments[0];
  const tier4Active = process.env.NEXT_PUBLIC_TIER_4_ENABLED === 'true';
  const mono: React.CSSProperties = { fontFamily: '"DM Mono", "Fira Mono", monospace' };

  // ── Data Fetching ──────────────────────────────────────────────────────────

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
    } catch (e: any) { setOandaError(e.message); }
  }, []);

  const fetchAutotraderState = useCallback(async () => {
    try {
      const res = await fetch('/api/autotrader');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setAutotrader(data);
        if (data.lotUnits) setCustomLotUnits(String(data.lotUnits));
      }
    } catch {}
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const res  = await fetch('/api/prices');
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

  // Run autonomous cycle execution endpoint
  const runAutonomousCycle = useCallback(async () => {
    setRunningCycle(true);
    try {
      const res = await fetch('/api/autotrader/run-cycle', { method: 'POST' });
      const data = await res.json();
      if (data.state) {
        setAutotrader(data.state);
      }
      fetchOandaData();
    } catch {}
    setRunningCycle(false);
  }, [fetchOandaData]);

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

  // Cycle Countdown & Execution Loop when Auto-Trading is ON
  useEffect(() => {
    if (cycleRef.current) clearInterval(cycleRef.current);
    if (autotrader?.enabled) {
      setCycleCountdown(60);
      cycleRef.current = setInterval(() => {
        setCycleCountdown(c => {
          if (c <= 1) {
            runAutonomousCycle();
            return 60;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (cycleRef.current) clearInterval(cycleRef.current); };
  }, [autotrader?.enabled, runAutonomousCycle]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleAutotrader = useCallback(async () => {
    if (!autotrader || autoToggling) return;
    setAutoToggling(true);
    const nextState = !autotrader.enabled;
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setAutotrader(data);
        if (nextState) {
          // Immediately trigger a cycle on toggle ON so user sees action right away!
          runAutonomousCycle();
        }
      }
    } catch {}
    setAutoToggling(false);
  }, [autotrader, autoToggling, runAutonomousCycle]);

  const handleToggleInstrument = useCallback(async (symbolToToggle: string) => {
    if (!autotrader) return;
    const current = autotrader.selectedInstruments || ['GBP/USD'];
    const updated = current.includes(symbolToToggle)
      ? current.filter(s => s !== symbolToToggle)
      : [...current, symbolToToggle];

    if (updated.length === 0) return; // Must keep at least 1 instrument

    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedInstruments: updated }),
      });
      const data = await res.json();
      if (data.success) setAutotrader(data);
    } catch {}
  }, [autotrader]);

  const handleSetLotUnits = useCallback(async (unitsNum: number) => {
    if (!autotrader) return;
    setCustomLotUnits(String(unitsNum));
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotUnits: unitsNum }),
      });
      const data = await res.json();
      if (data.success) setAutotrader(data);
    } catch {}
  }, [autotrader]);

  const handleSetSchedule = useCallback(async (isoTime: string, label: string) => {
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoStopAt: isoTime, autoStopLabel: label }),
      });
      const data = await res.json();
      if (data.success) setAutotrader(data);
    } catch {}
    setSavingSchedule(false);
  }, []);

  const handleClearSchedule = useCallback(async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoStopAt: null, autoStopLabel: null }),
      });
      const data = await res.json();
      if (data.success) setAutotrader(data);
    } catch {}
    setSavingSchedule(false);
  }, []);

  const handleExecuteManual = useCallback(async () => {
    setExecuting(true); setExecMsg(null);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: inst.symbol, direction, units, stopLoss, takeProfit,
          orderType, limitPrice, currentPrice: inst.price === '—' ? undefined : inst.price,
        }),
      });
      const data = await res.json() as { error?: string; fillPrice?: string; orderId?: string };
      if (!res.ok || data.error) {
        setExecMsg({ ok: false, text: data.error || 'Execution failed' });
      } else {
        setExecMsg({ ok: true, text: `ORDER FILLED — ${direction} ${Number(units).toLocaleString()} ${inst.symbol} @ ${data.fillPrice || 'MARKET'} | ID: ${data.orderId}` });
        setTimeout(() => fetchOandaData(), 2000);
      }
    } catch (e: any) { setExecMsg({ ok: false, text: `Network error: ${e.message}` }); }
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
  const stopMsRemaining = autotrader?.autoStopAt
    ? Math.max(0, new Date(autotrader.autoStopAt).getTime() - Date.now())
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowHowItWorks(v => !v)}
            style={{ padding: '5px 12px', border: '1px solid #1C3A5E', backgroundColor: showHowItWorks ? '#1C3A5E' : 'transparent', color: showHowItWorks ? '#FFFFFF' : '#1C3A5E', fontSize: '9px', cursor: 'pointer', ...mono, letterSpacing: '0.5px' }}
          >
            {showHowItWorks ? '▲ HIDE PIPELINE INFO' : '▼ HOW IT WORKS'}
          </button>
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
      </div>

      {/* ── HOW IT WORKS panel ── */}
      {showHowItWorks && (
        <div style={{ border: '1px solid #1C3A5E', backgroundColor: '#F0F4FF', padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1C3A5E', letterSpacing: '1px', marginBottom: '14px', borderBottom: '1px solid #BFDBFE', paddingBottom: '8px' }}>
            AUTONOMOUS ENGINE — MULTI-INSTRUMENT SIGNAL &amp; EXECUTION PIPELINE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '10px', lineHeight: 1.8, color: '#374151' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1C3A5E', marginBottom: '6px', fontSize: '10px', borderLeft: '3px solid #1C3A5E', paddingLeft: '8px' }}>
                1. MULTI-PAIR TARGETING &amp; SIZING
              </div>
              <div style={{ color: '#4B5563' }}>
                You control which instruments are traded automatically below. For each active pair, the engine evaluates real-time momentum and applies your configured <strong>Lot Size / Units</strong> (e.g. 100 units = 0.001 lot, $0.01/pip on EUR/USD). Gold and Indices use smart risk scaling.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1C3A5E', marginBottom: '6px', fontSize: '10px', borderLeft: '3px solid #16A34A', paddingLeft: '8px' }}>
                2. TECHNICAL SIGNAL ENGINE
              </div>
              <div style={{ color: '#4B5563' }}>
                Every 60 seconds (or on instant trigger), live spot pricing is fetched for each active pair. The engine compares price delta to detect momentum direction (BUY/SELL), calculates 30-pip SL and 60-pip TP levels, and constructs formatted order intents.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1C3A5E', marginBottom: '6px', fontSize: '10px', borderLeft: '3px solid #DC2626', paddingLeft: '8px' }}>
                3. CRYPTOGRAPHIC RISK GATE &amp; OANDA
              </div>
              <div style={{ color: '#4B5563' }}>
                Every order intent must pass through <strong>RiskGate</strong> (FTMO Standard Profile checks). Upon approval, an HMAC token is generated and the order is submitted directly to OANDA v20 REST API. Every trade or skip reason is logged live.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Account Summary Strip ── */}
      {account && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', backgroundColor: '#E4E4DF' }}>
          {[
            { label: 'BALANCE',         value: `${account.currency} ${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, positive: true },
            { label: 'NET ASSET VALUE',  value: `${account.currency} ${Number(account.nav).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, positive: true },
            { label: 'UNREALIZED P&L',   value: `${account.pnlPositive ? '+' : '-'}${account.currency} ${account.unrealizedPL}`, positive: account.pnlPositive },
            { label: 'OPEN TRADES',     value: String(account.openTradesCount), positive: true },
            { label: 'ACCOUNT',         value: 'PRACTICE', positive: true },
          ].map(({ label, value, positive }) => (
            <div key={label} style={{ backgroundColor: '#FAFAFA', padding: '10px 14px' }}>
              <div style={{ fontSize: '9px', color: '#6B7280', letterSpacing: '1px', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: label === 'UNREALIZED P&L' ? (positive ? '#16A34A' : '#DC2626') : '#14181B' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Auto-Trading Control Banner & Settings Panel ── */}
      <div style={{
        border: autotrader?.enabled ? '2px solid #22C55E' : '1px solid #E4E4DF',
        backgroundColor: autotrader?.enabled ? '#0F172A' : '#F7F7F5',
        transition: 'all 0.3s ease',
      }}>
        {/* Main control row */}
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

          {/* Status + Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: autotrader?.enabled ? '#22C55E' : '#6B7280',
                boxShadow: autotrader?.enabled ? '0 0 12px #22C55E, 0 0 24px rgba(34,197,94,0.5)' : 'none',
                animation: autotrader?.enabled ? 'pulse 2s infinite' : 'none',
              }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: autotrader?.enabled ? '#4ADE80' : '#6B7280', letterSpacing: '1px' }}>
                AUTO-TRADING MODE: {autotrader?.enabled ? 'ON (ACTIVE)' : 'OFF (PAUSED)'}
              </span>
            </div>

            {autotrader?.enabled && (
              <div style={{ fontSize: '10px', color: '#94A3B8', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>ACTIVE PAIRS: </span>
                  <span style={{ color: '#E2E8F0', fontWeight: 700 }}>
                    {(autotrader.selectedInstruments || ['GBP/USD']).join(', ')}
                  </span>
                  <span style={{ color: '#64748B' }}> · </span>
                  <span style={{ color: '#64748B' }}>LOT SIZE: </span>
                  <span style={{ color: '#C8F135', fontWeight: 700 }}>{autotrader.lotUnits || 100} units per trade</span>
                </div>
                {autotrader.lastSignal && (
                  <div>
                    <span style={{ color: '#64748B' }}>LAST TRADE: </span>
                    <span style={{ color: autotrader.lastDirection === 'BUY' ? '#4ADE80' : '#F87171', fontWeight: 700 }}>
                      {autotrader.lastDirection} {autotrader.lastInstrument} @ {autotrader.lastPrice}
                    </span>
                    <span style={{ color: '#64748B' }}> ({autotrader.lastSignal})</span>
                  </div>
                )}
                {autotrader.autoStopLabel && stopMsRemaining !== null && stopMsRemaining > 0 && (
                  <div>
                    <span style={{ color: '#64748B' }}>SCHEDULED STOP: </span>
                    <span style={{ color: '#FCD34D' }}>{autotrader.autoStopLabel}</span>
                    <span style={{ color: '#64748B' }}> (in {formatCountdown(stopMsRemaining)})</span>
                  </div>
                )}
              </div>
            )}

            {!autotrader?.enabled && (
              <div style={{ fontSize: '10px', color: '#6B7280', paddingLeft: '20px' }}>
                Auto-trading is currently <strong>OFF</strong>. Turn ON to evaluate selected instruments every 60s &amp; execute trades on OANDA.
              </div>
            )}
          </div>

          {/* Controls: ON/OFF Toggle + Instant Trigger + Settings Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
            {autotrader?.enabled && (
              <div style={{ textAlign: 'center', minWidth: '70px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ADE80', lineHeight: 1 }}>{cycleCountdown}s</div>
                <div style={{ fontSize: '8px', color: '#64748B', letterSpacing: '0.5px', marginTop: '2px' }}>NEXT CYCLE</div>
              </div>
            )}

            <button
              onClick={handleToggleAutotrader}
              disabled={autoToggling || !autotrader}
              style={{
                padding: '11px 22px',
                backgroundColor: autotrader?.enabled ? '#DC2626' : '#16A34A',
                color: '#FFFFFF', border: 'none',
                cursor: autoToggling ? 'wait' : 'pointer',
                fontSize: '11px', fontWeight: 800, ...mono,
                letterSpacing: '1px', opacity: autoToggling ? 0.7 : 1,
                transition: 'all 0.2s ease', minWidth: '160px',
                boxShadow: autotrader?.enabled ? '0 0 10px rgba(220,38,38,0.4)' : '0 0 10px rgba(22,163,74,0.4)',
              }}
            >
              {autoToggling ? 'UPDATING...' : autotrader?.enabled ? '⏹ DISABLE AUTO-TRADING' : '▶ ENABLE AUTO-TRADING'}
            </button>

            {autotrader?.enabled && (
              <button
                onClick={runAutonomousCycle}
                disabled={runningCycle}
                style={{
                  padding: '11px 16px',
                  backgroundColor: '#1C3A5E', color: '#C8F135',
                  border: '1px solid #3B82F6', fontSize: '10px', fontWeight: 800,
                  cursor: runningCycle ? 'wait' : 'pointer', ...mono,
                  letterSpacing: '0.5px', opacity: runningCycle ? 0.6 : 1,
                }}
              >
                {runningCycle ? 'EVALUATING...' : '⚡ RUN CYCLE NOW'}
              </button>
            )}

            <button
              onClick={() => setShowConfig(v => !v)}
              style={{
                padding: '11px 14px', border: '1px solid',
                borderColor: showConfig ? '#3B82F6' : (autotrader?.enabled ? '#334155' : '#D1D5DB'),
                backgroundColor: showConfig ? '#1E293B' : 'transparent',
                color: showConfig ? '#FFFFFF' : (autotrader?.enabled ? '#CBD5E1' : '#374151'),
                fontSize: '10px', cursor: 'pointer', ...mono, fontWeight: 700,
              }}
            >
              ⚙ CONFIG &amp; LOT SIZING
            </button>

            <button
              onClick={() => setShowScheduler(v => !v)}
              style={{
                padding: '11px 14px', border: '1px solid',
                borderColor: autotrader?.autoStopAt ? '#F59E0B' : (autotrader?.enabled ? '#334155' : '#D1D5DB'),
                backgroundColor: autotrader?.autoStopAt ? '#FEF3C7' : 'transparent',
                color: autotrader?.autoStopAt ? '#92400E' : (autotrader?.enabled ? '#CBD5E1' : '#374151'),
                fontSize: '10px', cursor: 'pointer', ...mono, fontWeight: 700,
              }}
            >
              ⏰ SCHEDULE STOP
            </button>
          </div>
        </div>

        {/* ── Configuration Subpanel: Instruments & Lot Sizing ── */}
        {showConfig && autotrader && (
          <div style={{
            borderTop: `1px solid ${autotrader.enabled ? '#1E293B' : '#E4E4DF'}`,
            padding: '16px 20px',
            backgroundColor: autotrader.enabled ? '#0A0D12' : '#FFFFFF',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            {/* Instrument Selection */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: autotrader.enabled ? '#94A3B8' : '#1C3A5E', letterSpacing: '1px', marginBottom: '8px' }}>
                SELECT INSTRUMENTS TO AUTO-TRADE (CLICK TO TOGGLE):
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {instruments.map(i => {
                  const isSelected = (autotrader.selectedInstruments || ['GBP/USD']).includes(i.symbol);
                  return (
                    <button
                      key={i.symbol}
                      onClick={() => handleToggleInstrument(i.symbol)}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: isSelected ? '#16A34A' : (autotrader.enabled ? '#1E293B' : '#F3F4F6'),
                        color: isSelected ? '#FFFFFF' : (autotrader.enabled ? '#94A3B8' : '#6B7280'),
                        border: `1px solid ${isSelected ? '#16A34A' : (autotrader.enabled ? '#334155' : '#D1D5DB')}`,
                        fontSize: '10px', fontWeight: 700, cursor: 'pointer', ...mono,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{i.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lot Size / Units Selection */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: autotrader.enabled ? '#94A3B8' : '#1C3A5E', letterSpacing: '1px', marginBottom: '8px' }}>
                CONFIGURED LOT SIZE / UNITS PER TRADE:
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {LOT_PRESETS.map(u => {
                  const isSelected = (autotrader.lotUnits || 100) === u;
                  return (
                    <button
                      key={u}
                      onClick={() => handleSetLotUnits(u)}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: isSelected ? '#1C3A5E' : (autotrader.enabled ? '#1E293B' : '#F3F4F6'),
                        color: isSelected ? '#C8F135' : (autotrader.enabled ? '#94A3B8' : '#374151'),
                        border: `1px solid ${isSelected ? '#C8F135' : (autotrader.enabled ? '#334155' : '#D1D5DB')}`,
                        fontSize: '10px', fontWeight: 700, cursor: 'pointer', ...mono,
                      }}
                    >
                      {u.toLocaleString()} units {u === 100 ? '(0.001 Lot - Recommended)' : u === 1000 ? '(0.01 Lot)' : ''}
                    </button>
                  );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '9px', color: '#6B7280' }}>Custom:</span>
                  <input
                    type="number"
                    value={customLotUnits}
                    onChange={e => setCustomLotUnits(e.target.value)}
                    onBlur={() => {
                      const num = parseInt(customLotUnits, 10);
                      if (num > 0) handleSetLotUnits(num);
                    }}
                    style={{ width: '80px', padding: '5px 8px', border: '1px solid #D1D5DB', ...mono, fontSize: '10px', color: '#14181B' }}
                  />
                  <span style={{ fontSize: '9px', color: '#6B7280' }}>units</span>
                </div>
              </div>
              <div style={{ fontSize: '9px', color: autotrader.enabled ? '#64748B' : '#6B7280', marginTop: '6px' }}>
                💡 <strong>Safety note:</strong> 100 units on Forex = 0.001 lot (~$0.01/pip). Prevents oversized trades on OANDA practice account. Gold (XAU/USD) is automatically scaled (1 unit = 1 oz).
              </div>
            </div>
          </div>
        )}

        {/* ── Schedule Subpanel ── */}
        {showScheduler && autotrader && (
          <div style={{
            borderTop: `1px solid ${autotrader.enabled ? '#1E293B' : '#E4E4DF'}`,
            padding: '16px 20px',
            backgroundColor: autotrader.enabled ? '#0A0D12' : '#FFFFFF',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: autotrader.enabled ? '#94A3B8' : '#1C3A5E', letterSpacing: '1px', marginBottom: '10px' }}>
              AUTO-STOP SCHEDULE — engine automatically disables at chosen time
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {SESSION_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  disabled={savingSchedule}
                  onClick={() => handleSetSchedule(buildStopTime(preset.utcHour, preset.utcMin), `${preset.label} ${preset.description}`)}
                  style={{
                    padding: '7px 12px', border: '1px solid',
                    borderColor: autotrader.autoStopLabel?.startsWith(preset.label) ? '#F59E0B' : '#D1D5DB',
                    backgroundColor: autotrader.autoStopLabel?.startsWith(preset.label) ? '#FEF3C7' : '#F9FAFB',
                    color: autotrader.autoStopLabel?.startsWith(preset.label) ? '#92400E' : '#374151',
                    fontSize: '10px', cursor: 'pointer', ...mono,
                  }}
                >
                  {preset.label}<br />
                  <span style={{ fontSize: '8px', color: '#6B7280' }}>{preset.description}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="time"
                value={customStopTime}
                onChange={e => setCustomStopTime(e.target.value)}
                style={{ padding: '6px 8px', border: '1px solid #D1D5DB', ...mono, fontSize: '11px', color: '#14181B' }}
              />
              <span style={{ fontSize: '9px', color: '#6B7280' }}>UTC</span>
              <button
                disabled={!customStopTime || savingSchedule}
                onClick={() => {
                  if (!customStopTime) return;
                  const [h, m] = customStopTime.split(':').map(Number);
                  handleSetSchedule(buildStopTime(h, m), `Custom ${customStopTime} UTC`);
                }}
                style={{ padding: '6px 12px', backgroundColor: '#1C3A5E', color: '#FFFFFF', border: 'none', fontSize: '9px', cursor: 'pointer', ...mono }}
              >
                SET CUSTOM TIME
              </button>
              {autotrader.autoStopAt && (
                <button
                  onClick={handleClearSchedule}
                  disabled={savingSchedule}
                  style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: '9px', cursor: 'pointer', ...mono }}
                >
                  ✕ CLEAR SCHEDULE
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Autonomous Cycle Feed / Log Section ── */}
      {autotrader?.lastCycleLogs && autotrader.lastCycleLogs.length > 0 && (
        <div style={{ border: '1px solid #1C3A5E', backgroundColor: '#0F172A', color: '#F8FAFC', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#4ADE80', letterSpacing: '1px' }}>
              ⚡ LIVE AUTONOMOUS CYCLE FEED — EVALUATION &amp; DECISION LOGS
            </div>
            <div style={{ fontSize: '9px', color: '#94A3B8' }}>
              Cycles Completed: <span style={{ color: '#C8F135', fontWeight: 700 }}>{autotrader.cycleCount}</span> · Last Cycle: {autotrader.lastCycleAt ? new Date(autotrader.lastCycleAt).toLocaleTimeString() : '—'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', fontSize: '10px', ...mono }}>
            {autotrader.lastCycleLogs.slice(0, 10).map((logItem) => {
              const isExec = logItem.action === 'EXECUTED';
              const isRej = logItem.action === 'REJECTED';
              return (
                <div key={logItem.id} style={{
                  padding: '6px 10px',
                  backgroundColor: isExec ? '#162312' : (isRej ? '#2A1212' : '#1E293B'),
                  borderLeft: `4px solid ${isExec ? '#22C55E' : (isRej ? '#EF4444' : '#64748B')}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748B', fontSize: '9px' }}>{logItem.timestamp}</span>
                    <span style={{ fontWeight: 700, color: '#38BDF8' }}>{logItem.instrument}</span>
                    <span style={{
                      padding: '1px 6px', fontSize: '8px', fontWeight: 800,
                      backgroundColor: isExec ? '#22C55E' : (isRej ? '#EF4444' : '#475569'),
                      color: '#FFFFFF',
                    }}>
                      {logItem.action}
                    </span>
                    {logItem.direction && (
                      <span style={{ fontWeight: 800, color: logItem.direction === 'BUY' ? '#4ADE80' : '#F87171' }}>
                        {logItem.direction} {logItem.units} units @ {logItem.price}
                      </span>
                    )}
                    <span style={{ color: '#CBD5E1' }}>{logItem.reason}</span>
                  </div>
                  {logItem.orderId && (
                    <span style={{ fontSize: '8px', color: '#64748B', flexShrink: 0 }}>ID: {logItem.orderId}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Instrument Selector ── */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {instruments.map(i => {
          const selected = i.symbol === inst.symbol;
          const up = i.change.startsWith('+');
          return (
            <button key={i.symbol} onClick={() => { setSelectedSymbol(i.symbol); setExecMsg(null); }} style={{
              padding: '7px 13px', backgroundColor: selected ? '#1C3A5E' : '#FFFFFF',
              color: selected ? '#FFFFFF' : '#14181B', border: `1px solid ${selected ? '#1C3A5E' : '#E4E4DF'}`,
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
      <div style={{ border: '1px solid #E4E4DF', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '10px', backgroundColor: '#F7F7F5' }}>
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

      {/* ── Chart + Manual Order Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: '14px', alignItems: 'start' }}>
        <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#0A0D12', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '8px 14px', fontSize: '10px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94A3B8' }}>TRADINGVIEW ENGINE // <span style={{ color: '#E2E8F0' }}>{inst.tvSymbol}</span></span>
            <span style={{ color: '#C8F135', fontSize: '9px' }}>RSI · MACD · BB · EMA · VWAP</span>
          </div>
          <TradingViewChart symbol={inst.tvSymbol} interval={timeframe} theme="dark" height={540} showSidebar />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Order Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            {(['MARKET', 'LIMIT'] as const).map(ot => (
              <button key={ot} onClick={() => setOrderType(ot)} style={{
                padding: '7px', backgroundColor: orderType === ot ? '#1C3A5E' : '#F7F7F5',
                color: orderType === ot ? '#FFFFFF' : '#6B7280',
                border: `1px solid ${orderType === ot ? '#1C3A5E' : '#E4E4DF'}`,
                fontSize: '10px', cursor: 'pointer', ...mono, fontWeight: 600,
              }}>{ot} ORDER</button>
            ))}
          </div>
          {/* Direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button onClick={() => setDirection('BUY')} style={{ padding: '11px', backgroundColor: direction === 'BUY' ? '#16A34A' : '#F7F7F5', color: direction === 'BUY' ? '#FFFFFF' : '#6B7280', border: `1px solid ${direction === 'BUY' ? '#16A34A' : '#E4E4DF'}`, fontSize: '12px', cursor: 'pointer', ...mono, fontWeight: 800 }}>▲ BUY</button>
            <button onClick={() => setDirection('SELL')} style={{ padding: '11px', backgroundColor: direction === 'SELL' ? '#DC2626' : '#F7F7F5', color: direction === 'SELL' ? '#FFFFFF' : '#6B7280', border: `1px solid ${direction === 'SELL' ? '#DC2626' : '#E4E4DF'}`, fontSize: '12px', cursor: 'pointer', ...mono, fontWeight: 800 }}>▼ SELL</button>
          </div>
          {/* Manual Order Params */}
          <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: '#1C3A5E', fontWeight: 600, borderBottom: '1px solid #E4E4DF', paddingBottom: '8px', marginBottom: '10px', letterSpacing: '0.5px' }}>MANUAL ORDER PARAMETERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
              <div>
                <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>UNITS / VOLUME</label>
                <input type="text" value={units} onChange={e => setUnits(e.target.value)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #E4E4DF', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#14181B' }} />
              </div>
              {orderType === 'LIMIT' && (
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>LIMIT PRICE</label>
                  <input type="text" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder={inst.price} style={{ width: '100%', padding: '7px 8px', border: '1px solid #1C3A5E', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#14181B' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>STOP LOSS</label>
                  <input type="text" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="e.g. 1.3050" style={{ width: '100%', padding: '7px 8px', border: '1px solid #FCA5A5', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#991B1B' }} />
                </div>
                <div>
                  <label style={{ color: '#6B7280', display: 'block', marginBottom: '3px' }}>TAKE PROFIT</label>
                  <input type="text" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="e.g. 1.3250" style={{ width: '100%', padding: '7px 8px', border: '1px solid #86EFAC', ...mono, fontSize: '11px', boxSizing: 'border-box', color: '#166534' }} />
                </div>
              </div>
            </div>
            {execMsg && (
              <div style={{ marginTop: '10px', padding: '8px', backgroundColor: execMsg.ok ? '#DCFCE7' : '#FEE2E2', border: `1px solid ${execMsg.ok ? '#86EFAC' : '#FCA5A5'}`, color: execMsg.ok ? '#166534' : '#991B1B', fontSize: '9px', lineHeight: 1.5 }}>
                {execMsg.text}
              </div>
            )}
            <button onClick={handleExecuteManual} disabled={executing} style={{ width: '100%', marginTop: '10px', padding: '12px', backgroundColor: direction === 'BUY' ? '#16A34A' : '#DC2626', color: '#FFFFFF', border: 'none', ...mono, fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', cursor: executing ? 'wait' : 'pointer', opacity: executing ? 0.7 : 1 }}>
              {executing ? 'ROUTING VIA RISK GATE...' : `SUBMIT MANUAL ${direction} TO OANDA →`}
            </button>
          </div>

          {/* AI Co-Pilot */}
          <div style={{ border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#F8FAFC', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px' }}>AI CO-PILOT</div>
              <button onClick={handleAnalyse} disabled={aiLoading} style={{ padding: '3px 8px', backgroundColor: '#1E293B', color: aiLoading ? '#6B7280' : '#C8F135', border: '1px solid #334155', fontSize: '9px', ...mono, cursor: aiLoading ? 'wait' : 'pointer' }}>
                {aiLoading ? 'ANALYSING...' : 'RUN ANALYSIS →'}
              </button>
            </div>
            {aiError && <div style={{ fontSize: '9px', color: '#F87171', marginBottom: '8px' }}>{aiError}</div>}
            {aiAnalysis && aColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '3px 8px', backgroundColor: aColor.bg, color: aColor.text, border: `1px solid ${aColor.border}`, fontSize: '9px', fontWeight: 700 }}>{aiAnalysis.rating}</span>
                  <span style={{ color: '#94A3B8', fontSize: '9px' }}>R:R {aiAnalysis.rrRatio}</span>
                </div>
                <div style={{ backgroundColor: '#0A0D12', border: '1px solid #1E293B', padding: '9px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '9px', color: '#CBD5E1' }}>
                  <div>RSI: <span style={{ color: '#C8F135' }}>{aiAnalysis.rsiContext}</span></div>
                  <div>MACD: <span style={{ color: '#C8F135' }}>{aiAnalysis.macdContext}</span></div>
                  <div>BB: <span style={{ color: '#C8F135' }}>{aiAnalysis.bbContext}</span></div>
                  <div>RISK: <span style={{ color: '#FCA5A5' }}>{aiAnalysis.keyRisk}</span></div>
                  <div>CONSENSUS: <span style={{ color: '#C8F135' }}>{aiAnalysis.consensusScore}</span></div>
                </div>
                <p style={{ fontSize: '10px', color: '#94A3B8', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{aiAnalysis.summary}"</p>
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
      <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF' }}>
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
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: '11px', color: p.pnlPositive ? '#16A34A' : '#DC2626' }}>{p.pnlSign}${p.unrealizedPL}</td>
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
      <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF' }}>
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
              execLog.map(entry => {
                const isExpanded = expandedRow === entry.id;
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                      style={{ borderBottom: '1px solid #F0F0EC', backgroundColor: isExpanded ? '#F0F9FF' : '#FFFFFF', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    >
                      <td style={{ padding: '9px 12px', color: '#6B7280', whiteSpace: 'nowrap' }}>{entry.timestamp}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 6px', backgroundColor: entry.type === 'AUTO' ? '#1C3A5E' : '#F7F7F5', color: entry.type === 'AUTO' ? '#C8F135' : '#14181B', fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>
                          {entry.tier}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1C3A5E' }}>{entry.instrument}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: entry.direction === 'BUY' ? '#16A34A' : '#DC2626', fontSize: '11px' }}>
                        {entry.direction === 'BUY' ? '▲' : '▼'} {entry.direction}
                      </td>
                      <td style={{ padding: '9px 12px' }}>{entry.units}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{entry.fillPrice}</td>
                      <td style={{ padding: '9px 12px', color: '#6B7280' }}>{entry.closePrice || '—'}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: entry.pnlPositive ? '#16A34A' : '#DC2626' }}>
                        {entry.pnl ? `${entry.pnlSign}$${entry.pnl}` : '—'}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 7px', backgroundColor: entry.status === 'OPEN' ? '#EFF6FF' : entry.status === 'CLOSED' ? '#F7F7F5' : '#DCFCE7', color: entry.status === 'OPEN' ? '#1D4ED8' : entry.status === 'CLOSED' ? '#374151' : '#166534', border: `1px solid ${entry.status === 'OPEN' ? '#BFDBFE' : entry.status === 'CLOSED' ? '#E4E4DF' : '#86EFAC'}`, fontSize: '8px', fontWeight: 700 }}>
                          {entry.status}
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
                                <div><span style={{ color: '#6B7280' }}>Order ID: </span>{entry.orderId}</div>
                                <div><span style={{ color: '#6B7280' }}>Opened: </span>{entry.timestamp}</div>
                                {entry.closedAt && <div><span style={{ color: '#6B7280' }}>Closed: </span>{entry.closedAt}</div>}
                                {entry.closePrice && <div><span style={{ color: '#6B7280' }}>Close price: </span>{entry.closePrice}</div>}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>SIGNAL / REASONING</div>
                              <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                {entry.signal
                                  ? <span style={{ color: '#1C3A5E' }}>{entry.signal}</span>
                                  : <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                                      {entry.type === 'AUTO'
                                        ? 'Automated signal — see Live Autonomous Cycle Feed above'
                                        : 'Placed via OANDA platform or MERIDIAN manual desk'}
                                    </span>
                                }
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>P&L SUMMARY</div>
                              <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                <div><span style={{ color: '#6B7280' }}>Status: </span><span style={{ fontWeight: 700 }}>{entry.status}</span></div>
                                <div><span style={{ color: '#6B7280' }}>P&L: </span><span style={{ fontWeight: 700, color: entry.pnlPositive ? '#16A34A' : '#DC2626' }}>{entry.pnl ? `${entry.pnlSign}$${entry.pnl}` : 'Pending'}</span></div>
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
          <span>Click any row to expand trade detail and signal reasoning.</span>
          <span>{execLog.length} trade{execLog.length !== 1 ? 's' : ''} · Last refreshed: {lastRefresh}</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
