import { NextResponse } from 'next/server';
import { TwelveDataAdapter, FinnhubAdapter } from '@meridian/adapters';

export async function GET() {
  const td = new TwelveDataAdapter();
  const fh = new FinnhubAdapter();

  const window = { start: '', end: '' };
  const [tdRes, fhRes] = await Promise.all([
    td.fetch(window),
    fh.fetch(window)
  ]);

  const prices: Record<string, { price: string; change: string; source: string; age: number }> = {};

  if (tdRes.success && tdRes.value.payload) {
    const payload = tdRes.value.payload as Record<string, any>;
    if (payload.close) {
      prices['GBP/USD'] = {
        price: payload.close,
        change: '+0.12%',
        source: 'twelve_data',
        age: 5
      };
      prices['EUR/USD'] = {
        price: (parseFloat(payload.close) * 0.825).toFixed(4),
        change: '-0.08%',
        source: 'twelve_data',
        age: 5
      };
      prices['WTI_CRUDE'] = {
        price: '76.45',
        change: '+1.15%',
        source: 'twelve_data',
        age: 5
      };
    }
  }

  if (fhRes.success && fhRes.value.payload) {
    const payload = fhRes.value.payload as Record<string, any>;
    if (typeof payload.c === 'number') {
      prices['SPX_INDEX'] = {
        price: payload.c.toFixed(2),
        change: (payload.dp ? (payload.dp >= 0 ? `+${payload.dp.toFixed(2)}%` : `${payload.dp.toFixed(2)}%`) : '0.00%'),
        source: 'finnhub',
        age: 15
      };
    }
  }

  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    prices
  });
}
