import { Result, ok, err, ScaledInteger } from '@meridian/core';
import { OrderIntent, ApprovalToken, RiskGate } from '@meridian/risk';
import { BrokerAdapter, BrokerOrder, BrokerPosition, BrokerAccountState } from './index';
import { z } from 'zod';

export interface OandaConfig {
  accountId: string;
  apiKey: string;
  environment: 'practice' | 'live';
}

const OandaTransactionSchema = z.object({
  id: z.string().optional(),
  price: z.string().optional()
});

export const OandaOrderResponseSchema = z.object({
  orderCreateTransaction: OandaTransactionSchema.optional(),
  orderFillTransaction: OandaTransactionSchema.optional()
});

export const OandaPositionSchema = z.object({
  instrument: z.string(),
  long: z.object({ units: z.string().optional(), averagePrice: z.string().optional() }).optional(),
  short: z.object({ units: z.string().optional(), averagePrice: z.string().optional() }).optional(),
  unrealizedPL: z.string().optional()
});

export const OandaPositionsResponseSchema = z.object({
  positions: z.array(OandaPositionSchema).optional()
});

export const OandaAccountSummarySchema = z.object({
  account: z.object({
    id: z.string(),
    balance: z.string(),
    NAV: z.string(),
    unrealizedPL: z.string(),
    openPositionCount: z.number().optional(),
    openTradeCount: z.number().optional(),
    currency: z.string()
  })
});

/**
 * Parses a decimal numeric string (e.g. "1.31456" or "100000.00" or "-50.25") directly into a ScaledInteger BigInt
 * without passing through float arithmetic (IEEE-754 double).
 * If targetScale is provided, pads or rounds decimal digits half-up to match targetScale exactly.
 * If targetScale is omitted, uses the string's native decimal digit count as the scale.
 * Rounding convention for negatives: sign is stripped before rounding and reapplied after,
 * so -0.005 at scale 2 rounds to -0.01 (round-half-away-from-zero / symmetric rounding),
 * not -0.00 (round-half-toward-positive-infinity). This is intentional: PnL rounding is
 * symmetric so long positions and short positions are treated consistently.
 */
export function parsePriceStringToBigInt(priceStr: string, targetScale?: number): { amount: ScaledInteger; scale: number } {
  const trimmed = (priceStr || '').trim();
  if (!trimmed) return { amount: 0n as ScaledInteger, scale: targetScale ?? 0 };

  const negative = trimmed.startsWith('-');
  const clean = trimmed.replace('-', '');
  const [intPart = '0', rawDec = ''] = clean.split('.');

  const nativeScale = rawDec.length;
  const finalScale = targetScale !== undefined ? targetScale : nativeScale;

  if (targetScale === undefined) {
    const digits = (intPart || '0') + rawDec;
    const val = BigInt(digits) as ScaledInteger;
    return {
      amount: (negative ? -val : val) as ScaledInteger,
      scale: finalScale
    };
  }

  let decPart = rawDec;
  let carryOne = false;

  if (rawDec.length < targetScale) {
    decPart = rawDec.padEnd(targetScale, '0');
  } else if (rawDec.length > targetScale) {
    decPart = rawDec.slice(0, targetScale);
    // Half-up rounding based on the first truncated digit
    const nextDigit = parseInt(rawDec[targetScale], 10);
    if (!isNaN(nextDigit) && nextDigit >= 5) {
      carryOne = true;
    }
  }

  const digits = (intPart || '0') + decPart;
  let val = BigInt(digits);
  if (carryOne) {
    val += 1n;
  }

  return {
    amount: (negative ? -val : val) as ScaledInteger,
    scale: finalScale
  };
}

export function getOandaApiKey(): string {
  return process.env.OANDA_API_KEY || process.env.OANDA_API_TOKEN || '';
}

async function formatOandaError(response: Response, prefix: string): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return `${prefix}: HTTP ${response.status} ${response.statusText}`;
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.errorMessage === 'string') {
        message = parsed.errorMessage;
      }
    } catch {
      // Use raw text if not valid JSON
    }
    const cleanText = message.slice(0, 300).replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
    return `${prefix}: HTTP ${response.status} ${response.statusText} - ${cleanText}`;
  } catch {
    return `${prefix}: HTTP ${response.status} ${response.statusText}`;
  }
}

export class OandaBrokerAdapter implements BrokerAdapter {
  public readonly brokerName = 'Oandav20';
  public readonly isPaper: boolean;
  private config: OandaConfig;

