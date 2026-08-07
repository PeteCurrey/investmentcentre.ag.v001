import { type ScaledInteger, type Price, normalizeScale, createLogger } from '@meridian/core';
import crypto from 'crypto';
import { CORRELATION_GROUPS } from './sizing';
import type { OrderIntent, RiskProfile, AccountRiskState, RiskDecision, ApprovalToken, RiskRejectionReason, OpenPositionRisk } from './types';

export * from './types';
export * from './calendar';
export * from './state';
export * from './sizing';

const log = createLogger('RiskGate');

export function requireHmacSecret(): string {
  const secret = process.env.RISK_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'Security Exception: RISK_HMAC_SECRET environment variable is missing or under minimum required length of 32 characters.'
    );
  }
  return secret;
}

export class RiskGate {
  public static evaluate(
    intent: OrderIntent,
    profile: RiskProfile,
    state: AccountRiskState
  ): RiskDecision {
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
    if (!intent.units || Number(intent.units) <= 0) {
      return {
        approved: false,
        orderIntentId: intent.id,
        reasonCode: 'INVALID_UNITS_MAGNITUDE',
        evaluatedAt: now
      };
    }

    // Rule 3: News Blackout / Calendar Verification
    const effectiveNewsStatus = state.newsStatus ?? (state.isNewsBlackoutActive ? 'BLACKOUT' : 'CLEAR');
    if (effectiveNewsStatus === 'BLACKOUT') {
      return {
        approved: false,
        orderIntentId: intent.id,
        reasonCode: 'NEWS_BLACKOUT_ACTIVE',
        evaluatedAt: now
      };
    }
    if (effectiveNewsStatus === 'UNKNOWN') {
      return {
        approved: false,
        orderIntentId: intent.id,
        reasonCode: 'NEWS_CALENDAR_UNAVAILABLE',
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

    // Rule 5b: Spread Check
    if (state.currentSpreadPips !== undefined && profile.maxSpreadPips) {
      // Normalise instrument to slash format (OANDA uses GBP_USD; profile keys use GBP/USD)
      const instrumentKey = intent.instrument.replace('_', '/');
      const maxSpread = profile.maxSpreadPips[instrumentKey] ?? profile.maxSpreadPips[intent.instrument] ?? profile.maxSpreadPips['default'] ?? 10.0;
      if (state.currentSpreadPips > maxSpread) {
        return {
          approved: false,
          orderIntentId: intent.id,
          reasonCode: 'SPREAD_EXCEEDS_MAXIMUM',
          evaluatedAt: now
        };
      }
    }

    // Rule 5c: Correlated Exposure Check
    if (profile.maxCorrelatedExposure && state.openPositions) {
      const matchGroup = Object.values(CORRELATION_GROUPS).find(group =>
        group.includes(intent.instrument)
      );
      if (matchGroup) {
        const correlatedPositions = state.openPositions.filter(p =>
          matchGroup.includes(p.instrument) && p.direction === intent.direction
        );
        if (correlatedPositions.length >= profile.maxCorrelatedExposure) {
          return {
            approved: false,
            orderIntentId: intent.id,
            reasonCode: 'MAX_CORRELATED_EXPOSURE_EXCEEDED',
            evaluatedAt: now
          };
        }
      }
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

    const priceDelta = intent.entryPrice.price > intent.stopLossPrice.price
      ? intent.entryPrice.price - intent.stopLossPrice.price
      : intent.stopLossPrice.price - intent.entryPrice.price;

    const unitsNum = Number(intent.units);
    const rawRisk = BigInt(Math.ceil(Number(priceDelta) * unitsNum)) as ScaledInteger;
    // Normalize raw risk (at price.scale) to quote currency scale (scale 2, cents) using ceiling rounding
    const riskInQuoteCurrencyScale = normalizeScale(rawRisk, intent.entryPrice.scale, 2, 'ceil');

    // Multi-currency conversion from Quote Currency -> Account Currency
    const quoteCurrency = intent.entryPrice.currency;
    const accountCurrency = state.accountCurrency || 'USD';

    let riskInEquityScale: ScaledInteger = riskInQuoteCurrencyScale;

    if (quoteCurrency !== accountCurrency) {
      const rate = state.quoteToAccountRates?.[quoteCurrency];
      if (rate === undefined || rate <= 0 || isNaN(rate)) {
        return {
          approved: false,
          orderIntentId: intent.id,
          reasonCode: 'CONVERSION_RATE_UNAVAILABLE',
          evaluatedAt: now
        };
      }
      const converted = Math.ceil(Number(riskInQuoteCurrencyScale) * rate);
      riskInEquityScale = BigInt(converted) as ScaledInteger;
    }

    const maxRiskAllowedStandard = (state.currentEquity * BigInt(Math.round(profile.maxRiskPerTradePct * 100))) / 10000n;

    // For minimum lot floor orders (e.g. 0.1 Lot Gold) on small accounts, allow up to 15% risk per trade
    // so that the broker minimum trade size (0.1 units = £16.08 margin) is not rejected by the 1% cap.
    const isMinLotFloorOrder = Number(intent.units) <= 0.1;
    const maxRiskAllowedForMinFloor = (state.currentEquity * 1500n) / 10000n;
    const maxRiskAllowed = isMinLotFloorOrder ? maxRiskAllowedForMinFloor : maxRiskAllowedStandard;

    if (riskInEquityScale > maxRiskAllowed) {
      return {
        approved: false,
        orderIntentId: intent.id,
        reasonCode: 'MAX_RISK_PER_TRADE_EXCEEDED',
        evaluatedAt: now
      };
    }

    // Rule 6b: Max Aggregate Risk Check
    const defaultMaxAggregatePct = profile.maxAggregateRiskPct ?? 5.0;
    const maxAggregateRiskPct = isMinLotFloorOrder ? Math.max(15.0, defaultMaxAggregatePct) : defaultMaxAggregatePct;
    const maxAggregateRiskAllowed = (state.currentEquity * BigInt(Math.round(maxAggregateRiskPct * 100))) / 10000n;
    const existingRiskSum = (state.openPositions || []).reduce<bigint>(
      (acc: bigint, pos: OpenPositionRisk) => acc + BigInt(pos.riskAmountInAccountCurrency),
      0n
    );
    const totalAggregateRisk = (existingRiskSum + BigInt(riskInEquityScale)) as ScaledInteger;

    if (totalAggregateRisk > maxAggregateRiskAllowed) {
      return {
        approved: false,
        orderIntentId: intent.id,
        reasonCode: 'MAX_AGGREGATE_RISK_EXCEEDED',
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
    const hmacSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

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
    let secret: string;
    try {
      secret = requireHmacSecret();
    } catch (err: any) {
      log.error('HMAC secret unconfigured or invalid — token verification rejected', {
        errorCode: 'HMAC_SECRET_MISSING',
        errorMessage: err.message,
      });
      return false;
    }
    const payload = `${intent.id}:${intent.accountId}:${intent.instrument}:${token.issuedAt}:${token.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const a = Buffer.from(token.hmacSignature, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    // Buffer lengths must match for timingSafeEqual — mismatched = invalid
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
