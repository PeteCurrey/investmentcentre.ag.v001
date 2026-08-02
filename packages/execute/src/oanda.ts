import { Result, ok, err, ScaledInteger } from '@meridian/core';
import { OrderIntent, ApprovalToken, RiskGate } from '@meridian/risk';
import { BrokerAdapter, BrokerOrder, BrokerPosition, BrokerAccountState } from './index';

export interface OandaConfig {
  accountId: string;
  apiKey: string;
  environment: 'practice' | 'live';
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
      return err(new Error('MERIDIAN Execution Protection: Live OANDA environment requires TIER_4_ENABLED=true in process.env.'));
    }

    if (!this.config.apiKey || !this.config.accountId) {
      // Return simulated execution for paper / unconfigured testing
      return ok({
        id: `oanda_sim_${Date.now()}`,
        clientOrderId: intent.id,
        instrument: intent.instrument,
        status: 'FILLED',
        units: intent.units,
        fillPrice: intent.stopLossPrice,
        submittedAt: new Date().toISOString()
      });
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
          stopLossOnFill: intent.stopLossPrice ? {
            price: (Number(intent.stopLossPrice) / 10000).toFixed(5)
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

      const data: any = await response.json();
      const orderCreateTransaction = data.orderCreateTransaction || data.orderFillTransaction;

      return ok({
        id: orderCreateTransaction?.id || `oanda_ord_${Date.now()}`,
        clientOrderId: intent.id,
        instrument: intent.instrument,
        status: data.orderFillTransaction ? 'FILLED' : 'SUBMITTED',
        units: intent.units,
        fillPrice: data.orderFillTransaction?.price ? (BigInt(Math.round(parseFloat(data.orderFillTransaction.price) * 10000)) as ScaledInteger) : undefined,
        submittedAt: new Date().toISOString()
      });
    } catch (e: any) {
      return err(new Error(`OANDA Order Submission Exception: ${e.message}`));
    }
  }

  public async cancelOrder(orderId: string): Promise<Result<void>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return ok(undefined);
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
      return ok([]);
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
      const data: any = await response.json();
      const positions: BrokerPosition[] = (data.positions || []).map((p: any) => ({
        id: p.instrument,
        instrument: p.instrument.replace('_', '/'),
        units: BigInt(Math.abs(parseFloat(p.long?.units || p.short?.units || '0'))) as ScaledInteger,
        entryPrice: BigInt(Math.round(parseFloat(p.long?.averagePrice || p.short?.averagePrice || '0') * 10000)) as ScaledInteger,
        stopLossPrice: 0n as ScaledInteger,
        unrealizedPnl: BigInt(Math.round(parseFloat(p.unrealizedPL || '0') * 100)) as ScaledInteger,
        openedAt: new Date().toISOString()
      }));
      return ok(positions);
    } catch (e: any) {
      return err(new Error(`OANDA GetPositions Exception: ${e.message}`));
    }
  }

  public async getAccountState(accountId: string): Promise<Result<BrokerAccountState>> {
    if (!this.config.apiKey || !this.config.accountId) {
      return ok({
        accountId,
        balance: 10000000n as ScaledInteger,
        equity: 10000000n as ScaledInteger,
        unrealizedPnl: 0n as ScaledInteger,
        openPositionsCount: 0,
        currency: 'USD'
      });
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
      const data: any = await response.json();
      const summary = data.account;
      return ok({
        accountId: summary.id,
        balance: BigInt(Math.round(parseFloat(summary.balance) * 100)) as ScaledInteger,
        equity: BigInt(Math.round(parseFloat(summary.NAV) * 100)) as ScaledInteger,
        unrealizedPnl: BigInt(Math.round(parseFloat(summary.unrealizedPL) * 100)) as ScaledInteger,
        openPositionsCount: summary.openPositionCount || 0,
        currency: summary.currency
      });
    } catch (e: any) {
      return err(new Error(`OANDA GetAccountState Exception: ${e.message}`));
    }
  }
}
