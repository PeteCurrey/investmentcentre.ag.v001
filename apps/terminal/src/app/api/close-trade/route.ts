import { NextResponse } from 'next/server';
import { requireSession } from '../../../lib/auth';
import { insertCycleLog } from '@meridian/core';
import { getOandaApiKey } from '@meridian/execute';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // TIER_4_ENABLED: server-side env var only. NEXT_PUBLIC_ variant must never
  // gate execution — a client-visible variable cannot authorise broker submission.
  const tier4Enabled = process.env.TIER_4_ENABLED === 'true';
  if (!tier4Enabled) {
    return NextResponse.json(
      {
        error:
          'TIER_4_DISABLED: Live execution is config-disabled. Set TIER_4_ENABLED=true in server environment.',
      },
      { status: 403 }
    );
  }

  const token = getOandaApiKey();
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = process.env.OANDA_ENVIRONMENT || 'practice';
  const baseUrl =
    env === 'live'
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
    units?: string;
    reason?: string;
  };

  const { tradeId, instrument, units, reason } = body;

  if (!tradeId) {
    return NextResponse.json(
      { error: 'MISSING_TRADE_ID: tradeId is required.' },
      { status: 400 }
    );
  }

  try {
    const closeBody = units ? { units } : {};

    const response = await fetch(
      `${baseUrl}/accounts/${accountId}/trades/${tradeId}/close`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Datetime-Format': 'RFC3339',
        },
        body: JSON.stringify(closeBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OANDA_CLOSE_ERROR (${response.status}): ${errorText}` },
        { status: 502 }
      );
    }

    const closeData = await response.json() as {
      orderFillTransaction?: { price?: string; pl?: string };
    };
    const fillTxn = closeData.orderFillTransaction;
    const closePrice = fillTxn?.price ?? '—';
    const realizedPL = fillTxn?.pl ?? '0';
    const closedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const closeReason = reason ?? 'MANUAL CLOSE — Closed by trader via MERIDIAN Trading Desk';
    const fullReasoning = `[MANUAL CLOSE] ${closeReason} | Close Price: ${closePrice} | Realized P&L: ${realizedPL} | Closed via OANDA v20 REST API`;

    // Persist closure to cycle_log.
    await insertCycleLog({
      cycleId: crypto.randomUUID(),
      instrument: instrument ?? 'UNKNOWN',
      action: 'CLOSED',
      reason: fullReasoning,
      orderId: `CLOSE-${tradeId}`,
    });

    return NextResponse.json({
      success: true,
      tradeId,
      closePrice,
      realizedPL,
      closedAt,
      reasoning: fullReasoning,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `CLOSE_EXCEPTION: ${message}` },
      { status: 500 }
    );
  }
}
