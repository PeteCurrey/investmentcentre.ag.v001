"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaperBroker = void 0;
const core_1 = require("@meridian/core");
const risk_1 = require("@meridian/risk");
__exportStar(require("./oanda"), exports);
class PaperBroker {
    brokerName = 'PaperBroker';
    isPaper = true;
    orders = new Map();
    positions = new Map();
    async submitOrder(intent, token) {
        // SECURITY GUARD: Must verify ApprovalToken at adapter boundary
        if (!risk_1.RiskGate.verifyToken(token, intent)) {
            return (0, core_1.err)(new Error('BrokerAdapter Security Exception: Unapproved or invalid ApprovalToken provided.'));
        }
        const order = {
            id: `paper_ord_${Date.now()}`,
            clientOrderId: intent.id,
            instrument: intent.instrument,
            status: 'FILLED',
            units: intent.units,
            fillPrice: intent.stopLossPrice, // Simulated execution
            submittedAt: new Date().toISOString()
        };
        this.orders.set(order.id, order);
        return (0, core_1.ok)(order);
    }
    async cancelOrder(orderId) {
        const order = this.orders.get(orderId);
        if (order) {
            order.status = 'CANCELLED';
            return (0, core_1.ok)(undefined);
        }
        return (0, core_1.err)(new Error('Order not found'));
    }
    async getPositions(accountId) {
        return (0, core_1.ok)(Array.from(this.positions.values()));
    }
    async getAccountState(accountId) {
        return (0, core_1.ok)({
            accountId,
            balance: 10000000n,
            equity: 10000000n,
            unrealizedPnl: 0n,
            openPositionsCount: this.positions.size,
            currency: 'USD'
        });
    }
}
exports.PaperBroker = PaperBroker;
//# sourceMappingURL=index.js.map