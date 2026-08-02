import { Result, ok, err, ScaledInteger } from '@meridian/core';
import crypto from 'crypto';

export interface RiskProfile {
  id: string;
  name: string;
  maxDailyLossPct: number; // e.g. 5.0
  maxTotalDrawdownPct: number; // e.g. 10.0
  maxRiskPerTradePct: number; // e.g. 1.0
  maxConcurrentPositions: number; // e.g. 5
  newsBlackoutWindowMinutes: number; // default 2
}

export const FTMO_STANDARD_PROFILE: RiskProfile = {
  id: 'FTMO_STANDARD',
  name: 'FTMO Standard Funded Challenge',
  maxDailyLossPct: 5.0,
  maxTotalDrawdownPct: 10.0,
  maxRiskPerTradePct: 1.0,
  maxConcurrentPositions: 5,
  newsBlackoutWindowMinutes: 2
};

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

export type RiskRejectionReason = 
  | 'DAILY_LOSS_LIMIT_EXCEEDED'
  | 'TOTAL_DRAWDOWN_EXCEEDED'
  | 'NEWS_BLACKOUT_ACTIVE'
  | 'MAX_POSITIONS_EXCEEDED'
  | 'MISSING_STOP_LOSS'
  | 'INVALID_TOKEN';

export interface RiskDecision {
  approved: boolean;
  orderIntentId: string;
  reasonCode?: RiskRejectionReason;
  token?: ApprovalToken;
  evaluatedAt: string;
}

const HMAC_SECRET = process.env.RISK_HMAC_SECRET || 'meridian_risk_gate_secret_key_2026';

export class RiskGate {
  public static evaluate(
    intent: OrderIntent,
    profile: RiskProfile,
    state: AccountRiskState
  ): RiskDecision {
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
    const hmacSignature = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');

    const token: ApprovalToken = {
      tokenId: `tok_${crypto.randomUUID()}`,
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

  public static verifyToken(token: ApprovalToken, intent: OrderIntent): boolean {
    if (token.orderIntentId !== intent.id || token.accountId !== intent.accountId) {
      return false;
    }
    if (new Date(token.expiresAt).getTime() < Date.now()) {
      return false;
    }
    const payload = `${intent.id}:${intent.accountId}:${intent.instrument}:${token.issuedAt}:${token.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    const a = Buffer.from(token.hmacSignature, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    // Buffer lengths must match for timingSafeEqual — mismatched = invalid
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
