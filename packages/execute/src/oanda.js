"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OandaBrokerAdapter = void 0;
const core_1 = require("@meridian/core");
const risk_1 = require("@meridian/risk");
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
            return (0, core_1.err)(new Error('MERIDIAN Execution Protection: Live OANDA environment requires TIER_4_ENABLED=true in process.env.'));
        }
        if (!this.config.apiKey || !this.config.accountId) {
            // Return simulated execution for paper / unconfigured testing
            return (0, core_1.ok)({
                id: `oanda_sim_${Date.now()}`,
                clientOrderId: intent.id,
                instrument: intent.instrument,
                status: 'FILLED',
                units: intent.units,
                fillPrice: intent.stopLossPrice,
                submittedAt: new Date().toISOString()
            });
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
                    stopLossOnFill: intent.stopLossPrice ? {
                        price: (Number(intent.stopLossPrice) / 10000).toFixed(5)
                    } : undefined
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
            const data = await response.json();
            const orderCreateTransaction = data.orderCreateTransaction || data.orderFillTransaction;
            return (0, core_1.ok)({
                id: orderCreateTransaction?.id || `oanda_ord_${Date.now()}`,
                clientOrderId: intent.id,
                instrument: intent.instrument,
                status: data.orderFillTransaction ? 'FILLED' : 'SUBMITTED',
                units: intent.units,
                fillPrice: data.orderFillTransaction?.price ? BigInt(Math.round(parseFloat(data.orderFillTransaction.price) * 10000)) : undefined,
                submittedAt: new Date().toISOString()
            });
        }
        catch (e) {
            return (0, core_1.err)(new Error(`OANDA Order Submission Exception: ${e.message}`));
        }
    }
    async cancelOrder(orderId) {
        if (!this.config.apiKey || !this.config.accountId) {
            return (0, core_1.ok)(undefined);
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
            return (0, core_1.ok)([]);
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
            const data = await response.json();
            const positions = (data.positions || []).map((p) => ({
                id: p.instrument,
                instrument: p.instrument.replace('_', '/'),
                units: BigInt(Math.abs(parseFloat(p.long?.units || p.short?.units || '0'))),
                entryPrice: BigInt(Math.round(parseFloat(p.long?.averagePrice || p.short?.averagePrice || '0') * 10000)),
                stopLossPrice: 0n,
                unrealizedPnl: BigInt(Math.round(parseFloat(p.unrealizedPL || '0') * 100)),
                openedAt: new Date().toISOString()
            }));
            return (0, core_1.ok)(positions);
        }
        catch (e) {
            return (0, core_1.err)(new Error(`OANDA GetPositions Exception: ${e.message}`));
        }
    }
    async getAccountState(accountId) {
        if (!this.config.apiKey || !this.config.accountId) {
            return (0, core_1.ok)({
                accountId,
                balance: 10000000n,
                equity: 10000000n,
                unrealizedPnl: 0n,
                openPositionsCount: 0,
                currency: 'USD'
            });
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
            const data = await response.json();
            const summary = data.account;
            return (0, core_1.ok)({
                accountId: summary.id,
                balance: BigInt(Math.round(parseFloat(summary.balance) * 100)),
                equity: BigInt(Math.round(parseFloat(summary.NAV) * 100)),
                unrealizedPnl: BigInt(Math.round(parseFloat(summary.unrealizedPL) * 100)),
                openPositionsCount: summary.openPositionCount || 0,
                currency: summary.currency
            });
        }
        catch (e) {
            return (0, core_1.err)(new Error(`OANDA GetAccountState Exception: ${e.message}`));
        }
    }
}
exports.OandaBrokerAdapter = OandaBrokerAdapter;
//# sourceMappingURL=oanda.js.map