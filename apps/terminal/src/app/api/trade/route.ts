import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OandaBrokerAdapter, parsePriceStringToBigInt } from '@meridian/execute';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent } from '@meridian/risk';
import { toScaledInteger, createPrice, moneyToString, insertCycleLog } from '@meridian/core';
import crypto from 'crypto';

async function auth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('console_session')?.value === 'active_session';
}

export async function GET() {
  if (!(await auth())) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED: Authentication required.' },
      { status: 401 }
    );
  }

  // Manual trade history now lives in cycle_log (readable via oanda-positions execLog).
  // This endpoint is retained for compatibility but returns an empty list.
  return NextResponse.json({ success: true, trades: [] });
}

export async function POST(request: Request) {
  if (!(await auth())) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED: Authentication required.' },
      { status: 401 }
    );
  }

  const body = await request.json() as {
    instrument: string;
    direction: 'BUY' | 'SELL';
    units: string;
    stopLoss?: string;
    takeProfit?: string;
    orderType: 'MARKET' | 'LIMIT';
    limitPrice?: string;
    currentPrice?: string;
  };

  const {
    instrument,
    direction,
    units,
    stopLoss,
    takeProfit,
    orderType,
    limitPrice,
    currentPrice,
  } = body;

  // Server-side env var only — never the NEXT_PUBLIC_ variant.
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

  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';

  if (!token || !accountId) {
    return NextResponse.json(
      {
        error:
          'OANDA_CONFIG_ERROR: OANDA credentials (OANDA_API_TOKEN/OANDA_ACCOUNT_ID) not configured.',
      },
      { status: 500 }
    );
  }

  const instrumentParts = instrument.split('/');
  const quoteCurrency = instrumentParts.length === 2 ? instrumentParts[1] : 'USD';

  const adapter = new OandaBrokerAdapter({ apiKey: token, accountId, environment: env });

  const stateResult = await adapter.getAccountState(accountId);
  if (!stateResult.success) {
    return NextResponse.json(
      {
        error: `BROKER_CONNECTION_ERROR: Unable to retrieve account risk state. ${stateResult.error.message}`,
      },
      { status: 502 }
    );
  }

  const accountState = stateResult.value;

  const entryStr =
    orderType === 'LIMIT' && limitPrice ? limitPrice : currentPrice ?? '0';
  if (!entryStr || entryStr === '0' || entryStr === '—') {
    return NextResponse.json(
      {
        error:
          'INVALID_ENTRY_PRICE: Entry price must be specified or current price provided.',
      },
      { status: 400 }
    );
  }

  const entryPriceParsed = parsePriceStringToBigInt(entryStr);
  const entryPrice = createPrice(
    entryPriceParsed.amount,
    entryPriceParsed.scale,
    quoteCurrency
  );

  if (!stopLoss) {
    return NextResponse.json(
      {
        error:
          'MISSING_STOP_LOSS: Institutional safety guidelines require a valid stop-loss on every order.',
      },
      { status: 400 }
    );
  }

  const stopLossPriceParsed = parsePriceStringToBigInt(stopLoss);
  const stopLossPrice = createPrice(
    stopLossPriceParsed.amount,
    stopLossPriceParsed.scale,
    quoteCurrency
  );

  const takeProfitPrice = takeProfit
    ? (() => {
        const parsed = parsePriceStringToBigInt(takeProfit);
        return createPrice(parsed.amount, parsed.scale, quoteCurrency);
      })()
    : undefined;

  const intent: OrderIntent = {
    id: `ord_${crypto.randomUUID()}`,
    accountId,
    instrument,
    direction,
    units: toScaledInteger(BigInt(units)),
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    requestedAt: new Date().toISOString(),
  };

  const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, {
    accountId,
    startingDailyBalance: accountState.balance.price,
    currentEquity: accountState.equity.price,
    highWaterMark: accountState.balance.price,
    openPositionCount: accountState.openPositionsCount,
    realizedPnlToday: toScaledInteger(0n),
    unrealizedPnl: accountState.unrealizedPnl.price,
    isNewsBlackoutActive: false,
  });

  if (!decision.approved || !decision.token) {
    return NextResponse.json(
      {
        error: `RISK_GATE_REJECTED: Order blocked by Risk Gate. Code: ${decision.reasonCode ?? 'UNKNOWN_REJECTION'}`,
      },
      { status: 400 }
    );
  }

  const submitResult = await adapter.submitOrder(intent, decision.token);

  if (!submitResult.success) {
    return NextResponse.json(
      { error: `BROKER_SUBMISSION_FAILED: ${submitResult.error.message}` },
      { status: 502 }
    );
  }

  const filledOrder = submitResult.value;
  const fillPriceVal = filledOrder.fillPrice
    ? moneyToString({
        amount: filledOrder.fillPrice.price,
        scale: filledOrder.fillPrice.scale,
        currency: filledOrder.fillPrice.currency,
      })
    : 'MARKET';

  // Persist to cycle_log.
  await insertCycleLog({
    cycleId: crypto.randomUUID(),
    instrument: filledOrder.instrument,
    action: 'EXECUTED',
    reason: `[MANUAL DESK] ${direction} ${units} ${instrument} at ${fillPriceVal}`,
    orderId: filledOrder.id,
  });

  return NextResponse.json({
    success: true,
    orderId: filledOrder.id,
    fillPrice: fillPriceVal,
    units: String(filledOrder.units),
    instrument: filledOrder.instrument,
    timestamp: filledOrder.submittedAt,
  });
}
