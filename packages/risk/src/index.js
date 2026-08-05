"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskGate = exports.FTMO_STANDARD_PROFILE = void 0;
exports.requireHmacSecret = requireHmacSecret;
const core_1 = require("@meridian/core");
const crypto_1 = __importDefault(require("crypto"));
const log = (0, core_1.createLogger)('RiskGate');
exports.FTMO_STANDARD_PROFILE = {
    id: 'FTMO_STANDARD',
    name: 'FTMO Standard Funded Challenge',
    maxDailyLossPct: 5.0,
    maxTotalDrawdownPct: 10.0,
    maxRiskPerTradePct: 1.0,
    maxConcurrentPositions: 5,
    newsBlackoutWindowMinutes: 2
};
function requireHmacSecret() {
    const secret = process.env.RISK_HMAC_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('Security Exception: RISK_HMAC_SECRET environment variable is missing or under minimum required length of 32 characters.');
    }
    return secret;
}
class RiskGate {
    static evaluate(intent, profile, state) {
        const now = new Date().toISOString();
        // Rule 1: Must carry a valid Stop-Loss
        if (!intent.stopLossPrice || !intent.stopLossPrice.price || intent.stopLossPrice.price <= 0n) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'MISSING_STOP_LOSS',
                evaluatedAt: now
            };
        }
        // Rule 2: Units must be a positive non-zero magnitude
        if (!intent.units || intent.units <= 0n) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'INVALID_UNITS_MAGNITUDE',
                evaluatedAt: now
            };
        }
        // Rule 3: News Blackout Window
        if (state.isNewsBlackoutActive) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'NEWS_BLACKOUT_ACTIVE',
                evaluatedAt: now
            };
        }
        // Rule 4: Max Concurrent Positions
        if (state.openPositionCount >= profile.maxConcurrentPositions) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'MAX_POSITIONS_EXCEEDED',
                evaluatedAt: now
            };
        }
        // Rule 5: Total Drawdown Check (from high-water mark equity)
        const currentDrawdown = state.highWaterMark - state.currentEquity;
        const maxDrawdownAllowed = (state.highWaterMark * BigInt(Math.round(profile.maxTotalDrawdownPct * 100))) / 10000n;
        if (currentDrawdown > maxDrawdownAllowed) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'TOTAL_DRAWDOWN_EXCEEDED',
                evaluatedAt: now
            };
        }
        // Rule 6: Max Risk Per Trade Check
        if (intent.entryPrice.scale !== intent.stopLossPrice.scale) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'PRICE_SCALE_MISMATCH',
                evaluatedAt: now
            };
        }
        if (intent.entryPrice.currency !== intent.stopLossPrice.currency) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'PRICE_CURRENCY_MISMATCH',
                evaluatedAt: now
            };
        }
        // ASSUMPTION: Instrument quote currency equals account currency (e.g. USD). Multi-currency conversion is not implemented.
        const priceDelta = intent.entryPrice.price > intent.stopLossPrice.price
            ? intent.entryPrice.price - intent.stopLossPrice.price
            : intent.stopLossPrice.price - intent.entryPrice.price;
        const rawRisk = (priceDelta * intent.units);
        // Normalize raw risk (at price.scale) to account equity scale (scale 2, cents) using ceiling rounding to never understate risk
        const riskInEquityScale = (0, core_1.normalizeScale)(rawRisk, intent.entryPrice.scale, 2, 'ceil');
        const maxRiskAllowed = (state.currentEquity * BigInt(Math.round(profile.maxRiskPerTradePct * 100))) / 10000n;
        if (riskInEquityScale > maxRiskAllowed) {
            return {
                approved: false,
                orderIntentId: intent.id,
                reasonCode: 'MAX_RISK_PER_TRADE_EXCEEDED',
                evaluatedAt: now
            };
        }
        // Rule 6: Daily Loss Boundary (Dead-man logic)
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
        const secret = requireHmacSecret();
        const issuedAt = now;
        const expiresAt = new Date(Date.now() + 60000).toISOString(); // 60s expiration window
        const payload = `${intent.id}:${intent.accountId}:${intent.instrument}:${issuedAt}:${expiresAt}`;
        const hmacSignature = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
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
        let secret;
        try {
            secret = requireHmacSecret();
        }
        catch (err) {
            log.error('HMAC secret unconfigured or invalid — token verification rejected', {
                errorCode: 'HMAC_SECRET_MISSING',
                errorMessage: err.message,
            });
            return false;
        }
        const payload = `${intent.id}:${intent.accountId}:${intent.instrument}:${token.issuedAt}:${token.expiresAt}`;
        const expectedSig = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
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