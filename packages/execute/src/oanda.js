"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OandaBrokerAdapter = exports.OandaAccountSummarySchema = exports.OandaPositionsResponseSchema = exports.OandaPositionSchema = exports.OandaOrderResponseSchema = void 0;
exports.parsePriceStringToBigInt = parsePriceStringToBigInt;
const core_1 = require("@meridian/core");
const risk_1 = require("@meridian/risk");
const zod_1 = require("zod");
const OandaTransactionSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    price: zod_1.z.string().optional()
});
exports.OandaOrderResponseSchema = zod_1.z.object({
    orderCreateTransaction: OandaTransactionSchema.optional(),
    orderFillTransaction: OandaTransactionSchema.optional()
});
exports.OandaPositionSchema = zod_1.z.object({
    instrument: zod_1.z.string(),
    long: zod_1.z.object({ units: zod_1.z.string().optional(), averagePrice: zod_1.z.string().optional() }).optional(),
    short: zod_1.z.object({ units: zod_1.z.string().optional(), averagePrice: zod_1.z.string().optional() }).optional(),
    unrealizedPL: zod_1.z.string().optional()
});
exports.OandaPositionsResponseSchema = zod_1.z.object({
    positions: zod_1.z.array(exports.OandaPositionSchema).optional()
});
exports.OandaAccountSummarySchema = zod_1.z.object({
    account: zod_1.z.object({
        id: zod_1.z.string(),
        balance: zod_1.z.string(),
        NAV: zod_1.z.string(),
        unrealizedPL: zod_1.z.string(),
        openPositionCount: zod_1.z.number().optional(),
        currency: zod_1.z.string()
    })
});
/**
 * Parses a decimal numeric string (e.g. "1.31456" or "100000.00" or "-50.25") directly into a ScaledInteger BigInt
 * without passing through float arithmetic (IEEE-754 double).
 * If targetScale is provided, pads or rounds decimal digits half-up to match targetScale exactly.
 * If targetScale is omitted, uses the string's native decimal digit count as the scale.
 * Rounding convention for negatives: sign is stripped before rounding and reapplied after,
 * so -0.005 at scale 2 rounds to -0.01 (round-half-away-from-zero / symmetric rounding),
 * not -0.00 (round-half-toward-positive-infinity). This is intentional: PnL rounding is
 * symmetric so long positions and short positions are treated consistently.
 */
