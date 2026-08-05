import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trades_db.json');

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('console_session')?.value !== 'active_session') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const tier4Enabled = process.env.TIER_4_ENABLED === 'true' || process.env.NEXT_PUBLIC_TIER_4_ENABLED === 'true';
  if (!tier4Enabled) {
    return NextResponse.json(
      { error: 'TIER_4_DISABLED: Live execution is config-disabled. Set TIER_4_ENABLED=true in server environment.' },
      { status: 403 }
    );
  }

  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = process.env.OANDA_ENVIRONMENT || 'practice';
  const baseUrl = env === 'live'
    ? 'https://api-fxtrade.oanda.com/v3'
    : 'https://api-fxpractice.oanda.com/v3';

  if (!token || !accountId) {
    return NextResponse.json(
      { error: 'OANDA_CONFIG_ERROR: OANDA credentials not configured.' },
      { status: 500 }
    );
  }

  const body = await request.json() as {
    tradeId: string;
    instrument: string;
    units?: string; // partial close amount, omit for full close
    reason?: string;
  };

  const { tradeId, instrument, units, reason } = body;

  if (!tradeId) {
    return NextResponse.json({ error: 'MISSING_TRADE_ID: tradeId is required.' }, { status: 400 });
  }

  try {
    // Close the trade via OANDA v20 REST API
    // PUT /v3/accounts/{accountID}/trades/{tradeSpecifier}/close
    const closeBody = units ? { units } : {}; // empty body = full close

    const response = await fetch(`${baseUrl}/accounts/${accountId}/trades/${tradeId}/close`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept-Datetime-Format': 'RFC3339'
      },
      body: JSON.stringify(closeBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OANDA_CLOSE_ERROR (${response.status}): ${errorText}` },
        { status: 502 }
      );
    }

    const closeData = await response.json();
    const fillTxn = closeData.orderFillTransaction;
    const closePrice = fillTxn?.price || '—';
    const realizedPL = fillTxn?.pl || '0';
    const closedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Record the close to local trades db with full reasoning
    const closeReason = reason || 'MANUAL CLOSE — Closed by trader via MERIDIAN Trading Desk';
    const fullReasoning = `[MANUAL CLOSE] ${closeReason} | Close Price: ${closePrice} | Realized P&L: ${realizedPL} | Closed via OANDA v20 REST API`;

    try {
      let current = [];
      try {
        const dbData = await fs.readFile(DB_PATH, 'utf-8');
        current = JSON.parse(dbData);
      } catch {}

      current.unshift({
        id: `close_${Date.now()}`,
        timestamp: closedAt,
        type: 'MANUAL',
        instrument: instrument || 'UNKNOWN',
        direction: 'CLOSE',
        units: units || 'ALL',
        fillPrice: closePrice,
        status: 'CLOSED',
        orderId: `CLOSE-${tradeId}`,
        tier: 'MANUAL DESK',
        signal: fullReasoning,
        realizedPL
      });

      await fs.writeFile(DB_PATH, JSON.stringify(current, null, 2));
    } catch {}

    return NextResponse.json({
      success: true,
      tradeId,
      closePrice,
      realizedPL,
      closedAt,
      reasoning: fullReasoning
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `CLOSE_EXCEPTION: ${e.message}` },
      { status: 500 }
    );
  }
}
