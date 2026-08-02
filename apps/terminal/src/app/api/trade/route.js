"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
async function POST(request) {
    const body = await request.json();
    const { instrument, direction, units, stopLoss, takeProfit, orderType, limitPrice } = body;
    const tier4Enabled = process.env.TIER_4_ENABLED === 'true';
    if (!tier4Enabled) {
        return server_1.NextResponse.json({ error: 'TIER_4_DISABLED: Live execution is config-disabled. Set TIER_4_ENABLED=true in .env.local.' }, { status: 403 });
    }
    const token = process.env.OANDA_API_TOKEN;
    const accountId = process.env.OANDA_ACCOUNT_ID;
    const env = process.env.OANDA_ENVIRONMENT || 'practice';
    if (!token || !accountId) {
        return server_1.NextResponse.json({ error: 'OANDA credentials not configured.' }, { status: 500 });
    }
    const baseUrl = env === 'live'
        ? 'https://api-fxtrade.oanda.com'
        : 'https://api-fxpractice.oanda.com';
    // Build the Oanda order body
    const unitsValue = direction === 'BUY' ? Math.abs(Number(units)) : -Math.abs(Number(units));
    const orderBody = {
        order: {
            type: orderType === 'LIMIT' ? 'LIMIT' : 'MARKET',
            instrument: instrument.replace('/', '_'),
            units: String(unitsValue),
            timeInForce: orderType === 'LIMIT' ? 'GTC' : 'FOK',
            positionFill: 'DEFAULT',
        }
    };
    if (orderType === 'LIMIT' && limitPrice) {
        orderBody.order.price = String(limitPrice);
    }
    if (stopLoss) {
        orderBody.order.stopLossOnFill = { price: String(stopLoss), timeInForce: 'GTC' };
    }
    if (takeProfit) {
        orderBody.order.takeProfitOnFill = { price: String(takeProfit), timeInForce: 'GTC' };
    }
    try {
        const res = await fetch(`${baseUrl}/v3/accounts/${accountId}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Datetime-Format': 'RFC3339',
            },
            body: JSON.stringify(orderBody),
        });
        const data = await res.json();
        if (!res.ok) {
            return server_1.NextResponse.json({ error: data.errorMessage || 'Oanda API error', details: data }, { status: res.status });
        }
        const fill = data.orderFillTransaction || data.orderCreateTransaction;
        return server_1.NextResponse.json({
            success: true,
            orderId: fill?.id || data.relatedTransactionIDs?.[0],
            fillPrice: fill?.price || fill?.tradeOpened?.price,
            units: fill?.units || String(unitsValue),
            instrument: fill?.instrument || orderBody.order.instrument,
            timestamp: fill?.time || new Date().toISOString(),
            raw: data,
        });
    }
    catch (err) {
        return server_1.NextResponse.json({ error: `Network error: ${err.message}` }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map