function parsePriceStringToBigInt(priceStr, targetScale) {
    const trimmed = (priceStr || '').trim();
    if (!trimmed)
        return { amount: 0n, scale: targetScale ?? 0 };
    const negative = trimmed.startsWith('-');
    const clean = trimmed.replace('-', '');
    const [intPart = '0', rawDec = ''] = clean.split('.');
    const nativeScale = rawDec.length;
    const finalScale = targetScale !== undefined ? targetScale : nativeScale;
    if (targetScale === undefined) {
        const digits = (intPart || '0') + rawDec;
        const val = BigInt(digits);
        return {
            amount: (negative ? -val : val),
            scale: finalScale
        };
    }
    let decPart = rawDec;
    let carryOne = false;
    if (rawDec.length < targetScale) {
        decPart = rawDec.padEnd(targetScale, '0');
    }
    else if (rawDec.length > targetScale) {
        decPart = rawDec.slice(0, targetScale);
        // Half-up rounding based on the first truncated digit
        const nextDigit = parseInt(rawDec[targetScale], 10);
        if (!isNaN(nextDigit) && nextDigit >= 5) {
            carryOne = true;
        }
    }
    const digits = (intPart || '0') + decPart;
    let val = BigInt(digits);
    if (carryOne) {
        val += 1n;
    }
    return {
        amount: (negative ? -val : val),
        scale: finalScale
    };
}
class OandaBrokerAdapter {
    brokerName = 'Oandav20';
    isPaper;
    config;
    constructor(config) {
        this.config = {
            accountId: config?.accountId || process.env.OANDA_ACCOUNT_ID || '',
            apiKey: config?.apiKey || process.env.OANDA_API_KEY || '',
            environment: (config?.environment || process.env.OANDA_ENVIRONMENT || 'practice')
        };
        this.isPaper = this.config.environment === 'practice';
    }
    get baseUrl() {
        return this.config.environment === 'live'
            ? 'https://api-fxtrade.oanda.com/v3'
            : 'https://api-fxpractice.oanda.com/v3';
    }
    async submitOrder(intent, token) {
        // SECURITY GUARD 1: Verify ApprovalToken
        if (!risk_1.RiskGate.verifyToken(token, intent)) {
            return (0, core_1.err)(new Error('BrokerAdapter Security Exception: Unapproved or invalid ApprovalToken provided for OANDA order.'));
        }
        // SECURITY GUARD 2: Safety Guard against accidental live trading
        if (this.config.environment === 'live' && process.env.TIER_4_ENABLED !== 'true') {
            return (0, core_1.err)(new Error('MERIDIAN Execution Protection: Live OANDA environment is explicitly disabled unless TIER_4_ENABLED=true.'));
        }
        // SECURITY GUARD 3: Require explicit credentials (fail-closed, no mock fallbacks)
        if (!this.config.apiKey || !this.config.accountId) {
            return (0, core_1.err)(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
        }
        try {
            // Map instrument to OANDA format e.g. GBP/USD -> GBP_USD
            const oandaSymbol = intent.instrument.replace('/', '_');
            const unitsNum = Number(intent.units) * (intent.direction === 'BUY' ? 1 : -1);
            const body = {
                order: {
                    units: unitsNum.toString(),
                    instrument: oandaSymbol,
                    timeInForce: 'FOK',
                    type: 'MARKET',
                    positionFill: 'DEFAULT',
                    clientExtensions: {
                        id: intent.id
                    },
                    // Use trailing stop if distance is specified — otherwise use a fixed stop loss price.
                    // OANDA does not accept both simultaneously.
                    ...(intent.trailingStopDistance
                        ? {
                            trailingStopLossOnFill: {
                                distance: intent.trailingStopDistance,
                                timeInForce: 'GTC'
                            }
                        }
                        : intent.stopLossPrice
                            ? {
                                stopLossOnFill: {
                                    price: (() => {
                                        const raw = intent.stopLossPrice.price.toString().replace('-', '');
                                        const scale = intent.stopLossPrice.scale;
                                        const negative = intent.stopLossPrice.price < 0n;
                                        const padded = raw.padStart(scale + 1, '0');
                                        const intStr = padded.slice(0, padded.length - scale) || '0';
                                        const decStr = padded.slice(padded.length - scale);
                                        const formatted = scale > 0 ? `${intStr}.${decStr}` : intStr;
                                        return negative ? `-${formatted}` : formatted;
                                    })()
                                }
                            }
                            : {}),
                    // Always forward take profit to OANDA when provided
                    ...(intent.takeProfitPrice
                        ? {
                            takeProfitOnFill: {
                                price: (() => {
                                    const raw = intent.takeProfitPrice.price.toString().replace('-', '');
                                    const scale = intent.takeProfitPrice.scale;
                                    const negative = intent.takeProfitPrice.price < 0n;
                                    const padded = raw.padStart(scale + 1, '0');
                                    const intStr = padded.slice(0, padded.length - scale) || '0';
                                    const decStr = padded.slice(padded.length - scale);
                                    const formatted = scale > 0 ? `${intStr}.${decStr}` : intStr;
                                    return negative ? `-${formatted}` : formatted;
                                })(),
                                timeInForce: 'GTC'
                            }
                        }
                        : {})
                }
            };
            const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorText = await response.text();
                return (0, core_1.err)(new Error(`OANDA API Error (${response.status}): ${errorText}`));
            }
            const rawData = await response.json();
            const parsed = exports.OandaOrderResponseSchema.safeParse(rawData);
            if (!parsed.success) {
                return (0, core_1.err)(new Error(`OANDA API Invalid Schema Error: ${parsed.error.message}`));
            }
            const data = parsed.data;
            const orderCreateTransaction = data.orderCreateTransaction || data.orderFillTransaction;
            const fillPriceParsed = data.orderFillTransaction?.price
                ? parsePriceStringToBigInt(data.orderFillTransaction.price)
                : undefined;
            // Derive quote currency from instrument (e.g. GBP/USD -> USD, USD/JPY -> JPY)
            const instrumentParts = intent.instrument.split('/');
            const quoteCurrency = instrumentParts.length === 2 ? instrumentParts[1] : intent.entryPrice.currency;
            return (0, core_1.ok)({
                id: orderCreateTransaction?.id || `oanda_ord_${Date.now()}`,
                clientOrderId: intent.id,
                instrument: intent.instrument,
                status: data.orderFillTransaction ? 'FILLED' : 'SUBMITTED',
                units: intent.units,
                fillPrice: fillPriceParsed
                    ? { price: fillPriceParsed.amount, scale: fillPriceParsed.scale, currency: quoteCurrency }
                    : undefined,
                submittedAt: new Date().toISOString()
            });
        }
        catch (e) {
            return (0, core_1.err)(new Error(`OANDA Order Submission Exception: ${e.message}`));
        }
    }
    async cancelOrder(orderId) {
        if (!this.config.apiKey || !this.config.accountId) {
            return (0, core_1.err)(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
        }
        try {
            const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });
            if (!response.ok) {
                return (0, core_1.err)(new Error(`OANDA Cancel Error: ${response.statusText}`));
            }
            return (0, core_1.ok)(undefined);
        }
        catch (e) {
            return (0, core_1.err)(new Error(`OANDA Cancel Exception: ${e.message}`));
        }
    }
    async getPositions(accountId) {
        if (!this.config.apiKey || !this.config.accountId) {
            return (0, core_1.err)(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
        }
        try {
            const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/openPositions`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });
            if (!response.ok) {
                return (0, core_1.err)(new Error(`OANDA GetPositions Error: ${response.statusText}`));
            }
            const rawData = await response.json();
            const parsed = exports.OandaPositionsResponseSchema.safeParse(rawData);
            if (!parsed.success) {
                return (0, core_1.err)(new Error(`OANDA GetPositions Schema Error: ${parsed.error.message}`));
            }
            const fetchedAt = new Date().toISOString();
            const positions = (parsed.data.positions || []).map((p) => {
                const rawUnitsStr = p.long?.units || p.short?.units || '0';
                const rawPriceStr = p.long?.averagePrice || p.short?.averagePrice || '0';
                const rawPnlStr = p.unrealizedPL || '0';
                // Native parsing for entry price — no hardcoded scale 4 target. Scale and precision are preserved.
                const parsedEntry = parsePriceStringToBigInt(rawPriceStr);
                const parsedPnl = parsePriceStringToBigInt(rawPnlStr, 2);
                // Derive quote currency from instrument e.g. GBP_USD -> USD, EUR_JPY -> JPY
                const pairParts = p.instrument.split('_');
                const quoteCurrency = pairParts.length === 2 ? pairParts[1] : 'USD';
                return {
                    id: p.instrument,
                    instrument: p.instrument.replace('_', '/'),
                    // ASSUMPTION: Units are raw integer magnitudes (scale 0).
                    units: parsePriceStringToBigInt(rawUnitsStr, 0).amount,
                    entryPrice: {
                        price: parsedEntry.amount,
                        scale: parsedEntry.scale,
                        currency: quoteCurrency
                    },
                    // stopLossPrice is NOT available from the /openPositions endpoint.
                    stopLossPrice: undefined,
                    unrealizedPnl: {
                        price: parsedPnl.amount,
                        scale: parsedPnl.scale,
                        currency: 'USD' // Account currency for PnL
                    },
                    openedAt: new Date().toISOString(),
                    source: 'oanda.rest.v3',
                    fetchedAt
                };
            });
            return (0, core_1.ok)(positions);
        }
        catch (e) {
            return (0, core_1.err)(new Error(`OANDA GetPositions Exception: ${e.message}`));
        }
    }
    async getAccountState(accountId) {
        if (!this.config.apiKey || !this.config.accountId) {
            return (0, core_1.err)(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
        }
        try {
            const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/summary`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });
            if (!response.ok) {
                return (0, core_1.err)(new Error(`OANDA GetAccountState Error: ${response.statusText}`));
            }
            const rawData = await response.json();
            const parsed = exports.OandaAccountSummarySchema.safeParse(rawData);
            if (!parsed.success) {
                return (0, core_1.err)(new Error(`OANDA GetAccountState Schema Error: ${parsed.error.message}`));
            }
            const summary = parsed.data.account;
            const accountCurrency = summary.currency || 'USD';
            const parsedBalance = parsePriceStringToBigInt(summary.balance, 2);
            const parsedNav = parsePriceStringToBigInt(summary.NAV, 2);
            const parsedPnl = parsePriceStringToBigInt(summary.unrealizedPL, 2);
            return (0, core_1.ok)({
                accountId: summary.id,
                balance: { price: parsedBalance.amount, scale: parsedBalance.scale, currency: accountCurrency },
                equity: { price: parsedNav.amount, scale: parsedNav.scale, currency: accountCurrency },
                unrealizedPnl: { price: parsedPnl.amount, scale: parsedPnl.scale, currency: accountCurrency },
                openPositionsCount: summary.openPositionCount || 0,
                currency: accountCurrency,
                source: 'oanda.rest.v3',
                fetchedAt: new Date().toISOString()
            });
        }
        catch (e) {
            return (0, core_1.err)(new Error(`OANDA GetAccountState Exception: ${e.message}`));
        }
    }
}
exports.OandaBrokerAdapter = OandaBrokerAdapter;
//# sourceMappingURL=oanda.js.map