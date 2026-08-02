import { Result, ScaledInteger } from '@meridian/core';
import { OrderIntent, ApprovalToken } from '@meridian/risk';
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
export declare class PaperBroker implements BrokerAdapter {
    readonly brokerName = "PaperBroker";
    readonly isPaper = true;
    private orders;
    private positions;
    submitOrder(intent: OrderIntent, token: ApprovalToken): Promise<Result<BrokerOrder>>;
    cancelOrder(orderId: string): Promise<Result<void>>;
    getPositions(accountId: string): Promise<Result<BrokerPosition[]>>;
    getAccountState(accountId: string): Promise<Result<BrokerAccountState>>;
}
//# sourceMappingURL=index.d.ts.map