  constructor(config?: Partial<OandaConfig>) {
    const envApiKey = getOandaApiKey();
    const envAccountId = process.env.OANDA_ACCOUNT_ID || '';
    this.config = {
      accountId: config?.accountId !== undefined ? config.accountId : envAccountId,
      apiKey: config?.apiKey !== undefined ? config.apiKey : envApiKey,
      environment: (config?.environment || process.env.OANDA_ENVIRONMENT || 'practice') as 'practice' | 'live'
    };
    this.isPaper = this.config.environment === 'practice';
  }

  private get baseUrl(): string {
    return this.config.environment === 'live'
      ? 'https://api-fxtrade.oanda.com/v3'
      : 'https://api-fxpractice.oanda.com/v3';
  }

  public async submitOrder(intent: OrderIntent, token: ApprovalToken): Promise<Result<BrokerOrder>> {
    // SECURITY GUARD 1: Verify ApprovalToken
    if (!RiskGate.verifyToken(token, intent)) {
      return err(new Error('BrokerAdapter Security Exception: Unapproved or invalid ApprovalToken provided for OANDA order.'));
    }

    // SECURITY GUARD 2: Safety Guard against accidental live trading
    if (this.config.environment === 'live' && process.env.TIER_4_ENABLED !== 'true') {
      return err(new Error('MERIDIAN Execution Protection: Live OANDA environment is explicitly disabled unless TIER_4_ENABLED=true.'));
    }

    // SECURITY GUARD 3: Require explicit credentials (fail-closed, no mock fallbacks)
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
    }

    // SECURITY GUARD 4: Protection Contract Validation
    // If the order carries a trailing stop distance, the approved intent's stopLossPrice must match
    // the distance implied by trailingStopDistance (within 1-pip tolerance).
    if (intent.trailingStopDistance && intent.stopLossPrice && intent.entryPrice) {
      const entryNum = Number(intent.entryPrice.price) / Math.pow(10, intent.entryPrice.scale);
      const slNum = Number(intent.stopLossPrice.price) / Math.pow(10, intent.stopLossPrice.scale);
      const impliedDistance = Math.abs(entryNum - slNum);
      const trailingDistanceNum = parseFloat(intent.trailingStopDistance);
      const pipVal = intent.instrument.includes('JPY') ? 0.01 : (intent.instrument.startsWith('XAU') || intent.instrument.startsWith('SPX') ? 1.0 : 0.0001);
      const diffPips = Math.abs(impliedDistance - trailingDistanceNum) / pipVal;

      if (diffPips > 1.0) {
        return err(new Error(`BrokerAdapter Contract Mismatch: Transmitted trailing stop distance (${intent.trailingStopDistance}) does not match approved stop loss price in intent (implied diff ${diffPips.toFixed(1)} pips).`));
      }
    }

    // SECURITY GUARD 5: OANDA Minimum Distance Validation
    // Prevent OANDA broker rejection by validating protection distances against instrument minimums before submission.
    const pipVal = intent.instrument.includes('JPY') ? 0.01 : (intent.instrument.startsWith('XAU') || intent.instrument.startsWith('SPX') ? 1.0 : 0.0001);
    const minDistancePips = intent.instrument.startsWith('XAU') ? 5.0 : (intent.instrument.startsWith('SPX') ? 2.0 : 3.0);
    const minDistanceVal = minDistancePips * pipVal;

