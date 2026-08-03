import { Result, ok, err, ScaledInteger, Price } from '@meridian/core';
import { OrderIntent, ApprovalToken, RiskGate } from '@meridian/risk';

export * from './oanda';

export interface BrokerPosition {
  id: string;
  instrument: string;
  units: ScaledInteger;
  entryPrice: Price;
  /** Not sourced from the positions endpoint (requires a separate orders call). undefined means unknown — callers must NOT assume a position with undefined stopLossPrice is protected. */
  stopLossPrice?: Price;
  unrealizedPnl: Price;
  openedAt: string;
  /** Provenance: which adapter/endpoint produced this record */
  source: string;
  /** Provenance: ISO timestamp when this record was fetched from the broker */
  fetchedAt: string;
}

export interface BrokerAccountState {
  accountId: string;
  balance: Price;
  equity: Price;
  unrealizedPnl: Price;
  openPositionsCount: number;
  currency: string;
  /** Provenance: which adapter/endpoint produced this record */
  source: string;
  /** Provenance: ISO timestamp when this record was fetched from the broker */
  fetchedAt: string;
}

export interface BrokerOrder {
  id: string;
  clientOrderId: string;
  instrument: string;
  status: 'SUBMITTED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  units: ScaledInteger;
  fillPrice?: Price;
  submittedAt: string;
}

export interface BrokerAdapter {
  readonly brokerName: string;
  readonly isPaper: boolean;
  submitOrder(intent: OrderIntent, token: ApprovalToken): Promise<Result<BrokerOrder>>;
  cancelOrder(orderId: string): Promise<Result<void>>;
  getPositions(accountId: string): Promise<Result<BrokerPosition[]>>;
  getAccountState(accountId: string): Promise<Result<BrokerAccountState>>;
}

export class PaperBroker implements BrokerAdapter {
  public readonly brokerName = 'PaperBroker';
  public readonly isPaper = true;
  private orders: Map<string, BrokerOrder> = new Map();
  private positions: Map<string, BrokerPosition> = new Map();

  public async submitOrder(intent: OrderIntent, token: ApprovalToken): Promise<Result<BrokerOrder>> {
    // SECURITY GUARD: Must verify ApprovalToken at adapter boundary
    if (!RiskGate.verifyToken(token, intent)) {
      return err(new Error('BrokerAdapter Security Exception: Unapproved or invalid ApprovalToken provided.'));
    }

    const order: BrokerOrder = {
      id: `paper_ord_${Date.now()}`,
      clientOrderId: intent.id,
      instrument: intent.instrument,
      status: 'FILLED',
      units: intent.units,
      fillPrice: intent.stopLossPrice, // Simulated execution carrying full Price structure
      submittedAt: new Date().toISOString()
    };

    this.orders.set(order.id, order);
    return ok(order);
  }

  public async cancelOrder(orderId: string): Promise<Result<void>> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'CANCELLED';
      return ok(undefined);
    }
    return err(new Error('Order not found'));
  }

  public async getPositions(accountId: string): Promise<Result<BrokerPosition[]>> {
    return ok(Array.from(this.positions.values()));
  }

  public async getAccountState(accountId: string): Promise<Result<BrokerAccountState>> {
    // PAPER MODE: balance/equity are intentional simulation fiction (not fetched data).
    // Callers can distinguish via isPaper === true. These values are not hardcoded fallbacks
    // standing in for real data — they are the paper account's defined starting state.
    return ok({
      accountId,
      balance: { price: 10000000n as ScaledInteger, scale: 2, currency: 'USD' },   // Paper starting balance: $100,000.00 (scale 2)
      equity: { price: 10000000n as ScaledInteger, scale: 2, currency: 'USD' },    // Paper starting equity: $100,000.00 (scale 2)
      unrealizedPnl: { price: 0n as ScaledInteger, scale: 2, currency: 'USD' },
      openPositionsCount: this.positions.size,
      currency: 'USD',
      source: 'paper',
      fetchedAt: new Date().toISOString()
    });
  }
}
