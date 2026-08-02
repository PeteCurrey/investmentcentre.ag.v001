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

export class OandaBrokerAdapter implements BrokerAdapter {
  public readonly brokerName = 'Oandav20';
  public readonly isPaper: boolean;
  private config: OandaConfig;

  constructor(config?: Partial<OandaConfig>) {
    this.config = {
      accountId: config?.accountId || process.env.OANDA_ACCOUNT_ID || '',
      apiKey: config?.apiKey || process.env.OANDA_API_KEY || '',
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
          stopLossOnFill: intent.stopLossPrice ? {
            // Serialise ScaledInteger to OANDA's required decimal string format using pure string
            // arithmetic — no float division. E.g. price=13000n, scale=4 -> "1.3000".
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
          } : undefined
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
        const errorText = await response.text();
        return err(new Error(`OANDA API Error (${response.status}): ${errorText}`));
      }

      const rawData = await response.json();
      const parsed = OandaOrderResponseSchema.safeParse(rawData);
      if (!parsed.success) {
        return err(new Error(`OANDA API Invalid Schema Error: ${parsed.error.message}`));
      }

      const data = parsed.data;
      const orderCreateTransaction = data.orderCreateTransaction || data.orderFillTransaction;

      return ok({
        id: orderCreateTransaction?.id || `oanda_ord_${Date.now()}`,
        clientOrderId: intent.id,
        instrument: intent.instrument,
        status: data.orderFillTransaction ? 'FILLED' : 'SUBMITTED',
        units: intent.units,
        fillPrice: data.orderFillTransaction?.price
          ? parsePriceStringToBigInt(data.orderFillTransaction.price).amount
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
        return err(new Error(`OANDA Cancel Error: ${response.statusText}`));
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
        return err(new Error(`OANDA GetPositions Error: ${response.statusText}`));
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

        return {
          id: p.instrument,
          instrument: p.instrument.replace('_', '/'),
          // ASSUMPTION 1: Units are raw integer magnitudes (scale 0).
          units: parsePriceStringToBigInt(rawUnitsStr, 0).amount,
          // ASSUMPTION 2: entryPrice target scale is 4 (standard internal FX scale).
          // If OANDA returns 5-decimal pip precision (e.g. 1.31456), parsePriceStringToBigInt
          // applies explicit half-up rounding (1.31456 -> 13146n at scale 4) to prevent biased truncation.
          entryPrice: parsePriceStringToBigInt(rawPriceStr, 4).amount,
          // stopLossPrice is NOT available from the /openPositions endpoint.
          // Populating it requires a separate call to /orders filtered by instrument.
          // TODO (Phase 2, item 1 pre-requisite): fetch and join SL orders here, or expose a
          // dedicated getStopLoss(accountId, instrument) method on BrokerAdapter.
          // Until then, undefined is the correct value — callers MUST NOT treat undefined as
          // "no stop-loss" (protected). It means "stop-loss status unknown."
          stopLossPrice: undefined,
          // ASSUMPTION 3: unrealizedPnl target scale is 2 (currency cents scale).
          // Applies half-up rounding if OANDA returns precision beyond 2 decimal places.
          unrealizedPnl: parsePriceStringToBigInt(rawPnlStr, 2).amount,
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
        return err(new Error(`OANDA GetAccountState Error: ${response.statusText}`));
      }
      const rawData = await response.json();
      const parsed = OandaAccountSummarySchema.safeParse(rawData);
      if (!parsed.success) {
        return err(new Error(`OANDA GetAccountState Schema Error: ${parsed.error.message}`));
      }
      const summary = parsed.data.account;
      return ok({
        accountId: summary.id,
        // ASSUMPTION: Account balances, equity (NAV), and PnL are in standard 2-decimal currency scale.
        // Uses parsePriceStringToBigInt(..., 2) with half-up rounding.
        balance: parsePriceStringToBigInt(summary.balance, 2).amount,
        equity: parsePriceStringToBigInt(summary.NAV, 2).amount,
        unrealizedPnl: parsePriceStringToBigInt(summary.unrealizedPL, 2).amount,
        openPositionsCount: summary.openPositionCount || 0,
        currency: summary.currency,
        source: 'oanda.rest.v3',
        fetchedAt: new Date().toISOString()
      });
    } catch (e: any) {
      return err(new Error(`OANDA GetAccountState Exception: ${e.message}`));
    }
  }
}