    if (intent.trailingStopDistance) {
      const dist = parseFloat(intent.trailingStopDistance);
      if (dist < minDistanceVal) {
        return err(new Error(`OANDA Minimum Distance Violated: Requested trailing stop distance (${dist}) is less than minimum required (${minDistanceVal}) for ${intent.instrument}.`));
      }
    } else if (intent.stopLossPrice && intent.entryPrice) {
      const entryNum = Number(intent.entryPrice.price) / Math.pow(10, intent.entryPrice.scale);
      const slNum = Number(intent.stopLossPrice.price) / Math.pow(10, intent.stopLossPrice.scale);
      const dist = Math.abs(entryNum - slNum);
      if (dist < minDistanceVal) {
        return err(new Error(`OANDA Minimum Distance Violated: Requested stop loss distance (${dist.toFixed(5)}) is less than minimum required (${minDistanceVal}) for ${intent.instrument}.`));
      }
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
          clientExtensions: {
            id: intent.id
          },
          // Use trailing stop if distance is specified — otherwise use a fixed stop loss price.
          // OANDA does not accept both simultaneously.
          ...(intent.trailingStopDistance
            ? {
                trailingStopLossOnFill: {
                  distance: intent.trailingStopDistance,
                  timeInForce: 'GTC'
                }
              }
            : intent.stopLossPrice
            ? {
                stopLossOnFill: {
                  price: (() => {
                    const raw = intent.stopLossPrice.price.toString().replace('-', '');
                    const scale = intent.stopLossPrice.scale;
                    const negative = intent.stopLossPrice.price < 0n;
                    const padded = raw.padStart(scale + 1, '0');
                    const intStr = padded.slice(0, padded.length - scale) || '0';
                    const decStr = padded.slice(padded.length - scale);
                    const formatted = scale > 0 ? `${intStr}.${decStr}` : intStr;
                    return negative ? `-${formatted}` : formatted;
                  })()
                }
              }
            : {}),
          // Always forward take profit to OANDA when provided
          ...(intent.takeProfitPrice
            ? {
                takeProfitOnFill: {
                  price: (() => {
                    const raw = intent.takeProfitPrice.price.toString().replace('-', '');
                    const scale = intent.takeProfitPrice.scale;
                    const negative = intent.takeProfitPrice.price < 0n;
                    const padded = raw.padStart(scale + 1, '0');
                    const intStr = padded.slice(0, padded.length - scale) || '0';
                    const decStr = padded.slice(padded.length - scale);
                    const formatted = scale > 0 ? `${intStr}.${decStr}` : intStr;
                    return negative ? `-${formatted}` : formatted;
                  })(),
                  timeInForce: 'GTC'
                }
              }
            : {})
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
        return err(new Error(await formatOandaError(response, 'OANDA Order Submission Error')));
      }

      const rawData = await response.json();
      const parsed = OandaOrderResponseSchema.safeParse(rawData);
      if (!parsed.success) {
        return err(new Error(`OANDA API Invalid Schema Error: ${parsed.error.message}`));
      }

      const data = parsed.data;
      const orderCreateTransaction = data.orderCreateTransaction || data.orderFillTransaction;
      const fillPriceParsed = data.orderFillTransaction?.price
        ? parsePriceStringToBigInt(data.orderFillTransaction.price)
        : undefined;

      // Derive quote currency from instrument (e.g. GBP/USD -> USD, USD/JPY -> JPY)
      const instrumentParts = intent.instrument.split('/');
      const quoteCurrency = instrumentParts.length === 2 ? instrumentParts[1] : intent.entryPrice.currency;

