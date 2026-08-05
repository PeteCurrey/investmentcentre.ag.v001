import type { ScaledInteger, Price } from '@meridian/core';

export interface RiskProfile {
  id: string;
  name: string;
  maxDailyLossPct: number; // e.g. 5.0
  maxTotalDrawdownPct: number; // e.g. 10.0
  maxRiskPerTradePct: number; // e.g. 1.0
  maxConcurrentPositions: number; // e.g. 5
  newsBlackoutWindowMinutes: number; // default 2
  maxAggregateRiskPct?: number; // default 5.0
  maxCorrelatedExposure?: number; // default 2
  maxSpreadPips?: Record<string, number>; // e.g. { 'GBP/USD': 3.0, 'XAU/USD': 5.0 }
}

export const FTMO_STANDARD_PROFILE: RiskProfile = {
  id: 'FTMO_STANDARD',
  name: 'FTMO Standard Funded Challenge',
  maxDailyLossPct: 5.0,
  maxTotalDrawdownPct: 10.0,
  maxRiskPerTradePct: 1.0,
  maxConcurrentPositions: 5,
  newsBlackoutWindowMinutes: 2,
  maxAggregateRiskPct: 5.0,
  maxCorrelatedExposure: 2,
  maxSpreadPips: {
    'GBP/USD': 3.0,
    'EUR/USD': 3.0,
    'USD/JPY': 3.0,
    'EUR/GBP': 3.0,
    'XAU/USD': 5.0,
    'SPX 500': 2.0,
    'WTI Oil': 4.0,
    'BTC/USD': 50.0,
  },
};

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

export interface OpenPositionRisk {
  instrument: string;
  direction: 'BUY' | 'SELL';
  riskAmountInAccountCurrency: ScaledInteger;
}

export interface AccountRiskState {
  accountId: string;
  accountCurrency?: string;
  startingDailyBalance: ScaledInteger;
  currentEquity: ScaledInteger;
  highWaterMark: ScaledInteger;
  openPositionCount: number;
  realizedPnlToday: ScaledInteger;
  unrealizedPnl: ScaledInteger;
  isNewsBlackoutActive: boolean;
  /** Live conversion rates from Quote Currency -> Account Currency. e.g. { 'USD': 1.0, 'JPY': 0.00639 } */
  quoteToAccountRates?: Record<string, number>;
  openPositions?: OpenPositionRisk[];
  currentSpreadPips?: number;
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
  | 'MAX_RISK_PER_TRADE_EXCEEDED'
  | 'NEWS_BLACKOUT_ACTIVE'
  | 'MAX_POSITIONS_EXCEEDED'
  | 'MISSING_STOP_LOSS'
  | 'INVALID_UNITS_MAGNITUDE'
  | 'PRICE_SCALE_MISMATCH'
  | 'PRICE_CURRENCY_MISMATCH'
  | 'CONVERSION_RATE_UNAVAILABLE'
  | 'INVALID_TOKEN'
  | 'POSITION_SIZE_BELOW_MINIMUM'
  | 'MAX_AGGREGATE_RISK_EXCEEDED'
  | 'MAX_CORRELATED_EXPOSURE_EXCEEDED'
  | 'SPREAD_EXCEEDS_MAXIMUM';

export interface RiskDecision {
  approved: boolean;
  orderIntentId: string;
  reasonCode?: RiskRejectionReason;
  token?: ApprovalToken;
  evaluatedAt: string;
}
