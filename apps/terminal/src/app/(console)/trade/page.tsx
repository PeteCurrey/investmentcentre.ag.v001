'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TradingViewChart from '../../../components/TradingViewChart';
import { INSTRUMENT_UNIVERSE } from '../../../lib/instruments';
import { getStoredAutoList, setStoredAutoList } from '../../../components/AutoListButton';

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
  stopLossOrderID?: string; takeProfitOrderID?: string;
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

function getTvSymbol(symbol: string): string {
  const inst = INSTRUMENTS.find(i => i.symbol === symbol);
  return inst ? inst.tvSymbol : 'FX:' + symbol.replace('/', '');
}

function computeTimeHeld(openedAt: string): string {
  if (!openedAt || openedAt === '—') return '—';
  let tStr = openedAt.includes('T') ? openedAt : openedAt.replace(' ', 'T');
  if (!tStr.endsWith('Z')) tStr += 'Z';
  const tradeTime = new Date(tStr).getTime();
  if (isNaN(tradeTime)) return openedAt;
  const ms = Date.now() - tradeTime;
  if (ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
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

function TradePageInner() {
  const searchParams = useSearchParams();

  // Instrument state — resolve from URL params or default
  const [instruments, setInstruments]     = useState<Instrument[]>(INSTRUMENTS);

  // URL param pre-selection
  const urlOandaId  = searchParams.get('instrument');
  const urlDir      = searchParams.get('direction') as 'BUY' | 'SELL' | null;
  const urlInst     = INSTRUMENT_UNIVERSE.find(i => i.oandaId === urlOandaId);
  const defaultSym  = urlInst?.symbol ?? 'XAU/USD';

  const [selectedSymbol, setSelectedSymbol] = useState(defaultSym);
  const [timeframe, setTimeframe]         = useState('15');

  // Sync URL param changes (when navigating from other pages)
  useEffect(() => {
    if (urlInst) setSelectedSymbol(urlInst.symbol);
    if (urlDir)  setDirection(urlDir);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOandaId, urlDir]);

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
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [customStopTime, setCustomStopTime] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingRisk, setSavingRisk]        = useState(false);
  const [customLotUnits, setCustomLotUnits] = useState('100');

  // Risk Management Settings
  const [riskProfile, setRiskProfile] = useState<{
    slPips: number;
    tpPips: number;
    useTrailingStop: boolean;
    trailingDistancePips: number;
    breakEvenTriggerPips: number;
    sendTpToOanda: boolean;
  }>({
    slPips: 30,
    tpPips: 60,
    useTrailingStop: true,
    trailingDistancePips: 15,
    breakEvenTriggerPips: 20,
    sendTpToOanda: true,
  });

  const handleSaveRiskProfile = async (updates: Partial<typeof riskProfile>) => {
    const next = { ...riskProfile, ...updates };
    setRiskProfile(next);
    setSavingRisk(true);
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskProfile: next }),
      });
      const data = await res.json();
      if (data.riskProfile) setRiskProfile(data.riskProfile);
    } catch (err) {
      console.error('Failed to save risk profile:', err);
    } finally {
      setSavingRisk(false);
    }
  };

  // UI state
  const [expandedRow, setExpandedRow]       = useState<string | null>(null);
  const [expandedPos, setExpandedPos]       = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [posCollapsed, setPosCollapsed]     = useState(false);
  const [logCollapsed, setLogCollapsed]     = useState(false);

  // Close trade
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeMsg, setCloseMsg]             = useState<{ id: string; ok: boolean; text: string } | null>(null);

  // Closed Trades P&L Analytics timeframe & state
  // Bulk Actions State
  const [bulkModalOpen, setBulkModalOpen]           = useState(false);
  const [bulkFilter, setBulkFilter]                 = useState<'all' | 'profitable' | 'losing' | 'instrument'>('all');
  const [bulkInstrument, setBulkInstrument]         = useState<string>('');
  const [bulkConfirmPending, setBulkConfirmPending] = useState(false);
  const [bulkProgress, setBulkProgress]             = useState<{ current: number; total: number } | null>(null);
  const [bulkResult, setBulkResult]                 = useState<string | null>(null);

  // Chart Modal State
  const [chartModalInstrument, setChartModalInstrument] = useState<{ symbol: string; tvSymbol: string } | null>(null);
  const [chartModalTimeframe, setChartModalTimeframe]   = useState<string>('60');

  // Chart theme (persisted)
  const [chartTheme, setChartTheme] = useState<'dark' | 'light'>('dark');

  // Table UX & Refresh Timer
  const [hoveredRow, setHoveredRow]                 = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown]     = useState<number>(30);

  const [pnlTimeframe, setPnlTimeframe]     = useState<'1h' | '3h' | '6h' | '24h' | 'ALL' | 'CUSTOM'>('24h');
  const [customPnlHours, setCustomPnlHours] = useState<string>('12');

  const closedTradesStats = useMemo(() => {
    const now = Date.now();
    let cutoffMs = 0;
    if (pnlTimeframe === '1h') cutoffMs = 1 * 60 * 60 * 1000;
    else if (pnlTimeframe === '3h') cutoffMs = 3 * 60 * 60 * 1000;
    else if (pnlTimeframe === '6h') cutoffMs = 6 * 60 * 60 * 1000;
    else if (pnlTimeframe === '24h') cutoffMs = 24 * 60 * 60 * 1000;
    else if (pnlTimeframe === 'CUSTOM') {
      const h = parseFloat(customPnlHours) || 1;
      cutoffMs = h * 60 * 60 * 1000;
    }

    const closedEntries = execLog.filter(e => {
      if (e.status !== 'CLOSED' && !e.closedAt && !e.closePrice) return false;
      if (pnlTimeframe === 'ALL') return true;
      const timeStr = e.closedAt || e.timestamp;
      if (!timeStr || timeStr === '—') return false;
      let tStr = timeStr.includes('T') ? timeStr : timeStr.replace(' ', 'T');
      if (!tStr.endsWith('Z')) tStr += 'Z';
      const tradeTime = new Date(tStr).getTime();
      if (isNaN(tradeTime)) return true;
      return (now - tradeTime) <= cutoffMs;
    });

    let totalNet = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let winCount = 0;
    let lossCount = 0;

    closedEntries.forEach(e => {
      const rawVal = parseFloat(e.pnl || '0');
      const sign = e.pnlSign === '-' ? -1 : 1;
      const pnlVal = e.pnlPositive !== undefined ? (e.pnlPositive ? Math.abs(rawVal) : -Math.abs(rawVal)) : sign * Math.abs(rawVal);

      totalNet += pnlVal;
      if (pnlVal > 0) {
        grossProfit += pnlVal;
        winCount++;
      } else if (pnlVal < 0) {
        grossLoss += Math.abs(pnlVal);
        lossCount++;
      }
    });

    const totalClosed = closedEntries.length;
    const winRate = (winCount + lossCount) > 0 ? (winCount / (winCount + lossCount)) * 100 : 0;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99.9 : 0);

    return {
      totalClosed,
      totalNet,
      grossProfit,
      grossLoss,
      winCount,
      lossCount,
      winRate,
      profitFactor
    };
  }, [execLog, pnlTimeframe, customPnlHours]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persist chart theme preference
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('meridian_chart_theme') : null;
    if (stored === 'light' || stored === 'dark') setChartTheme(stored);
  }, []);
  const toggleChartTheme = () => {
    setChartTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') localStorage.setItem('meridian_chart_theme', next);
      return next;
    });
  };

  const inst = instruments.find(i => i.symbol === selectedSymbol) || instruments[0];
  const tier4Active = process.env.NEXT_PUBLIC_TIER_4_ENABLED === 'true';
  const mono: React.CSSProperties = { fontFamily: '"DM Mono", "Fira Mono", monospace' };

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const handleBulkClose = async (positionsToClose: Position[]) => {
    if (positionsToClose.length === 0) return;
    setBulkConfirmPending(false);
    setBulkProgress({ current: 0, total: positionsToClose.length });
    setBulkResult(null);

    let closedCount = 0;
    let totalRealizedEst = 0;

    for (let i = 0; i < positionsToClose.length; i++) {
      const p = positionsToClose[i];
      setBulkProgress({ current: i + 1, total: positionsToClose.length });
      try {
        const res = await fetch('/api/close-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradeId: p.tradeId, instrument: p.instrument })
        });
        const data = await res.json();
        if (data.success) {
          closedCount++;
          const pnlVal = parseFloat(p.unrealizedPL || '0');
          totalRealizedEst += p.pnlPositive ? pnlVal : -pnlVal;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 300));
    }

    setBulkProgress(null);
    const sign = totalRealizedEst >= 0 ? '+' : '-';
    setBulkResult(`Closed ${closedCount} of ${positionsToClose.length} position${positionsToClose.length !== 1 ? 's' : ''}. Est. P&L: ${sign}$${Math.abs(totalRealizedEst).toFixed(2)}`);
    fetchOandaData();
  };

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
      const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('meridian_autotrader_enabled') : null;
      const res = await fetch('/api/autotrader');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        // If localStorage has explicit user preference, ensure it is honored
        if (savedLocal !== null) {
          data.enabled = savedLocal === 'true';
        }
        // Merge stored auto list if available
        const storedList = getStoredAutoList();
        if (storedList && storedList.length > 0) {
          data.selectedInstruments = Array.from(new Set([...data.selectedInstruments, ...storedList]));
        }
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
        setAutotrader(prev => {
          if (!prev) return data.state;
          const currentEnabled = typeof window !== 'undefined'
            ? localStorage.getItem('meridian_autotrader_enabled') === 'true'
            : prev.enabled;
          return {
            ...data.state,
            enabled: currentEnabled
          };
        });
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

    if (typeof window !== 'undefined') {
      localStorage.setItem('meridian_autotrader_enabled', nextState ? 'true' : 'false');
    }

    // Optimistically set state so UI card immediately reflects state change
    setAutotrader(prev => prev ? { ...prev, enabled: nextState } : prev);

    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setAutotrader(prev => ({ ...data, enabled: nextState }));
        if (nextState) {
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

    setStoredAutoList(updated);
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
    const isCurrentlyEnabled = autotrader?.enabled ?? (typeof window !== 'undefined' ? localStorage.getItem('meridian_autotrader_enabled') === 'true' : true);
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: isCurrentlyEnabled,
          autoStopAt: isoTime,
          autoStopLabel: label
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAutotrader(prev => ({
          ...data,
          enabled: isCurrentlyEnabled
        }));
      }
    } catch {}
    setSavingSchedule(false);
  }, [autotrader?.enabled]);

  const handleCloseTrade = useCallback(async (tradeId: string, instrument: string) => {
    setClosingTradeId(tradeId);
    setCloseMsg(null);
    try {
      const res = await fetch('/api/close-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, instrument }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setCloseMsg({ id: tradeId, ok: false, text: data.error || 'Close failed' });
      } else {
        setCloseMsg({ id: tradeId, ok: true, text: `CLOSED @ ${data.closePrice} · P&L: ${parseFloat(data.realizedPL || '0') >= 0 ? '+' : ''}${data.realizedPL}` });
        setTimeout(() => fetchOandaData(), 1500);
      }
    } catch (e: any) {
      setCloseMsg({ id: tradeId, ok: false, text: `Network error: ${e.message}` });
    }
    setClosingTradeId(null);
  }, [fetchOandaData]);

  const handleClearSchedule = useCallback(async () => {
    setSavingSchedule(true);
    const isCurrentlyEnabled = autotrader?.enabled ?? (typeof window !== 'undefined' ? localStorage.getItem('meridian_autotrader_enabled') === 'true' : true);
    try {
      const res = await fetch('/api/autotrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: isCurrentlyEnabled,
          autoStopAt: null,
          autoStopLabel: null
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAutotrader(prev => ({
          ...data,
          enabled: isCurrentlyEnabled
        }));
      }
    } catch {}
    setSavingSchedule(false);
  }, [autotrader?.enabled]);

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
                transition: 'all 0.2s ease', minWidth: '170px',
                boxShadow: autotrader?.enabled ? '0 0 14px rgba(220,38,38,0.5)' : '0 0 14px rgba(22,163,74,0.5)',
              }}
            >
              {autoToggling ? 'UPDATING...' : autotrader?.enabled ? '⏹ STOP AUTO TRADING' : '▶ START AUTO TRADING'}
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
              onClick={() => { setShowRiskPanel(v => !v); setShowConfig(false); setShowScheduler(false); }}
              style={{
                padding: '11px 14px', border: '1px solid',
                borderColor: showRiskPanel ? '#22C55E' : (riskProfile.useTrailingStop ? '#16A34A' : '#D1D5DB'),
                backgroundColor: showRiskPanel ? '#1E293B' : (riskProfile.useTrailingStop ? '#F0FDF4' : 'transparent'),
                color: showRiskPanel ? '#FFFFFF' : (riskProfile.useTrailingStop ? '#15803D' : '#374151'),
                fontSize: '10px', cursor: 'pointer', ...mono, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              <span>🛡 RISK &amp; TRAILING STOPS</span>
              <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '3px', backgroundColor: riskProfile.useTrailingStop ? '#22C55E' : '#64748B', color: '#FFF' }}>
                {riskProfile.useTrailingStop ? 'TSL ON' : 'FIXED SL'}
              </span>
            </button>

            <button
              onClick={() => { setShowConfig(v => !v); setShowRiskPanel(false); setShowScheduler(false); }}
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
              onClick={() => { setShowScheduler(v => !v); setShowConfig(false); setShowRiskPanel(false); }}
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

        {/* ── Subpanel: Risk Management & Trailing Stop Controls ── */}
        {showRiskPanel && (
          <div style={{
            borderTop: `1px solid ${autotrader?.enabled ? '#1E293B' : '#E4E4DF'}`,
            padding: '16px 20px',
            backgroundColor: autotrader?.enabled ? '#0A0D12' : '#FFFFFF',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: autotrader?.enabled ? '#F8FAFC' : '#0F172A', letterSpacing: '0.8px' }}>
                  🛡 AUTOMATED RISK MANAGEMENT &amp; TRAILING STOP CONTROLS
                </div>
                <div style={{ fontSize: '9px', color: '#64748B', marginTop: '2px' }}>
                  Prevent profitable trades from turning into losses. Controls apply to all auto-executed trades on OANDA.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', ...mono, color: '#16A34A', fontWeight: 700 }}>
                {savingRisk ? 'SAVING...' : '✓ ACTIVE PROFILE'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Box 1: Trailing Stop Loss */}
              <div style={{ padding: '12px', backgroundColor: autotrader?.enabled ? '#1E293B' : '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A' }}>TRAILING STOP LOSS</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '9px', fontWeight: 700, color: riskProfile.useTrailingStop ? '#16A34A' : '#64748B' }}>
                    <input
                      type="checkbox"
                      checked={riskProfile.useTrailingStop}
                      onChange={e => handleSaveRiskProfile({ useTrailingStop: e.target.checked })}
                    />
                    {riskProfile.useTrailingStop ? 'ENABLED' : 'DISABLED'}
                  </label>
                </div>
                <div style={{ fontSize: '9px', color: '#64748B', marginBottom: '10px', lineHeight: 1.5 }}>
                  Trails price dynamically. If price moves in profit, SL moves up/down to lock gains.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '9px', color: '#475569', fontWeight: 600 }}>Trail Distance:</span>
                  <input
                    type="number"
                    value={riskProfile.trailingDistancePips}
                    onChange={e => handleSaveRiskProfile({ trailingDistancePips: Math.max(1, parseInt(e.target.value) || 15) })}
                    style={{ width: '60px', padding: '4px 6px', border: '1px solid #CBD5E1', fontSize: '10px', fontWeight: 700, ...mono }}
                  />
                  <span style={{ fontSize: '9px', color: '#64748B', ...mono }}>pips</span>
                </div>
              </div>

              {/* Box 2: Target SL & TP Pips */}
              <div style={{ padding: '12px', backgroundColor: autotrader?.enabled ? '#1E293B' : '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  SL / TP TARGETS &amp; R:R RATIO
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#475569' }}>Stop Loss (Pips):</span>
                    <input
                      type="number"
                      value={riskProfile.slPips}
                      onChange={e => handleSaveRiskProfile({ slPips: Math.max(5, parseInt(e.target.value) || 30) })}
                      style={{ width: '60px', padding: '4px 6px', border: '1px solid #CBD5E1', fontSize: '10px', fontWeight: 700, ...mono }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#475569' }}>Take Profit (Pips):</span>
                    <input
                      type="number"
                      value={riskProfile.tpPips}
                      onChange={e => handleSaveRiskProfile({ tpPips: Math.max(5, parseInt(e.target.value) || 60) })}
                      style={{ width: '60px', padding: '4px 6px', border: '1px solid #CBD5E1', fontSize: '10px', fontWeight: 700, ...mono }}
                    />
                  </div>
                  <div style={{ fontSize: '9px', color: '#1C3A5E', fontWeight: 700, borderTop: '1px solid #E2E8F0', paddingTop: '4px', textAlign: 'right', ...mono }}>
                    RISK/REWARD = 1 : {(riskProfile.tpPips / Math.max(1, riskProfile.slPips)).toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Box 3: Protection Options */}
              <div style={{ padding: '12px', backgroundColor: autotrader?.enabled ? '#1E293B' : '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  OANDA BROKER INTEGRATION
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '9px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={riskProfile.sendTpToOanda}
                      onChange={e => handleSaveRiskProfile({ sendTpToOanda: e.target.checked })}
                    />
                    <span>Submit Take Profit directly to OANDA on order fill</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#475569' }}>Break-Even Trigger:</span>
                    <input
                      type="number"
                      value={riskProfile.breakEvenTriggerPips}
                      onChange={e => handleSaveRiskProfile({ breakEvenTriggerPips: Math.max(5, parseInt(e.target.value) || 20) })}
                      style={{ width: '50px', padding: '4px 6px', border: '1px solid #CBD5E1', fontSize: '10px', fontWeight: 700, ...mono }}
                    />
                    <span style={{ color: '#64748B', ...mono }}>pips profit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: autotrader.enabled ? '#94A3B8' : '#1C3A5E', letterSpacing: '1px' }}>
                  AUTO-TRADING WATCHLIST (SELECT FROM ALL 65+ INSTRUMENTS):
                </div>
                <div style={{ fontSize: '9px', color: autotrader.enabled ? '#C8F135' : '#16A34A', fontWeight: 700 }}>
                  {autotrader.selectedInstruments?.length || 0} INSTRUMENTS SELECTED FOR AUTONOMOUS CYCLES
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '180px', overflowY: 'auto', padding: '8px', backgroundColor: autotrader.enabled ? '#1E293B' : '#F8FAFC', border: '1px solid #CBD5E1' }}>
                {INSTRUMENT_UNIVERSE.map(i => {
                  const isSelected = (autotrader.selectedInstruments || ['GBP/USD']).includes(i.symbol);
                  return (
                    <button
                      key={i.symbol}
                      onClick={() => handleToggleInstrument(i.symbol)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: isSelected ? '#16A34A' : (autotrader.enabled ? '#0F172A' : '#FFFFFF'),
                        color: isSelected ? '#FFFFFF' : (autotrader.enabled ? '#94A3B8' : '#475569'),
                        border: `1px solid ${isSelected ? '#16A34A' : (autotrader.enabled ? '#334155' : '#D1D5DB')}`,
                        fontSize: '9px', fontWeight: 700, cursor: 'pointer', ...mono,
                        display: 'flex', alignItems: 'center', gap: '4px',
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
              {SESSION_PRESETS.map(preset => {
                const isSelected = autotrader.autoStopLabel?.startsWith(preset.label);
                return (
                  <button
                    key={preset.label}
                    disabled={savingSchedule}
                    onClick={() => handleSetSchedule(buildStopTime(preset.utcHour, preset.utcMin), `${preset.label} ${preset.description}`)}
                    style={{
                      padding: '8px 14px', border: `2px solid ${isSelected ? '#F59E0B' : (autotrader.enabled ? '#334155' : '#D1D5DB')}`,
                      backgroundColor: isSelected ? '#FEF3C7' : (autotrader.enabled ? '#1E293B' : '#F9FAFB'),
                      color: isSelected ? '#92400E' : (autotrader.enabled ? '#F8FAFC' : '#374151'),
                      fontSize: '10px', fontWeight: isSelected ? 800 : 700, cursor: 'pointer', ...mono,
                      borderRadius: '3px',
                      boxShadow: isSelected ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected ? '✓ ' : ''}{preset.label}<br />
                    <span style={{ fontSize: '8px', color: isSelected ? '#B45309' : '#64748B' }}>{preset.description}</span>
                  </button>
                );
              })}
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
        <div style={{ border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.8px' }}>
                LIVE AUTONOMOUS CYCLE FEED
              </span>
              <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 400, letterSpacing: '0.3px' }}>— EVALUATION &amp; DECISION LOGS</span>
            </div>
            <div style={{ fontSize: '9px', color: '#94A3B8', ...mono }}>
              Cycles: <span style={{ color: '#1C3A5E', fontWeight: 700 }}>{autotrader.cycleCount}</span>
              {' · '}Last: {autotrader.lastCycleAt ? new Date(autotrader.lastCycleAt).toLocaleTimeString() : '—'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto', fontSize: '10px', ...mono }}>
            {autotrader.lastCycleLogs.slice(0, 10).map((logItem) => {
              const isExec = logItem.action === 'EXECUTED';
              const isRej = logItem.action === 'REJECTED';
              return (
                <div key={logItem.id} style={{
                  padding: '6px 10px',
                  backgroundColor: isExec ? '#F0FDF4' : (isRej ? '#FEF2F2' : '#F8FAFC'),
                  borderLeft: `3px solid ${isExec ? '#22C55E' : (isRej ? '#EF4444' : '#CBD5E1')}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#94A3B8', fontSize: '9px' }}>{logItem.timestamp}</span>
                    <span style={{ fontWeight: 700, color: '#1C3A5E' }}>{logItem.instrument}</span>
                    <span style={{
                      padding: '1px 6px', fontSize: '8px', fontWeight: 800,
                      backgroundColor: isExec ? '#22C55E' : (isRej ? '#EF4444' : '#64748B'),
                      color: '#FFFFFF',
                    }}>
                      {logItem.action}
                    </span>
                    {logItem.direction && (
                      <span style={{ fontWeight: 800, color: logItem.direction === 'BUY' ? '#16A34A' : '#DC2626' }}>
                        {logItem.direction} {logItem.units} units @ {logItem.price}
                      </span>
                    )}
                    <span style={{ color: '#475569' }}>{logItem.reason}</span>
                  </div>
                  {logItem.orderId && (
                    <span style={{ fontSize: '8px', color: '#94A3B8', flexShrink: 0 }}>ID: {logItem.orderId}</span>
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
          <button onClick={() => setChartModalInstrument({ symbol: inst.symbol, tvSymbol: inst.tvSymbol })} style={{
            padding: '2px 9px', backgroundColor: '#1C3A5E', color: '#C8F135', border: '1px solid #1C3A5E', fontSize: '9px', fontWeight: 700, cursor: 'pointer', ...mono, marginRight: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            📈 OPEN CHART
          </button>
          <button
            onClick={toggleChartTheme}
            title={`Switch to ${chartTheme === 'dark' ? 'Light' : 'Dark'} theme`}
            style={{
              padding: '2px 9px',
              backgroundColor: chartTheme === 'light' ? '#F8FAFC' : '#0F172A',
              color: chartTheme === 'light' ? '#0F172A' : '#C8F135',
              border: `1px solid ${chartTheme === 'light' ? '#CBD5E1' : '#334155'}`,
              fontSize: '9px', fontWeight: 700, cursor: 'pointer', ...mono, marginRight: '8px',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}
          >
            {chartTheme === 'dark' ? '☀ LIGHT' : '🌙 DARK'}
          </button>
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
        <div style={{ border: `1px solid ${chartTheme === 'light' ? '#E2E8F0' : '#1E293B'}`, backgroundColor: chartTheme === 'light' ? '#FFFFFF' : '#0A0D12', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: chartTheme === 'light' ? '#F8FAFC' : '#0F172A', color: chartTheme === 'light' ? '#0F172A' : '#F8FAFC', padding: '8px 14px', fontSize: '10px', borderBottom: `1px solid ${chartTheme === 'light' ? '#E2E8F0' : '#1E293B'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: chartTheme === 'light' ? '#64748B' : '#94A3B8' }}>TRADINGVIEW // <span style={{ fontWeight: 700, color: chartTheme === 'light' ? '#0F172A' : '#E2E8F0' }}>{inst.tvSymbol}</span></span>
            <span style={{ fontSize: '9px', color: chartTheme === 'light' ? '#1C3A5E' : '#C8F135', fontWeight: 600 }}>RSI · MACD · BB · EMA · VWAP</span>
          </div>
          <TradingViewChart symbol={inst.tvSymbol} interval={timeframe} theme={chartTheme} height={540} showSidebar />
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
          <div style={{ border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1C3A5E', display: 'inline-block' }} />
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.8px' }}>AI CO-PILOT</span>
              </div>
              <button onClick={handleAnalyse} disabled={aiLoading} style={{ padding: '3px 10px', backgroundColor: aiLoading ? '#F1F5F9' : '#1C3A5E', color: aiLoading ? '#94A3B8' : '#C8F135', border: `1px solid ${aiLoading ? '#E2E8F0' : '#1C3A5E'}`, fontSize: '9px', ...mono, cursor: aiLoading ? 'wait' : 'pointer', fontWeight: 700 }}>
                {aiLoading ? 'ANALYSING...' : 'RUN ANALYSIS →'}
              </button>
            </div>
            {aiError && <div style={{ fontSize: '9px', color: '#DC2626', marginBottom: '8px', padding: '6px 8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>{aiError}</div>}
            {aiAnalysis && aColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '3px 8px', backgroundColor: aColor.bg, color: aColor.text, border: `1px solid ${aColor.border}`, fontSize: '9px', fontWeight: 700 }}>{aiAnalysis.rating}</span>
                  <span style={{ color: '#64748B', fontSize: '9px', fontWeight: 600 }}>R:R {aiAnalysis.rrRatio}</span>
                </div>
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '9px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '9px', color: '#475569' }}>
                  <div>RSI: <span style={{ color: '#1C3A5E', fontWeight: 700 }}>{aiAnalysis.rsiContext}</span></div>
                  <div>MACD: <span style={{ color: '#1C3A5E', fontWeight: 700 }}>{aiAnalysis.macdContext}</span></div>
                  <div>BB: <span style={{ color: '#1C3A5E', fontWeight: 700 }}>{aiAnalysis.bbContext}</span></div>
                  <div>RISK: <span style={{ color: '#DC2626', fontWeight: 700 }}>{aiAnalysis.keyRisk}</span></div>
                  <div>CONSENSUS: <span style={{ color: '#1C3A5E', fontWeight: 700 }}>{aiAnalysis.consensusScore}</span></div>
                </div>
                <p style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.6, margin: 0, fontStyle: 'italic', borderLeft: '2px solid #E2E8F0', paddingLeft: '8px' }}>"{aiAnalysis.summary}"</p>
              </div>
            )}
            {!aiAnalysis && !aiLoading && (
              <div style={{ fontSize: '10px', color: '#94A3B8', textAlign: 'center', padding: '16px 0', lineHeight: 1.8 }}>
                Configure trade parameters<br />then click <strong style={{ color: '#1C3A5E' }}>RUN ANALYSIS</strong>.<br />
                <span style={{ fontSize: '9px' }}>AI co-pilot will evaluate your setup.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODE CLARITY BANNER ── */}
      <div style={{
        padding: '10px 16px',
        marginBottom: '16px',
        backgroundColor: autotrader?.enabled ? '#F0FDF4' : '#F0F9FF',
        border: `1px solid ${autotrader?.enabled ? '#86EFAC' : '#BAE6FD'}`,
        borderRadius: '2px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: '"DM Mono", monospace',
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: autotrader?.enabled ? '#22C55E' : '#0284C7',
            display: 'inline-block',
            boxShadow: autotrader?.enabled ? '0 0 8px rgba(34, 197, 94, 0.8)' : 'none'
          }} />
          <span style={{ fontWeight: 800, color: autotrader?.enabled ? '#166534' : '#0369A1', letterSpacing: '0.5px' }}>
            {autotrader?.enabled ? '⚡ AUTO-TRADING ENGINE ACTIVE' : '👤 MANUAL TRADING MODE'}
          </span>
          <span style={{ color: '#475569', fontSize: '10px' }}>
            — {autotrader?.enabled ? 'Algorithmic signals running. Manual trades & overrides permitted.' : 'Full operator manual control. Autonomous signals paused.'}
          </span>
        </div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: autotrader?.enabled ? '#15803D' : '#0284C7' }}>
          {autotrader?.enabled ? `LOTS: ${autotrader.lotUnits || 100} units` : 'MANUAL ROUTER READY'}
        </div>
      </div>

      {/* ── Closed Trades P&L Performance Analytics ── */}
      <div style={{ border: '1px solid #1C3A5E', backgroundColor: '#FFFFFF', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1C3A5E', letterSpacing: '0.8px' }}>
              CLOSED TRADES P&L PERFORMANCE
            </span>
            <span style={{ fontSize: '9px', padding: '2px 7px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700, border: '1px solid #CBD5E1' }}>
              {closedTradesStats.totalClosed} CLOSED TRADE{closedTradesStats.totalClosed !== 1 ? 'S' : ''} IN TIMEFRAME
            </span>
          </div>

          {/* Timeframe Selector Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>TIMEFRAME:</span>
            {(['1h', '3h', '6h', '24h', 'ALL', 'CUSTOM'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setPnlTimeframe(tf)}
                style={{
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: pnlTimeframe === tf ? '#1C3A5E' : '#F8FAFC',
                  color: pnlTimeframe === tf ? '#C8F135' : '#475569',
                  border: `1px solid ${pnlTimeframe === tf ? '#1C3A5E' : '#CBD5E1'}`,
                  ...mono
                }}
              >
                {tf === '1h' ? 'Last 1h' : tf === '3h' ? 'Last 3h' : tf === '6h' ? 'Last 6h' : tf === '24h' ? 'Last 24h' : tf === 'ALL' ? 'All Time' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Timeframe Hours Selector */}
        {pnlTimeframe === 'CUSTOM' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#F8FAFC', padding: '10px 14px', border: '1px solid #E2E8F0', marginBottom: '14px', fontSize: '11px' }}>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>Custom Window (Past Hours):</span>
            <input
              type="number"
              min="1"
              max="720"
              value={customPnlHours}
              onChange={(e) => setCustomPnlHours(e.target.value)}
              style={{ width: '80px', padding: '4px 8px', border: '1px solid #CBD5E1', fontSize: '11px', fontWeight: 700, ...mono }}
            />
            <span style={{ color: '#64748B', fontSize: '10px' }}>hours (e.g. 12 = last 12h, 48 = last 2 days)</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {/* Total Net P&L */}
          <div style={{ padding: '14px', backgroundColor: closedTradesStats.totalNet >= 0 ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${closedTradesStats.totalNet >= 0 ? '#86EFAC' : '#FCA5A5'}` }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', marginBottom: '4px' }}>TOTAL NET P&L</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: closedTradesStats.totalNet >= 0 ? '#15803D' : '#DC2626', ...mono }}>
              {closedTradesStats.totalNet >= 0 ? '+' : ''}${closedTradesStats.totalNet.toFixed(2)}
            </div>
            <div style={{ fontSize: '9px', color: '#64748B', marginTop: '4px' }}>
              Realized net outcome in selected timeframe
            </div>
          </div>

          {/* Standalone Profit */}
          <div style={{ padding: '14px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#166534', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ▲ STANDALONE PROFIT (PROFITABLE TRADES)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A', ...mono }}>
              +${closedTradesStats.grossProfit.toFixed(2)}
            </div>
            <div style={{ fontSize: '9px', color: '#15803D', marginTop: '4px', fontWeight: 700 }}>
              {closedTradesStats.winCount} winning trade{closedTradesStats.winCount !== 1 ? 's' : ''} in profit
            </div>
          </div>

          {/* Standalone Loss */}
          <div style={{ padding: '14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#991B1B', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ▼ STANDALONE LOSS (LOSING TRADES)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#DC2626', ...mono }}>
              -${closedTradesStats.grossLoss.toFixed(2)}
            </div>
            <div style={{ fontSize: '9px', color: '#B91C1C', marginTop: '4px', fontWeight: 700 }}>
              {closedTradesStats.lossCount} trade{closedTradesStats.lossCount !== 1 ? 's' : ''} closed as loss
            </div>
          </div>

          {/* Win Rate & Profit Factor */}
          <div style={{ padding: '14px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', letterSpacing: '0.5px', marginBottom: '4px' }}>
              WIN RATE & PROFIT FACTOR
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B', ...mono }}>
              {closedTradesStats.winRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '9px', color: '#475569', marginTop: '4px' }}>
              Profit Factor: <span style={{ fontWeight: 800, color: '#0F172A', ...mono }}>{closedTradesStats.profitFactor.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Open Positions ── */}
      <div style={{ border: '1px solid #1C3A5E', backgroundColor: '#FFFFFF' }}>
        {/* Header — always visible, click to collapse */}
        <div
          onClick={() => setPosCollapsed(v => !v)}
          style={{ backgroundColor: '#0F172A', padding: '10px 16px', fontSize: '10px', fontWeight: 700, color: '#C8F135', display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '1px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#4ADE80' }}>{posCollapsed ? '▶' : '▼'}</span>
            <span>● LIVE OPEN POSITIONS — OANDA {process.env.NEXT_PUBLIC_OANDA_ENVIRONMENT?.toUpperCase() || 'PRACTICE'}</span>
            <span style={{ padding: '1px 7px', backgroundColor: positions.length > 0 ? '#22C55E' : '#475569', color: '#FFFFFF', fontSize: '9px', fontWeight: 800 }}>{positions.length}</span>
            {positions.length > 0 && (() => {
              const totalUnrealized = positions.reduce((acc, p) => acc + (p.pnlPositive ? parseFloat(p.unrealizedPL) : -parseFloat(p.unrealizedPL)), 0);
              const winCount = positions.filter(p => p.pnlPositive).length;
              const lossCount = positions.filter(p => !p.pnlPositive).length;
              const pnlSign = totalUnrealized >= 0 ? '+' : '-';
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
                  <span style={{ fontSize: '10px', color: totalUnrealized >= 0 ? '#4ADE80' : '#F87171', fontWeight: 800, fontFamily: '"DM Mono", monospace' }}>
                    UNREALIZED: {pnlSign}${Math.abs(totalUnrealized).toFixed(2)}
                  </span>
                  <span style={{ fontSize: '9px', color: '#94A3B8' }}>
                    ({winCount}W / {lossCount}L)
                  </span>
                </div>
              );
            })()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {positions.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setBulkModalOpen(true); setBulkResult(null); }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  fontFamily: '"DM Mono", monospace',
                }}
              >
                ⚡ BULK ACTIONS
              </button>
            )}
            <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 400 }}>Refreshed {lastRefresh} (next in {refreshCountdown}s) · {posCollapsed ? 'click to expand' : 'click to collapse'}</span>
          </div>
        </div>

        {!posCollapsed && (
          <>
            {positions.length === 0 ? (
              <div style={{ padding: '14px 18px', fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>
                {oandaError ? `⚠ OANDA connection error: ${oandaError}` : 'No open positions on OANDA account.'}
              </div>
            ) : (
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', ...mono }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid #E4E4DF', color: '#6B7280', textAlign: 'left', backgroundColor: '#F7F7F5' }}>
                      {['INSTRUMENT', 'CHART', 'DIRECTION', 'UNITS', 'ENTRY', 'UNREALIZED P&L', 'OPENED / TIME HELD', 'DETAILS', 'CLOSE'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(p => (
                      <React.Fragment key={p.id}>
                        <tr
                          onMouseEnter={() => setHoveredRow(p.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderBottom: '1px solid #F0F0EC',
                            borderLeft: `4px solid ${p.pnlPositive ? '#22C55E' : '#EF4444'}`,
                            backgroundColor: hoveredRow === p.id ? '#F1F5F9' : (expandedPos === p.id ? '#F0F9FF' : (p.pnlPositive ? '#F0FDF4' : '#FFF5F5')),
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '9px 12px', fontWeight: 800, color: '#1C3A5E', fontSize: '11px' }}>{p.instrument}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <button
                              onClick={() => setChartModalInstrument({ symbol: p.instrument, tvSymbol: getTvSymbol(p.instrument) })}
                              style={{ padding: '2px 6px', backgroundColor: '#1C3A5E', color: '#C8F135', border: 'none', fontSize: '9px', fontWeight: 700, cursor: 'pointer', ...mono }}
                            >
                              📈 CHART
                            </button>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{ padding: '2px 7px', backgroundColor: p.direction === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: p.direction === 'BUY' ? '#166534' : '#991B1B', fontWeight: 800, border: `1px solid ${p.direction === 'BUY' ? '#86EFAC' : '#FCA5A5'}`, fontSize: '9px' }}>
                              <span style={{ animation: 'blink 1.5s infinite', display: 'inline-block', marginRight: '3px' }}>{p.direction === 'BUY' ? '▲' : '▼'}</span>
                              {p.direction === 'BUY' ? 'LONG' : 'SHORT'}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: 600 }}>{p.units}</td>
                          <td style={{ padding: '9px 12px' }}>{p.entryPrice}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 800, fontSize: '11px', color: p.pnlPositive ? '#16A34A' : '#DC2626' }}>{p.pnlSign}${p.unrealizedPL}</td>
                          <td style={{ padding: '9px 12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                            <div>{p.openedAt}</div>
                            <div style={{ fontSize: '8px', color: '#94A3B8', fontWeight: 600 }}>Held: {computeTimeHeld(p.openedAt)}</div>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <button
                              onClick={() => setExpandedPos(expandedPos === p.id ? null : p.id)}
                              style={{ padding: '3px 8px', backgroundColor: expandedPos === p.id ? '#1C3A5E' : '#F3F4F6', color: expandedPos === p.id ? '#FFFFFF' : '#374151', border: '1px solid #D1D5DB', fontSize: '9px', cursor: 'pointer', ...mono }}
                            >
                              {expandedPos === p.id ? '▲ HIDE' : '▼ EXPAND'}
                            </button>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <button
                                onClick={() => handleCloseTrade(p.tradeId, p.instrument)}
                                disabled={closingTradeId === p.tradeId}
                                style={{ padding: '4px 10px', backgroundColor: closingTradeId === p.tradeId ? '#9CA3AF' : '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '9px', fontWeight: 800, cursor: closingTradeId === p.tradeId ? 'wait' : 'pointer', ...mono, whiteSpace: 'nowrap' }}
                              >
                                {closingTradeId === p.tradeId ? 'CLOSING...' : '✕ CLOSE TRADE'}
                              </button>
                              {closeMsg?.id === p.tradeId && (
                                <div style={{ fontSize: '8px', color: closeMsg.ok ? '#16A34A' : '#DC2626', fontWeight: 700, maxWidth: '120px', lineHeight: 1.3 }}>
                                  {closeMsg.text}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedPos === p.id && (
                          <tr style={{ backgroundColor: '#EFF6FF', borderBottom: '2px solid #BFDBFE' }}>
                            <td colSpan={9} style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '10px' }}>
                                <div>
                                  <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px' }}>POSITION DETAILS</div>
                                  <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                    <div><span style={{ color: '#6B7280' }}>Trade ID: </span>{p.tradeId}</div>
                                    <div><span style={{ color: '#6B7280' }}>Opened: </span>{p.openedAt}</div>
                                    <div><span style={{ color: '#6B7280' }}>Financing: </span>{p.financing}</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px' }}>RISK LEVELS</div>
                                  <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                    <div><span style={{ color: '#6B7280' }}>Entry: </span><span style={{ fontWeight: 700 }}>{p.entryPrice}</span></div>
                                    <div><span style={{ color: '#EF4444' }}>Stop Loss: </span>{p.stopLossOrderID ? 'Active' : 'Not set'}</div>
                                    <div><span style={{ color: '#16A34A' }}>Take Profit: </span>{p.takeProfitOrderID ? 'Active' : 'Not set'}</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: '4px' }}>P&L BREAKDOWN</div>
                                  <div style={{ color: '#374151', lineHeight: 1.8 }}>
                                    <div><span style={{ color: '#6B7280' }}>Unrealized: </span><span style={{ fontWeight: 700, color: p.pnlPositive ? '#16A34A' : '#DC2626' }}>{p.pnlSign}${p.unrealizedPL}</span></div>
                                    <div><span style={{ color: '#6B7280' }}>Direction: </span>{p.direction}</div>
                                    <div><span style={{ color: '#6B7280' }}>Size: </span>{p.units} units</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#DC2626', fontWeight: 700, marginBottom: '4px' }}>CLOSE POSITION</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <button
                                      onClick={() => handleCloseTrade(p.tradeId, p.instrument)}
                                      disabled={closingTradeId === p.tradeId}
                                      style={{ padding: '6px 14px', backgroundColor: closingTradeId === p.tradeId ? '#9CA3AF' : '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '10px', fontWeight: 800, cursor: closingTradeId === p.tradeId ? 'wait' : 'pointer', ...mono }}
                                    >
                                      {closingTradeId === p.tradeId ? 'CLOSING POSITION...' : `✕ CLOSE ALL ${p.instrument}`}
                                    </button>
                                    <div style={{ fontSize: '8px', color: '#6B7280', lineHeight: 1.4 }}>Closes all {p.units} units at current market price via OANDA v20 REST API</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Execution Log ── */}
      <div style={{ border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF' }}>
        <div
          onClick={() => setLogCollapsed(v => !v)}
          style={{ backgroundColor: '#F7F7F5', padding: '10px 16px', fontSize: '10px', fontWeight: 700, borderBottom: '1px solid #E4E4DF', color: '#1C3A5E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px' }}>{logCollapsed ? '▶' : '▼'}</span>
            <span>EXECUTION LOG — AUTO + MANUAL TRADES</span>
            <span style={{ padding: '1px 7px', backgroundColor: '#1C3A5E', color: '#C8F135', fontSize: '9px', fontWeight: 800 }}>{execLog.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#6B7280', fontWeight: 400 }}>SOURCE: OANDA v20 REST API · Live</span>
            <button onClick={e => { e.stopPropagation(); fetchOandaData(); }} style={{ padding: '2px 8px', backgroundColor: '#1C3A5E', color: '#FFFFFF', border: 'none', fontSize: '9px', cursor: 'pointer', ...mono }}>↻ REFRESH</button>
          </div>
        </div>
        {oandaError && !logCollapsed && (
          <div style={{ padding: '10px 16px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FCA5A5', fontSize: '9px', color: '#991B1B' }}>
            ⚠ {oandaError} — Showing any locally cached data.
          </div>
        )}
        {!logCollapsed && (<div style={{ maxHeight: '380px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', ...mono }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
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
                                {entry.signal ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {entry.signal.split(' | ').map((part, idx) => (
                                      <div key={idx} style={{
                                        color: part.startsWith('[AUTOMATED') ? '#1E40AF' : (part.includes('RiskGate: APPROVED') ? '#166534' : '#1E293B'),
                                        fontWeight: part.startsWith('[AUTOMATED') || part.includes('APPROVED') ? 700 : 400
                                      }}>
                                        {part}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                                    {entry.type === 'AUTO'
                                      ? 'Automated technical signal — see Live Autonomous Cycle Feed above'
                                      : 'Placed via OANDA platform or MERIDIAN manual desk'}
                                  </span>
                                )}
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
        </div>)}
      </div>

      {/* ── BULK ACTIONS MODAL ── */}
      {bulkModalOpen && (
        <div
          onClick={() => setBulkModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC',
              width: '100%', maxWidth: '520px', padding: '24px', borderRadius: '4px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', fontFamily: '"DM Mono", monospace'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626', letterSpacing: '1px' }}>
                ⚡ BULK CLOSE OPERATIONS
              </div>
              <button onClick={() => setBulkModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            {bulkProgress ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '12px', color: '#C8F135', marginBottom: '12px', fontWeight: 700 }}>
                  CLOSING POSITIONS ({bulkProgress.current} / {bulkProgress.total})...
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#1E293B', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, height: '100%', backgroundColor: '#DC2626', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            ) : bulkResult ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#4ADE80', fontWeight: 800, marginBottom: '16px' }}>{bulkResult}</div>
                <button onClick={() => { setBulkResult(null); setBulkModalOpen(false); }} style={{ padding: '8px 20px', backgroundColor: '#1C3A5E', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', ...mono }}>
                  DONE
                </button>
              </div>
            ) : bulkConfirmPending ? (
              <div style={{ backgroundColor: '#1E293B', padding: '16px', border: '1px solid #DC2626', marginBottom: '16px' }}>
                <div style={{ color: '#EF4444', fontWeight: 800, fontSize: '12px', marginBottom: '8px' }}>⚠️ CONFIRM BULK EXECUTION</div>
                <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '16px' }}>
                  You are about to execute a bulk close for <strong>{
                    bulkFilter === 'all' ? positions.length :
                    bulkFilter === 'profitable' ? positions.filter(p => p.pnlPositive).length :
                    bulkFilter === 'losing' ? positions.filter(p => !p.pnlPositive).length :
                    positions.filter(p => p.instrument === bulkInstrument).length
                  } position(s)</strong> via OANDA API.
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setBulkConfirmPending(false)} style={{ padding: '8px 14px', backgroundColor: '#334155', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, ...mono }}>CANCEL</button>
                  <button onClick={() => {
                    let toClose = positions;
                    if (bulkFilter === 'profitable') toClose = positions.filter(p => p.pnlPositive);
                    if (bulkFilter === 'losing') toClose = positions.filter(p => !p.pnlPositive);
                    if (bulkFilter === 'instrument') toClose = positions.filter(p => p.instrument === bulkInstrument);
                    handleBulkClose(toClose);
                  }} style={{ padding: '8px 16px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 800, ...mono }}>
                    CONFIRM EXECUTE →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Section A — By Filter */}
                <div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px', marginBottom: '10px' }}>
                    SECTION A — CLOSE ALL BY FILTER ({positions.length} OPEN)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => { setBulkFilter('profitable'); setBulkConfirmPending(true); }}
                      disabled={positions.filter(p => p.pnlPositive).length === 0}
                      style={{ padding: '12px', backgroundColor: '#166534', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: positions.filter(p => p.pnlPositive).length === 0 ? 0.4 : 1, textAlign: 'left', ...mono }}
                    >
                      <div>✕ CLOSE ALL PROFITABLE</div>
                      <div style={{ fontSize: '9px', color: '#86EFAC', fontWeight: 400, marginTop: '4px' }}>
                        {positions.filter(p => p.pnlPositive).length} trade(s) in profit
                      </div>
                    </button>
                    <button
                      onClick={() => { setBulkFilter('losing'); setBulkConfirmPending(true); }}
                      disabled={positions.filter(p => !p.pnlPositive).length === 0}
                      style={{ padding: '12px', backgroundColor: '#991B1B', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: positions.filter(p => !p.pnlPositive).length === 0 ? 0.4 : 1, textAlign: 'left', ...mono }}
                    >
                      <div>✕ CLOSE ALL LOSING</div>
                      <div style={{ fontSize: '9px', color: '#FCA5A5', fontWeight: 400, marginTop: '4px' }}>
                        {positions.filter(p => !p.pnlPositive).length} trade(s) in loss
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={() => { setBulkFilter('all'); setBulkConfirmPending(true); }}
                    style={{ width: '100%', marginTop: '10px', padding: '12px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px', ...mono }}
                  >
                    🚨 EMERGENCY CLOSE ALL {positions.length} OPEN POSITIONS
                  </button>
                </div>

                {/* Section B — By Instrument */}
                <div style={{ borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px', marginBottom: '10px' }}>
                    SECTION B — CLOSE BY SPECIFIC INSTRUMENT
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={bulkInstrument}
                      onChange={e => setBulkInstrument(e.target.value)}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', ...mono, fontSize: '11px' }}
                    >
                      <option value="">Select Instrument...</option>
                      {Array.from(new Set(positions.map(p => p.instrument))).map(sym => (
                        <option key={sym} value={sym}>
                          {sym} ({positions.filter(p => p.instrument === sym).length} trade(s))
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!bulkInstrument}
                      onClick={() => { setBulkFilter('instrument'); setBulkConfirmPending(true); }}
                      style={{ padding: '8px 16px', backgroundColor: bulkInstrument ? '#1C3A5E' : '#334155', color: bulkInstrument ? '#C8F135' : '#64748B', border: '1px solid #334155', fontWeight: 800, cursor: bulkInstrument ? 'pointer' : 'not-allowed', ...mono }}
                    >
                      CLOSE PAIR →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHART MODAL OVERLAY ── */}
      {chartModalInstrument && (
        <div
          onClick={() => setChartModalInstrument(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)',
            zIndex: 9998, display: 'flex', flexDirection: 'column', padding: '24px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1,
              backgroundColor: chartTheme === 'light' ? '#FFFFFF' : '#0F172A',
              border: `1px solid ${chartTheme === 'light' ? '#E2E8F0' : '#1E293B'}`,
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: chartTheme === 'light' ? '#F8FAFC' : '#1E293B',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: `1px solid ${chartTheme === 'light' ? '#E2E8F0' : '#334155'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', ...mono }}>LIVE CHART</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: chartTheme === 'light' ? '#0F172A' : '#F8FAFC', letterSpacing: '0.5px', ...mono }}>
                    {chartModalInstrument.symbol}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.value}
                      onClick={() => setChartModalTimeframe(tf.value)}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: chartModalTimeframe === tf.value ? '#1C3A5E' : (chartTheme === 'light' ? '#FFFFFF' : '#0F172A'),
                        color: chartModalTimeframe === tf.value ? '#C8F135' : (chartTheme === 'light' ? '#64748B' : '#94A3B8'),
                        border: `1px solid ${chartModalTimeframe === tf.value ? '#1C3A5E' : (chartTheme === 'light' ? '#E2E8F0' : '#334155')}`,
                        fontSize: '10px', cursor: 'pointer', ...mono
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Theme toggle inside modal */}
                <button
                  onClick={toggleChartTheme}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: chartTheme === 'light' ? '#0F172A' : '#F8FAFC',
                    color: chartTheme === 'light' ? '#C8F135' : '#0F172A',
                    border: 'none', fontSize: '9px', fontWeight: 700,
                    cursor: 'pointer', ...mono, letterSpacing: '0.5px'
                  }}
                >
                  {chartTheme === 'dark' ? '☀ LIGHT MODE' : '🌙 DARK MODE'}
                </button>
                <button
                  onClick={() => setChartModalInstrument(null)}
                  style={{ background: 'none', border: 'none', color: chartTheme === 'light' ? '#64748B' : '#94A3B8', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}
                >✕</button>
              </div>
            </div>
            {/* Chart */}
            <div style={{ flex: 1, backgroundColor: chartTheme === 'light' ? '#FFFFFF' : '#0A0D12' }}>
              <TradingViewChart symbol={chartModalInstrument.tvSymbol} interval={chartModalTimeframe} theme={chartTheme} height={600} showSidebar />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ── Suspense wrapper required by Next.js 15 for useSearchParams() ─────────────
export default function TradePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0F172A', color: '#C8F135', fontFamily: '"DM Mono", monospace', fontSize: '13px', letterSpacing: '1px' }}>
        MERIDIAN TERMINAL — LOADING TRADE DESK...
      </div>
    }>
      <TradePageInner />
    </Suspense>
  );
}