      return ok({
        id: orderCreateTransaction?.id || `oanda_ord_${Date.now()}`,
        clientOrderId: intent.id,
        instrument: intent.instrument,
        status: data.orderFillTransaction ? 'FILLED' : 'SUBMITTED',
        units: intent.units,
        fillPrice: fillPriceParsed
          ? { price: fillPriceParsed.amount, scale: fillPriceParsed.scale, currency: quoteCurrency }
          : undefined,
        submittedAt: new Date().toISOString()
      });
    } catch (e: any) {
      return err(new Error(`OANDA Order Submission Exception: ${e.message}`));
    }
  }

  public async cancelOrder(orderId: string): Promise<Result<void>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
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
        return err(new Error(await formatOandaError(response, 'OANDA Cancel Error')));
      }
      return ok(undefined);
    } catch (e: any) {
      return err(new Error(`OANDA Cancel Exception: ${e.message}`));
    }
  }

  public async getPositions(accountId: string): Promise<Result<BrokerPosition[]>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
    }
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/openPositions`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      if (!response.ok) {
        return err(new Error(await formatOandaError(response, 'OANDA GetPositions Error')));
      }
      const rawData = await response.json();
      const parsed = OandaPositionsResponseSchema.safeParse(rawData);
      if (!parsed.success) {
        return err(new Error(`OANDA GetPositions Schema Error: ${parsed.error.message}`));
      }
      const fetchedAt = new Date().toISOString();
      const positions: BrokerPosition[] = (parsed.data.positions || []).map((p) => {
        const rawUnitsStr = p.long?.units || p.short?.units || '0';
        const rawPriceStr = p.long?.averagePrice || p.short?.averagePrice || '0';
        const rawPnlStr = p.unrealizedPL || '0';

        const parsedEntry = parsePriceStringToBigInt(rawPriceStr);
        const parsedPnl = parsePriceStringToBigInt(rawPnlStr, 2);

        const pairParts = p.instrument.split('_');
        const quoteCurrency = pairParts.length === 2 ? pairParts[1] : 'USD';

        return {
          id: p.instrument,
          instrument: p.instrument.replace('_', '/'),
          units: parsePriceStringToBigInt(rawUnitsStr, 0).amount,
          entryPrice: {
            price: parsedEntry.amount,
            scale: parsedEntry.scale,
            currency: quoteCurrency
          },
          stopLossPrice: undefined,
          unrealizedPnl: {
            price: parsedPnl.amount,
            scale: parsedPnl.scale,
            currency: 'USD'
          },
          openedAt: new Date().toISOString(),
          source: 'oanda.rest.v3',
          fetchedAt
        };
      });
      return ok(positions);
    } catch (e: any) {
      return err(new Error(`OANDA GetPositions Exception: ${e.message}`));
    }
  }

  public async getAccountState(accountId: string): Promise<Result<BrokerAccountState>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
    }
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/summary`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      if (!response.ok) {
        return err(new Error(await formatOandaError(response, 'OANDA GetAccountState Error')));
      }
      const rawData = await response.json();
      const parsed = OandaAccountSummarySchema.safeParse(rawData);
      if (!parsed.success) {
        return err(new Error(`OANDA GetAccountState Schema Error: ${parsed.error.message}`));
      }
      const summary = parsed.data.account;
      const accountCurrency = summary.currency || 'USD';
      const parsedBalance = parsePriceStringToBigInt(summary.balance, 2);
      const parsedNav = parsePriceStringToBigInt(summary.NAV, 2);
      const parsedPnl = parsePriceStringToBigInt(summary.unrealizedPL, 2);

      return ok({
        accountId: summary.id,
        balance: { price: parsedBalance.amount, scale: parsedBalance.scale, currency: accountCurrency },
        equity: { price: parsedNav.amount, scale: parsedNav.scale, currency: accountCurrency },
        unrealizedPnl: { price: parsedPnl.amount, scale: parsedPnl.scale, currency: accountCurrency },
        openPositionsCount: summary.openTradeCount ?? summary.openPositionCount ?? 0,
        currency: accountCurrency,
        source: 'oanda.rest.v3',
        fetchedAt: new Date().toISOString()
      });
    } catch (e: any) {
      return err(new Error(`OANDA GetAccountState Exception: ${e.message}`));
    }
  }

  /**
   * Fetches tradeable instrument names for this account from OANDA GET /v3/accounts/{id}/instruments.
   * Returns a Set of OANDA instrument IDs (e.g. Set { "GBP_USD", "EUR_USD", "XAU_USD", "SPX500_USD" }).
   */
  public async getAccountInstruments(): Promise<Result<Set<string>>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA getAccountInstruments: API key or account ID is unconfigured.'));
    }
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/instruments`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` }
      });
      if (!response.ok) {
        return err(new Error(await formatOandaError(response, 'OANDA getAccountInstruments')));
      }
      const data = await response.json() as { instruments?: Array<{ name: string }> };
      if (!data || !Array.isArray(data.instruments)) {
        return err(new Error('OANDA getAccountInstruments: Missing instruments array in response'));
      }
      const set = new Set<string>();
      for (const inst of data.instruments) {
        if (inst.name) set.add(inst.name);
      }
      return ok(set);
    } catch (e: any) {
      return err(new Error(`OANDA getAccountInstruments Exception: ${e.message}`));
    }
  }

  /**
   * Fetches live mid prices for the given instruments from the OANDA pricing API.
   * Accepts OANDA instrument IDs directly (e.g. ["GBP_USD", "SPX500_USD"]).
   * Returns a map of OANDA instrument ID -> mid price string (e.g. "1.3142").
   * Returns err() if the API key is missing, the request fails, or any instrument is absent.
   */
  public async getLivePrices(instruments: string[]): Promise<Result<Record<string, string>>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA getLivePrices: API key or account ID is unconfigured.'));
    }
    if (instruments.length === 0) {
      return ok({});
    }
    try {
      // Clean and normalize instrument list — handles both OANDA IDs ("GBP_USD") and display symbols ("GBP/USD")
      const oandaIds = instruments.map((i) => i.replace('/', '_'));
      const instrumentList = oandaIds.join(',');
      const response = await fetch(
        `${this.baseUrl}/accounts/${this.config.accountId}/pricing?instruments=${encodeURIComponent(instrumentList)}`,
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` }
        }
      );
      if (!response.ok) {
        return err(new Error(await formatOandaError(response, 'OANDA getLivePrices')));
      }
      const rawData = (await response.json()) as any;
      if (!rawData || !Array.isArray(rawData.prices)) {
        return err(new Error(`OANDA getLivePrices: Response missing 'prices' array`));
      }
      const result: Record<string, string> = {};
      for (const p of rawData.prices) {
        if (!p.instrument) continue;
        const bid = parseFloat(p.bids?.[0]?.price || p.closeoutBid || '0');
        const ask = parseFloat(p.asks?.[0]?.price || p.closeoutAsk || '0');
        if (bid > 0 && ask > 0) {
          const mid = (bid + ask) / 2;
          const midStr = mid.toPrecision(7).replace(/\.?0+$/, '');
          result[p.instrument] = mid.toFixed(Math.max(2, (midStr.split('.')[1] || '').length));
        }
      }
      // Verify all requested instruments were returned
      const missing = oandaIds.filter((id) => !(id in result));
      if (missing.length > 0) {
        return err(new Error(`OANDA getLivePrices: Missing prices for: ${missing.join(', ')}`));
      }
      return ok(result);
    } catch (e: any) {
      return err(new Error(`OANDA getLivePrices Exception: ${e.message}`));
    }
  }

  /**
   * Fetches OANDA closed transactions since specified `sinceIso` timestamp
   * and sums realised P&L directly into a scale 2 ScaledInteger.
   */
  public async getRealizedPnlToday(accountId: string, sinceIso: string): Promise<Result<ScaledInteger>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA BrokerAdapter Exception: OANDA API key or account ID is unconfigured.'));
    }
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/transactions?from=${encodeURIComponent(sinceIso)}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      if (!response.ok) {
        return err(new Error(`OANDA GetRealizedPnlToday Error (${response.status}): ${response.statusText}`));
      }
      const data = (await response.json()) as any;
      let totalPnlScaled = 0n as ScaledInteger;

      // Inline transactions array
      if (data && Array.isArray(data.transactions)) {
        for (const tx of data.transactions) {
          if (tx && typeof tx.pl === 'string' && tx.pl !== '0' && tx.pl !== '0.0000') {
            const parsed = parsePriceStringToBigInt(tx.pl, 2);
            totalPnlScaled = (totalPnlScaled + parsed.amount) as ScaledInteger;
          }
        }
      }

      // If response lists page URLs, fetch each page
      if (data && Array.isArray(data.pages)) {
        for (const pageUrl of data.pages) {
          try {
            const pageRes = await fetch(pageUrl, {
              headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
            });
            if (pageRes.ok) {
              const pageData = (await pageRes.json()) as any;
              if (pageData && Array.isArray(pageData.transactions)) {
                for (const tx of pageData.transactions) {
                  if (tx && typeof tx.pl === 'string' && tx.pl !== '0' && tx.pl !== '0.0000') {
                    const parsed = parsePriceStringToBigInt(tx.pl, 2);
                    totalPnlScaled = (totalPnlScaled + parsed.amount) as ScaledInteger;
                  }
                }
              }
            }
          } catch {
            // Log or ignore individual page failure
          }
        }
      }

      return ok(totalPnlScaled);
    } catch (e: any) {
      return err(new Error(`OANDA GetRealizedPnlToday Exception: ${e.message}`));
    }
  }

  /**
   * Fetch OHLC candle bars from OANDA v3 instruments/candles endpoint.
   * @param instrument  e.g. 'GBP_USD' or 'GBP/USD' (slash converted to underscore automatically)
   * @param granularity OANDA granularity: 'M1', 'M5', 'M15', 'H1', 'H4', 'D'
   * @param count       Number of bars to fetch (max 5000 per OANDA API limit)
   */
  public async getCandles(
    instrument: string,
    granularity: 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D' = 'H1',
    count: number = 50
  ): Promise<Result<Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return err(new Error('OANDA BrokerAdapter: API key or account ID unconfigured.'));
    }

    try {
      const oandaSymbol = instrument.replace('/', '_');
      const url = `${this.baseUrl}/instruments/${oandaSymbol}/candles?granularity=${granularity}&count=${count}&price=M`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return err(new Error(`OANDA getCandles HTTP ${res.status}: ${body.slice(0, 200)}`));
      }

      const data = (await res.json()) as any;

      if (!Array.isArray(data?.candles)) {
        return err(new Error('OANDA getCandles: Missing candles array in response.'));
      }

      const bars = (data.candles as any[])
        .filter(c => c?.complete === true && c?.mid)
        .map(c => ({
          time: c.time as string,
          open: parseFloat(c.mid.o),
          high: parseFloat(c.mid.h),
          low: parseFloat(c.mid.l),
          close: parseFloat(c.mid.c),
          volume: c.volume ?? 0,
        }))
        .filter(b => !isNaN(b.open) && !isNaN(b.high) && !isNaN(b.low) && !isNaN(b.close));

      if (bars.length === 0) {
        return err(new Error(`OANDA getCandles: No complete bars returned for ${instrument} ${granularity}.`));
      }

      return ok(bars);
    } catch (e: any) {
      return err(new Error(`OANDA getCandles Exception: ${e.message}`));
    }
  }
}
