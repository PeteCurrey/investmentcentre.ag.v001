import { NextResponse } from 'next/server';
import { requireSession } from '../../../lib/auth';

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = process.env.OANDA_ENVIRONMENT || 'practice';
  const baseUrl = env === 'live'
    ? 'https://api-fxtrade.oanda.com/v3'
    : 'https://api-fxpractice.oanda.com/v3';

  if (!token || !accountId) {
    return NextResponse.json({ error: 'No OANDA credentials' });
  }

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept-Datetime-Format': 'RFC3339' };

  try {
    const tradesRes = await fetch(`${baseUrl}/accounts/${accountId}/trades?state=ALL&count=500`, { headers });
    const tradesRaw = tradesRes.ok ? await tradesRes.text() : null;
    const tradesData = tradesRaw ? JSON.parse(tradesRaw) : { error: `HTTP ${tradesRes.status}` };

    // Also get account summary for comparison
    const accountRes = await fetch(`${baseUrl}/accounts/${accountId}/summary`, { headers });
    const accountData = accountRes.ok ? await accountRes.json() : { error: 'account fetch failed' };

    const rawTrades = (tradesData.trades || []).map((t: any) => ({
      id: t.id,
      instrument: t.instrument,
      state: t.state,
      openTime: t.openTime,
      closeTime: t.closeTime,
      realizedPL: t.realizedPL,
      unrealizedPL: t.unrealizedPL,
      initialUnits: t.initialUnits,
      currentUnits: t.currentUnits,
      averageClosePrice: t.averageClosePrice,
      price: t.price,
    }));

    return NextResponse.json({
      tradeCount: rawTrades.length,
      trades: rawTrades,
      accountPL: accountData?.account?.pl,
      accountUnrealizedPL: accountData?.account?.unrealizedPL,
      accountNAV: accountData?.account?.NAV,
      accountBalance: accountData?.account?.balance,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
