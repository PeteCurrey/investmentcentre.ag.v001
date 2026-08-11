import { NextResponse } from 'next/server';
import { getOandaApiKey } from '@meridian/execute';
import { readCycleLogTradeMap } from '@meridian/core';
import { requireSession } from '../../../lib/auth';

const getDecimalPlaces = (instrument: string): number => {
  if (instrument.includes('JPY')) return 3;
  if (instrument.startsWith('XAU') || instrument.startsWith('XAG')) return 2;
  if (
    instrument === 'SPX500_USD' ||
    instrument === 'NAS100_USD' ||
    instrument === 'US30_USD' ||
    instrument === 'WTICO_USD' ||
    instrument === 'BCO_USD' ||
    instrument === 'BTC_USD'
  ) return 2;
  return 5;
};

const formatSymbol = (s: string): string => s.replace('_', '/');

// ─── Types for OANDA API responses ───────────────────────────────────────────
interface OandaOrderRef {
  id?: string;
  price?: string;      // for fixed SL / TP
  distance?: string;   // for trailing stop
  trailingStopValue?: string; // current trailing stop price
  type?: string;
  state?: string;
}

interface OandaTrade {
  id: string;
  instrument: string;
  price?: string;
  currentUnits?: string;
  initialUnits?: string;
  unrealizedPL?: string;
  realizedPL?: string;
  financing?: string;
  openTime?: string;
  closeTime?: string;
  averageClosePrice?: string;
  state?: string;
  // OANDA returns nested order objects on /openTrades, not flat ID strings
  stopLossOrder?: OandaOrderRef;
  trailingStopLossOrder?: OandaOrderRef;
  takeProfitOrder?: OandaOrderRef;
  // Flat ID strings are returned on /trades history endpoint
  stopLossOrderID?: string;
  trailingStopLossOrderID?: string;
  takeProfitOrderID?: string;
}

interface OandaAccountSummary {
  account?: {
    balance?: string;
    NAV?: string;
    unrealizedPL?: string;
    pl?: string;
    openTradeCount?: number;
    currency?: string;
  };
}

