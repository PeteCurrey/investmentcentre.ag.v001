import { ScaledInteger, Price } from '@meridian/core';
export interface RiskProfile {
    id: string;
    name: string;
    maxDailyLossPct: number;
    maxTotalDrawdownPct: number;
    maxRiskPerTradePct: number;
    maxConcurrentPositions: number;
    newsBlackoutWindowMinutes: number;
}
export declare const FTMO_STANDARD_PROFILE: RiskProfile;
export interface OrderIntent {
    id: string;
    accountId: string;
    instrument: string;
    direction: 'BUY' | 'SELL';
    units: ScaledInteger;
    entryPrice: Price;
    stopLossPrice: Price;
    takeProfitPrice?: Price;
    /** When set, a trailing stop of this pip distance is submitted to the broker
     *  instead of a fixed stopLossOnFill. Format: decimal string e.g. "0.0015" */
    trailingStopDistance?: string;
    requestedAt: string;
}
export interface AccountRiskState {
    accountId: string;
    startingDailyBalance: ScaledInteger;
    currentEquity: ScaledInteger;
    highWaterMark: ScaledInteger;
    openPositionCount: number;
    realizedPnlToday: ScaledInteger;
    unrealizedPnl: ScaledInteger;
    isNewsBlackoutActive: boolean;
}
export interface ApprovalToken {
    tokenId: string;
    orderIntentId: string;
    accountId: string;
    issuedAt: string;
    expiresAt: string;
    hmacSignature: string;
}
export type RiskRejectionReason = 'DAILY_LOSS_LIMIT_EXCEEDED' | 'TOTAL_DRAWDOWN_EXCEEDED' | 'MAX_RISK_PER_TRADE_EXCEEDED' | 'NEWS_BLACKOUT_ACTIVE' | 'MAX_POSITIONS_EXCEEDED' | 'MISSING_STOP_LOSS' | 'INVALID_UNITS_MAGNITUDE' | 'PRICE_SCALE_MISMATCH' | 'PRICE_CURRENCY_MISMATCH' | 'INVALID_TOKEN';
export interface RiskDecision {
    approved: boolean;
    orderIntentId: string;
    reasonCode?: RiskRejectionReason;
    token?: ApprovalToken;
    evaluatedAt: string;
}
export declare function requireHmacSecret(): string;
export declare class RiskGate {
    static evaluate(intent: OrderIntent, profile: RiskProfile, state: AccountRiskState): RiskDecision;
    static verifyToken(token: ApprovalToken, intent: OrderIntent): boolean;
}
//# sourceMappingURL=index.d.ts.map