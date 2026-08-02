import { ScaledInteger } from '@meridian/core';
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
    stopLossPrice: ScaledInteger;
    takeProfitPrice?: ScaledInteger;
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
export type RiskRejectionReason = 'DAILY_LOSS_LIMIT_EXCEEDED' | 'TOTAL_DRAWDOWN_EXCEEDED' | 'NEWS_BLACKOUT_ACTIVE' | 'MAX_POSITIONS_EXCEEDED' | 'MISSING_STOP_LOSS' | 'INVALID_TOKEN';
export interface RiskDecision {
    approved: boolean;
    orderIntentId: string;
    reasonCode?: RiskRejectionReason;
    token?: ApprovalToken;
    evaluatedAt: string;
}
export declare class RiskGate {
    static evaluate(intent: OrderIntent, profile: RiskProfile, state: AccountRiskState): RiskDecision;
    static verifyToken(token: ApprovalToken, intent: OrderIntent): boolean;
}
//# sourceMappingURL=index.d.ts.map