// ─── GET /api/oanda-positions ────────────────────────────────────────────────

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const token = getOandaApiKey();
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = process.env.OANDA_ENVIRONMENT || 'practice';
  const baseUrl =
    env === 'live'
      ? 'https://api-fxtrade.oanda.com/v3'
      : 'https://api-fxpractice.oanda.com/v3';

  if (!token || !accountId) {
    return NextResponse.json({
      success: false,
      error: 'OANDA credentials not configured',
      positions: [],
      execLog: [],
      account: null,
    });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Accept-Datetime-Format': 'RFC3339',
  };

  try {
    // Fetch OANDA data and the Supabase trade map concurrently.
    const [openRes, tradesRes, accountRes, instRes, localMap] = await Promise.all([
      fetch(`${baseUrl}/accounts/${accountId}/openTrades`, { headers }),
      fetch(`${baseUrl}/accounts/${accountId}/trades?state=ALL&count=500`, { headers }),
      fetch(`${baseUrl}/accounts/${accountId}/summary`, { headers }),
      fetch(`${baseUrl}/accounts/${accountId}/instruments`, { headers }),
      readCycleLogTradeMap(),
    ]);

    const openData: { trades?: OandaTrade[] } = openRes.ok
      ? await openRes.json()
      : { trades: [] };

    let tradesData: { trades?: OandaTrade[] } = { trades: [] };
    let tradesFetchError: string | null = null;
    if (tradesRes.ok) {
      tradesData = await tradesRes.json();
    } else {
      tradesFetchError = `OANDA trades fetch failed: HTTP ${tradesRes.status}`;
      try {
        const errBody = await tradesRes.text();
        tradesFetchError += ` — ${errBody.substring(0, 200)}`;
      } catch {}
    }

    const accountData: OandaAccountSummary | null = accountRes.ok
      ? await accountRes.json()
      : null;

    let accountInstruments: string[] = [];
    if (instRes.ok) {
      try {
        const instData = (await instRes.json()) as { instruments?: Array<{ name: string }> };
        if (Array.isArray(instData.instruments)) {
          accountInstruments = instData.instruments.map((i) => i.name).filter(Boolean);
        }
      } catch {}
    }

    const openTrades: OandaTrade[] = openData.trades ?? [];
    const allTrades: OandaTrade[] = tradesData.trades ?? [];

    // ── Live open positions (with P&L) ──────────────────────────────────────
    const positions = openTrades.map((t) => {
      const dp = getDecimalPlaces(t.instrument);
      const rawUnits = parseFloat(t.currentUnits ?? '0');
      const pnl = parseFloat(t.unrealizedPL ?? '0');

      // OANDA /openTrades returns nested objects; /trades returns flat IDs.
      // Support both formats.
      const slOrderId   = t.stopLossOrder?.id          ?? t.stopLossOrderID          ?? null;
      const tslOrderId  = t.trailingStopLossOrder?.id  ?? t.trailingStopLossOrderID  ?? null;
      const tpOrderId   = t.takeProfitOrder?.id        ?? t.takeProfitOrderID        ?? null;

      // Extract prices/distances for display in the UI
      const slPrice     = t.stopLossOrder?.price        ?? null;
      const tslDistance = t.trailingStopLossOrder?.distance        ?? null;
      const tslValue    = t.trailingStopLossOrder?.trailingStopValue ?? null;
      const tpPrice     = t.takeProfitOrder?.price      ?? null;

      return {
        id: t.id,
        instrument: formatSymbol(t.instrument),
        direction: rawUnits > 0 ? 'BUY' : 'SELL',
        units: Math.abs(rawUnits).toLocaleString(),
        entryPrice: parseFloat(t.price ?? '0').toFixed(dp),
        unrealizedPL: Math.abs(pnl).toFixed(2),
        pnlSign: pnl >= 0 ? '+' : '-',
        pnlPositive: pnl >= 0,
        openedAt: t.openTime
          ? new Date(t.openTime).toISOString().replace('T', ' ').substring(0, 19)
          : '—',
        tradeId: t.id,
        financing: parseFloat(t.financing ?? '0').toFixed(4),
        stopLossOrderID:          slOrderId,
        trailingStopLossOrderID:  tslOrderId,
        takeProfitOrderID:        tpOrderId,
        stopLossPrice:            slPrice,
        trailingStopDistance:     tslDistance,
        trailingStopValue:        tslValue,
        takeProfitPrice:          tpPrice,
      };
    });

    // ── Full trade history with matched cycle_log rationale ─────────────────
    const execLog = allTrades.map((t) => {
      const dp = getDecimalPlaces(t.instrument);
      const initialUnits = parseFloat(t.initialUnits ?? '0');
      const direction = initialUnits > 0 ? 'BUY' : 'SELL';
      const isClosed = t.state === 'CLOSED';
      const pnl = parseFloat(
        isClosed ? (t.realizedPL ?? '0') : (t.unrealizedPL ?? '0')
      );
      const symbolFormatted = formatSymbol(t.instrument);

      // Match against Supabase cycle_log by raw OANDA trade ID only.
      // A trade is AUTO only when a cycle_log row proves it passed through this system.
      // Absence is the correct output for unknown data — never a plausible substitute.
      const matchedLocal = localMap[t.id] ?? null;

      const isAuto = matchedLocal !== null &&
        (matchedLocal.action === 'EXECUTED' ||
         matchedLocal.action === 'OBSERVE_EVAL' ||
         matchedLocal.action === 'PAPER_FILL');

      const isManualDesk = matchedLocal !== null &&
        matchedLocal.action === 'EXECUTED' &&
        typeof matchedLocal.reason === 'string' &&
        matchedLocal.reason.startsWith('[MANUAL DESK]');

      const tierLabel = isManualDesk ? 'MANUAL DESK' : isAuto ? 'AUTO (TIER 4)' : 'EXTERNAL';

      // signal is null when there is no matching cycle_log row.
      // Do not construct plausible text for unmatched trades.
      const signalReasoning: string | null = matchedLocal?.reason ?? null;

      return {
        id: `oanda_${t.id}`,
        timestamp: t.openTime
          ? new Date(t.openTime).toISOString().replace('T', ' ').substring(0, 19)
          : '—',
        type: isAuto ? ('AUTO' as const) : ('EXTERNAL' as const),
        instrument: symbolFormatted,
        direction: direction as 'BUY' | 'SELL',
        units: Math.abs(initialUnits).toLocaleString(),
        fillPrice: parseFloat(t.price ?? '0').toFixed(dp),
        closePrice: t.averageClosePrice
          ? parseFloat(t.averageClosePrice).toFixed(dp)
          : undefined,
        pnl: Math.abs(pnl).toFixed(2),
        pnlSign: pnl >= 0 ? '+' : '-',
        pnlPositive: pnl >= 0,
        status: isClosed ? 'CLOSED' : 'OPEN',
        orderId: `OANDA-${t.id}`,
        tier: tierLabel,
        signal: signalReasoning,
        closedAt: t.closeTime
          ? new Date(t.closeTime).toISOString().replace('T', ' ').substring(0, 19)
          : undefined,
      };
    });

    const acc = accountData?.account;
    const account = acc
      ? {
          balance: parseFloat(acc.balance ?? '0').toFixed(2),
          nav: parseFloat(acc.NAV ?? '0').toFixed(2),
          unrealizedPL: Math.abs(parseFloat(acc.unrealizedPL ?? '0')).toFixed(2),
          pnlPositive: parseFloat(acc.unrealizedPL ?? '0') >= 0,
          realizedPL: Math.abs(parseFloat(acc.pl ?? '0')).toFixed(2),
          realizedPnlPositive: parseFloat(acc.pl ?? '0') >= 0,
          openTradesCount: acc.openTradeCount ?? 0,
          currency: acc.currency ?? 'USD',
        }
      : null;

    return NextResponse.json({
      success: true,
      positions,
      execLog,
      account,
      accountInstruments,
      tradesFetchError,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      success: false,
      error: `OANDA_FETCH_ERROR: ${message}`,
      positions: [],
      execLog: [],
      account: null,
      accountInstruments: [],
    });
  }
}
