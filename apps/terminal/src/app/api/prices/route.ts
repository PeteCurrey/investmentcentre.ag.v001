/**
 * GET /api/prices
 *
 * Returns live mid prices for all 8 instruments traded by Meridian.
 * DATA INTEGRITY RULE 2: This route MUST NOT return any hardcoded price constant.
 *   - FX instruments + XAU/USD: OANDA REST v3 pricing endpoint (mid of bid/ask).
 *   - SPX 500 (SPY): Finnhub quote API.
 *   - On any upstream failure the instrument is omitted from the response
 *     and a `warnings` array is returned, so the UI can show "price unavailable"
 *     rather than a stale constant.
 *   - `change` is computed as (mid - previousClose) / previousClose * 100 where available.
 *   - `age` is computed from the OANDA price timestamp (seconds since last update).
 */

import { NextResponse } from 'next/server';
import { FinnhubAdapter } from '@meridian/adapters';
import { OandaBrokerAdapter, getOandaApiKey } from '@meridian/execute';
import { requireSession } from '../../../lib/auth';

// All instruments Meridian can trade, in OANDA instrument format
const FX_AND_METAL_INSTRUMENTS = [
  'GBP_USD',
  'EUR_USD',
  'USD_JPY',
  'EUR_GBP',
  'XAU_USD',
];

// Display name map: OANDA instrument -> UI label
const DISPLAY_NAME: Record<string, string> = {
  GBP_USD: 'GBP/USD',
  EUR_USD: 'EUR/USD',
  USD_JPY: 'USD/JPY',
  EUR_GBP: 'EUR/GBP',
  XAU_USD: 'XAU/USD',
};

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED: Valid session required.' }, { status: 401 });
  }

  const token = getOandaApiKey();
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';

  if (!token || !accountId) {
    return NextResponse.json(
      { error: 'OANDA credentials not configured on server.' },
      { status: 503 }
    );
  }

  const prices: Record<string, { price: string; change: string; source: string; age: number }> = {};
  const warnings: string[] = [];
  const fetchedAt = Date.now();

  // ── 1. Fetch FX + XAU from OANDA pricing API ─────────────────────────────
  const adapter = new OandaBrokerAdapter({ apiKey: token, accountId, environment: env });

  try {
    const baseUrl =
      env === 'live'
        ? 'https://api-fxtrade.oanda.com/v3'
        : 'https://api-fxpractice.oanda.com/v3';

    const instrumentList = FX_AND_METAL_INSTRUMENTS.join(',');
    const res = await fetch(
      `${baseUrl}/accounts/${accountId}/pricing?instruments=${encodeURIComponent(instrumentList)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      warnings.push(`OANDA pricing API error: HTTP ${res.status} ${res.statusText}`);
    } else {
      const raw = (await res.json()) as any;
      const pricesArr: any[] = Array.isArray(raw.prices) ? raw.prices : [];

      for (const p of pricesArr) {
        const oandaKey: string = p.instrument;
        const displayKey = DISPLAY_NAME[oandaKey];
        if (!displayKey) continue;

        const bid = parseFloat(p.bids?.[0]?.price || p.closeoutBid || '0');
        const ask = parseFloat(p.asks?.[0]?.price || p.closeoutAsk || '0');
        if (bid <= 0 || ask <= 0) {
          warnings.push(`${displayKey}: received invalid bid/ask (bid=${bid}, ask=${ask})`);
          continue;
        }

        const mid = (bid + ask) / 2;

        // Determine decimal places: JPY pairs = 3, metals = 2, FX = 5
        let dp = 5;
        if (oandaKey.includes('JPY')) dp = 3;
        else if (oandaKey.startsWith('XAU') || oandaKey.startsWith('XAG')) dp = 2;
        const priceStr = mid.toFixed(dp);

        // Change: compute from previous close price if available
        let changeStr = 'N/A';
        if (p.closeoutBid && p.closeoutAsk) {
          // OANDA doesn't provide yesterday's close in the pricing endpoint.
          // Use tradeable status instead — mark as N/A when non-tradeable
          if (p.status === 'non-tradeable') {
            changeStr = 'N/A';
          }
        }
        // If a daily candlestick endpoint were called we'd get real % change.
        // For now we report "N/A" for change — never fabricate it.

        // Age: seconds since last OANDA price update
        let ageSecs = 0;
        if (p.time) {
          ageSecs = Math.round((fetchedAt - new Date(p.time).getTime()) / 1000);
        }

        prices[displayKey] = {
          price: priceStr,
          change: changeStr,
          source: 'oanda',
          age: ageSecs,
        };
      }
    }
  } catch (e: any) {
    warnings.push(`OANDA pricing fetch exception: ${e.message}`);
  }

  // ── 2. Fetch SPX 500 from Finnhub ─────────────────────────────────────────
  try {
    const fh = new FinnhubAdapter();
    const fhRes = await fh.fetch({ start: '', end: '' });
    if (!fhRes.success) {
      warnings.push(`Finnhub error: ${fhRes.error.message}`);
    } else {
      const payload = fhRes.value.payload as Record<string, any>;
      if (typeof payload?.c === 'number' && payload.c > 0) {
        const currentPrice: number = payload.c;
        const previousClose: number = typeof payload.pc === 'number' && payload.pc > 0 ? payload.pc : currentPrice;
        const changePct = previousClose > 0
          ? ((currentPrice - previousClose) / previousClose) * 100
          : 0;
        const changeStr = changePct >= 0
          ? `+${changePct.toFixed(2)}%`
          : `${changePct.toFixed(2)}%`;

        // Age from OANDA-fetched timestamp
        const ts: number = typeof payload.t === 'number' ? payload.t * 1000 : fetchedAt;
        const ageSecs = Math.round((fetchedAt - ts) / 1000);

        prices['SPX 500'] = {
          price: currentPrice.toFixed(2),
          change: changeStr,
          source: 'finnhub',
          age: Math.max(0, ageSecs),
        };
      } else {
        warnings.push('Finnhub: SPX price missing or zero in payload');
      }
    }
  } catch (e: any) {
    warnings.push(`Finnhub fetch exception: ${e.message}`);
  }

  // BTC/USD: no configured live feed. Return explicit unavailable instead of fabricated price.
  // TODO: configure a real BTC feed (e.g. Coinbase Advanced Trade API) and implement here.
  prices['BTC/USD'] = {
    price: 'UNAVAILABLE',
    change: 'N/A',
    source: 'none',
    age: -1,
  };

  return NextResponse.json({
    status: warnings.length === 0 ? 'OK' : 'PARTIAL',
    timestamp: new Date(fetchedAt).toISOString(),
    prices,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}
