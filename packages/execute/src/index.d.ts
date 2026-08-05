import { Result, ScaledInteger, Price } from '@meridian/core';
import { OrderIntent, ApprovalToken } from '@meridian/risk';
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