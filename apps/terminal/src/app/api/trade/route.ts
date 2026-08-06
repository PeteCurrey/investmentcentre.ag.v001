import { NextResponse } from 'next/server';
import { requireSession } from '../../../lib/auth';
import { OandaBrokerAdapter, parsePriceStringToBigInt, getOandaApiKey } from '@meridian/execute';
import { RiskGate, FTMO_STANDARD_PROFILE, OrderIntent, buildAccountRiskState } from '@meridian/risk';
import { toScaledInteger, createPrice, moneyToString, insertCycleLog, insertGateDecision, getMode } from '@meridian/core';
import crypto from 'crypto';

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Manual trade history now lives in cycle_log (readable via oanda-positions execLog).
  // This endpoint is retained for compatibility but returns an empty list.
  return NextResponse.json({ success: true, trades: [] });
}

export async function POST(request: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
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

  // Gate behind mode machine: reject unless mode is LIVE and execution is enabled
  const mode = await getMode();
  const tier4Enabled = process.env.TIER_4_ENABLED === 'true';

  if (mode !== 'LIVE' || !tier4Enabled) {
    return NextResponse.json(
      {
        error: `FORBIDDEN: Live trading is disabled. Mode: ${mode}, TIER_4_ENABLED: ${tier4Enabled}.`,
      },
      { status: 403 }
    );
  }

  const token = getOandaApiKey();
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = (process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live';

  if (!token || !accountId) {
    return NextResponse.json(
      {
        error:
          'OANDA_CONFIG_ERROR: OANDA credentials (OANDA_API_KEY/OANDA_ACCOUNT_ID) not configured.',
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
  const accountCurrency = accountState.currency?.toUpperCase();
  if (!accountCurrency) {
    return NextResponse.json(
      { error: 'ACCOUNT_CURRENCY_MISSING: OANDA broker account state is missing required currency field.' },
      { status: 500 }
    );
  }

  // Fetch live pricing with spread details to populate currentSpreadPips and build quoteToAccountRates
  const oandaId = instrument.replace('/', '_');
  let currentSpreadPips: number | undefined;
  let oandaPrices: Record<string, string> = {};

  const pricingRes = await (adapter as any).getLivePricing([oandaId, 'GBP_USD', 'EUR_USD']);
  if (pricingRes.success && pricingRes.value) {
    currentSpreadPips = pricingRes.value[oandaId]?.spreadPips;
    for (const [k, v] of Object.entries(pricingRes.value)) {
      oandaPrices[k] = (v as any).price;
    }
  } else {
    // Fallback if batch pricing fails
    const batchResult = await adapter.getLivePrices([oandaId, 'GBP_USD', 'EUR_USD']);
    if (batchResult.success) {
      oandaPrices = batchResult.value;
    }
  }

  // Build quoteToAccountRates dynamically
  const quoteToAccountRates: Record<string, number> = {};
  quoteToAccountRates[accountCurrency] = 1.0;

  const gbpUsdPrice = parseFloat(oandaPrices['GBP_USD'] ?? '0');
  const eurUsdPrice = parseFloat(oandaPrices['EUR_USD'] ?? '0');

  if (quoteCurrency === accountCurrency) {
    quoteToAccountRates[quoteCurrency] = 1.0;
  } else if (quoteCurrency === 'USD') {
    if (accountCurrency === 'GBP' && gbpUsdPrice > 0) {
      quoteToAccountRates['USD'] = 1.0 / gbpUsdPrice;
    } else if (accountCurrency === 'EUR' && eurUsdPrice > 0) {
      quoteToAccountRates['USD'] = 1.0 / eurUsdPrice;
    } else {
      quoteToAccountRates['USD'] = 1.0;
    }
  } else {
    quoteToAccountRates[quoteCurrency] = 1.0;
  }
  quoteToAccountRates[accountCurrency] = 1.0;

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

  const accountRiskState = await buildAccountRiskState(adapter, accountId, {
    instrument,
    quoteToAccountRates,
    currentSpreadPips,
  });

  const decision = RiskGate.evaluate(intent, FTMO_STANDARD_PROFILE, accountRiskState);

  // Persist gate decision with complete fields
  await insertGateDecision({
    orderIntentId: intent.id,
    instrument,
    direction,
    units: BigInt(units),
    entryPrice: entryStr,
    stopLossPrice: stopLoss,
    takeProfitPrice: takeProfit ?? null,
    profileId: FTMO_STANDARD_PROFILE.id,
    profileSnapshot: FTMO_STANDARD_PROFILE as unknown as Record<string, unknown>,
    accountState: {
      accountId,
      accountCurrency: accountRiskState.accountCurrency,
      startingDailyBalance: String(accountRiskState.startingDailyBalance),
      currentEquity: String(accountRiskState.currentEquity),
      highWaterMark: String(accountRiskState.highWaterMark),
      openPositionCount: accountRiskState.openPositionCount,
      realizedPnlToday: String(accountRiskState.realizedPnlToday),
      unrealizedPnl: String(accountRiskState.unrealizedPnl),
      isNewsBlackoutActive: accountRiskState.isNewsBlackoutActive,
      newsStatus: accountRiskState.newsStatus,
      openPositions: accountRiskState.openPositions ?? [],
      currentSpreadPips: accountRiskState.currentSpreadPips ?? null,
    },
    approved: decision.approved,
    reasonCode: decision.reasonCode ?? null,
    tokenId: decision.token?.tokenId ?? null,
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
