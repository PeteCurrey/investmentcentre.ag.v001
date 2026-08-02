import { Result, ok, err, ScaledInteger } from '@meridian/core';
import { OrderIntent, ApprovalToken, RiskGate } from '@meridian/risk';

export * from './oanda';

export interface BrokerPosition {
  id: string;
  instrument: string;
  units: ScaledInteger;
  entryPrice: ScaledInteger;
  stopLossPrice: ScaledInteger;
  unrealizedPnl: ScaledInteger;
  openedAt: string;
}

export interface BrokerAccountState {
  accountId: string;
  balance: ScaledInteger;
  equity: ScaledInteger;
  unrealizedPnl: ScaledInteger;
  openPositionsCount: number;
  currency: string;
}

export interface BrokerOrder {
  id: string;
  clientOrderId: string;
  instrument: string;
  status: 'SUBMITTED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  units: ScaledInteger;
  fillPrice?: ScaledInteger;
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
      fillPrice: intent.stopLossPrice, // Simulated execution
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
    return ok({
      accountId,
      balance: 10000000n as ScaledInteger,
      equity: 10000000n as ScaledInteger,
      unrealizedPnl: 0n as ScaledInteger,
      openPositionsCount: this.positions.size,
      currency: 'USD'
    });
  }
}
