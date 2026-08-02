"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskGate = exports.FTMO_STANDARD_PROFILE = void 0;
const crypto_1 = __importDefault(require("crypto"));
exports.FTMO_STANDARD_PROFILE = {
    id: 'FTMO_STANDARD',
    name: 'FTMO Standard Funded Challenge',
    maxDailyLossPct: 5.0,
    maxTotalDrawdownPct: 10.0,
    maxRiskPerTradePct: 1.0,
    maxConcurrentPositions: 5,
    newsBlackoutWindowMinutes: 2
};
const HMAC_SECRET = process.env.RISK_HMAC_SECRET || 'meridian_risk_gate_secret_key_2026';
class RiskGate {
    static evaluate(intent, profile, state) {
        const now = new Date().toISOString();
        // Rule 1: Must carry a valid Stop-Loss
        if (!intent.stopLossPrice || intent.stopLossPrice <= 0n) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'MISSING_STOP_LOSS',
                evaluatedAt: now
            };
        }
        // Rule 2: News Blackout Window
        if (state.isNewsBlackoutActive) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'NEWS_BLACKOUT_ACTIVE',
                evaluatedAt: now
            };
        }
        // Rule 3: Max Concurrent Positions
        if (state.openPositionCount >= profile.maxConcurrentPositions) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'MAX_POSITIONS_EXCEEDED',
                evaluatedAt: now
            };
        }
        // Rule 4: Daily Loss Boundary (Dead-man logic)
        const totalPnlToday = state.realizedPnlToday + state.unrealizedPnl;
        const maxDailyLossAllowed = -(state.startingDailyBalance * BigInt(Math.round(profile.maxDailyLossPct * 100)) / 10000n);
        if (totalPnlToday <= maxDailyLossAllowed) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'DAILY_LOSS_LIMIT_EXCEEDED',
                evaluatedAt: now
            };
        }
        // Issue Cryptographic ApprovalToken
        const issuedAt = now;
        const expiresAt = new Date(Date.now() + 60000).toISOString(); // 60s expiration window
        const payload = `${intent.id}:${intent.accountId}:${intent.instrument}:${issuedAt}:${expiresAt}`;
        const hmacSignature = crypto_1.default.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
        const token = {
            tokenId: `tok_${crypto_1.default.randomUUID()}`,
            orderIntentId: intent.id,
            accountId: intent.accountId,
            issuedAt,
            expiresAt,
            hmacSignature
        };
        return {
            approved: true,
            orderIntentId: intent.id,
            token,
            evaluatedAt: now
        };
    }
    static verifyToken(token, intent) {
        if (token.orderIntentId !== intent.id || token.accountId !== intent.accountId) {
            return false;
        }
        if (new Date(token.expiresAt).getTime() < Date.now()) {
            return false;
        }
        const payload = `${intent.id}:${intent.accountId}:${intent.instrument}:${token.issuedAt}:${token.expiresAt}`;
        const expectedSig = crypto_1.default.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
        const a = Buffer.from(token.hmacSignature, 'hex');
        const b = Buffer.from(expectedSig, 'hex');
        // Buffer lengths must match for timingSafeEqual — mismatched = invalid
        if (a.length !== b.length)
            return false;
        return crypto_1.default.timingSafeEqual(a, b);
    }
}
exports.RiskGate = RiskGate;
//# sourceMappingURL=index.js.map