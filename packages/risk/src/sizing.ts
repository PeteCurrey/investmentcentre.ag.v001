/**
 * packages/risk/src/sizing.ts
 *
 * Mathematical Risk-Derived Position Sizing
 *
 * Formula:
 *   units = floor( (equity * maxRiskPerTradePct) / (stopDistanceInQuote * quoteToAccountRate) )
 *
 * Uses scaled integer arithmetic to prevent floating-point rounding errors.
 * Floor rounding ensures the position size never exceeds the exact risk budget.
 */

import { type ScaledInteger, type Price, normalizeScale } from '@meridian/core';
import type { OrderIntent, RiskProfile, AccountRiskState } from './types';

export interface PositionSizeResult {
  units: ScaledInteger;
  riskAmountInAccountCurrency: ScaledInteger; // scale 2 (cents)
  maxRiskAllowedInAccountCurrency: ScaledInteger; // scale 2 (cents)
}

export const CORRELATION_GROUPS: Record<string, string[]> = {
  USD_MAJORS: ['GBP/USD', 'EUR/USD', 'AUD/USD', 'NZD/USD', 'USD/JPY', 'USD/CAD', 'USD/CHF', 'GBP_USD', 'EUR_USD', 'AUD_USD', 'NZD_USD', 'USD_JPY', 'USD_CAD', 'USD_CHF'],
  METALS: ['XAU/USD', 'XAG/USD', 'XAU_USD', 'XAG_USD'],
  INDICES: ['SPX 500', 'NAS 100', 'US30', 'SPX500_USD', 'NAS100_USD', 'US30_USD'],
};

export const OANDA_MAX_UNITS: Record<string, bigint> = {
  'XAU/USD': 100n,
  'XAU_USD': 100n,
  'SPX 500': 500n,
  'SPX500_USD': 500n,
  'BTC/USD': 10n,
  'BTC_USD': 10n,
};
const DEFAULT_MAX_UNITS = 10_000_000n; // 100 standard lots for Forex pairs

export function calculatePositionSize(
  intent: Pick<OrderIntent, 'instrument' | 'entryPrice' | 'stopLossPrice'>,
  profile: RiskProfile,
  state: AccountRiskState,
  maxLotUnitsOverride?: number
): PositionSizeResult {
  const equity = state.currentEquity; // scale 2
  const riskPct = profile.maxRiskPerTradePct; // e.g. 1.0 = 1%

  // Max risk allowed in account currency (scale 2)
  const maxRiskAllowedInAccountCurrency = ((equity * BigInt(Math.round(riskPct * 100))) / 10000n) as ScaledInteger;

  if (maxRiskAllowedInAccountCurrency <= 0n) {
    return {
      units: 0n as ScaledInteger,
      riskAmountInAccountCurrency: 0n as ScaledInteger,
      maxRiskAllowedInAccountCurrency: 0n as ScaledInteger,
    };
  }

  // Price delta in quote currency
  const priceDelta = intent.entryPrice.price > intent.stopLossPrice.price
    ? intent.entryPrice.price - intent.stopLossPrice.price
    : intent.stopLossPrice.price - intent.entryPrice.price;

  if (priceDelta <= 0n) {
    return {
      units: 0n as ScaledInteger,
      riskAmountInAccountCurrency: 0n as ScaledInteger,
      maxRiskAllowedInAccountCurrency,
    };
  }

  // Quote currency to Account currency conversion
  const quoteCurrency = intent.entryPrice.currency;
  const accountCurrency = state.accountCurrency || 'USD';
  let rate = 1.0;

  if (quoteCurrency !== accountCurrency) {
    const fetchedRate = state.quoteToAccountRates?.[quoteCurrency];
    if (fetchedRate && fetchedRate > 0 && !isNaN(fetchedRate)) {
      rate = fetchedRate;
    }
  }

  // Convert max risk allowed to quote currency (scale 2 -> scale entryPrice.scale)
  // riskInQuote = maxRiskAllowed / rate
  // units = riskInQuote (in price scale) / priceDelta
  // Equivalent: units = floor( (maxRiskAllowedInAccount * 10^(price.scale - 2)) / (priceDelta * rate) )
  const scaleDiff = intent.entryPrice.scale - 2;

  let adjustedRiskBudget: bigint;
  if (scaleDiff > 0) {
    adjustedRiskBudget = maxRiskAllowedInAccountCurrency * (10n ** BigInt(scaleDiff));
  } else if (scaleDiff < 0) {
    adjustedRiskBudget = maxRiskAllowedInAccountCurrency / (10n ** BigInt(-scaleDiff));
  } else {
    adjustedRiskBudget = maxRiskAllowedInAccountCurrency;
  }

  const effectivePriceDelta = Math.ceil(Number(priceDelta) * rate);

  if (effectivePriceDelta <= 0) {
    return {
      units: 0n as ScaledInteger,
      riskAmountInAccountCurrency: 0n as ScaledInteger,
      maxRiskAllowedInAccountCurrency,
    };
  }

  let calculatedUnits = BigInt(Math.floor(Number(adjustedRiskBudget) / effectivePriceDelta)) as ScaledInteger;

  // Cap at instrument's OANDA maximum units
  const oandaMax = (OANDA_MAX_UNITS[intent.instrument] ?? DEFAULT_MAX_UNITS) as ScaledInteger;
  if (calculatedUnits > oandaMax) {
    calculatedUnits = oandaMax;
  }

  // Cap at lotUnits override if provided (config.lotUnits as upper ceiling)
  if (maxLotUnitsOverride !== undefined && maxLotUnitsOverride > 0) {
    const lotUnitsBig = BigInt(maxLotUnitsOverride) as ScaledInteger;
    if (calculatedUnits > lotUnitsBig) {
      calculatedUnits = lotUnitsBig;
    }
  }

  // Calculate actual risk amount for the calculated units
  const rawRisk = (BigInt(priceDelta) * BigInt(calculatedUnits)) as ScaledInteger;
  const riskInQuoteCurrencyScale = normalizeScale(rawRisk, intent.entryPrice.scale, 2, 'ceil');
  const riskAmountInAccountCurrency = quoteCurrency !== accountCurrency
    ? (BigInt(Math.ceil(Number(riskInQuoteCurrencyScale) * rate)) as ScaledInteger)
    : riskInQuoteCurrencyScale;

  return {
    units: calculatedUnits,
    riskAmountInAccountCurrency,
    maxRiskAllowedInAccountCurrency,
  };
}
