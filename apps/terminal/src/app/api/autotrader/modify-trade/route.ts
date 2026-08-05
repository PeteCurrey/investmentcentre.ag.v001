import { NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/auth';

const OANDA_BASE = {
  practice: 'https://api-fxpractice.oanda.com/v3',
  live: 'https://api-fxtrade.oanda.com/v3',
};

export async function POST(request: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';
  const baseUrl = OANDA_BASE[env];

  if (!token || !accountId) {
    return NextResponse.json({ error: 'OANDA credentials not configured on server' }, { status: 500 });
  }

  const body = await request.json() as {
    tradeId: string;
    action: 'trailing_stop' | 'move_sl' | 'move_tp' | 'break_even';
    value?: string;
  };

  const { tradeId, action, value } = body;
  if (!tradeId || !action) {
    return NextResponse.json({ error: 'tradeId and action are required' }, { status: 400 });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const endpoint = `${baseUrl}/accounts/${accountId}/trades/${tradeId}/orders`;
  let payload: Record<string, unknown> = {};

  switch (action) {
    case 'trailing_stop':
      if (!value) return NextResponse.json({ error: 'value (pip distance) required' }, { status: 400 });
      payload = { trailingStopLoss: { timeInForce: 'GTC', distance: value } };
      break;
    case 'move_sl':
      if (!value) return NextResponse.json({ error: 'value (SL price) required' }, { status: 400 });
      payload = { stopLoss: { timeInForce: 'GTC', price: value } };
      break;
    case 'move_tp':
      if (!value) return NextResponse.json({ error: 'value (TP price) required' }, { status: 400 });
      payload = { takeProfit: { timeInForce: 'GTC', price: value } };
      break;
    case 'break_even':
      if (!value) return NextResponse.json({ error: 'value (entry price) required' }, { status: 400 });
      payload = { stopLoss: { timeInForce: 'GTC', price: value } };
      break;
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  try {
    const res = await fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify(payload) });
    const text = await res.text();
    let data: unknown = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) {
      return NextResponse.json({ error: `OANDA error (${res.status}): ${text}`, raw: data }, { status: res.status });
    }
    return NextResponse.json({ success: true, action, tradeId, value, oandaResponse: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Network error: ${msg}` }, { status: 502 });
  }
}
