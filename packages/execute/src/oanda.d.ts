import { Result } from '@meridian/core';
import { OrderIntent, ApprovalToken } from '@meridian/risk';
import { BrokerAdapter, BrokerOrder, BrokerPosition, BrokerAccountState } from './index';
export interface OandaConfig {
    accountId: string;
    apiKey: string;
    environment: 'practice' | 'live';
}
export declare class OandaBrokerAdapter implements BrokerAdapter {
    readonly brokerName = "Oandav20";
    readonly isPaper: boolean;
    private config;
    constructor(config?: Partial<OandaConfig>);
    private get baseUrl();
    submitOrder(intent: OrderIntent, token: ApprovalToken): Promise<Result<BrokerOrder>>;
    cancelOrder(orderId: string): Promise<Result<void>>;
    getPositions(accountId: string): Promise<Result<BrokerPosition[]>>;
    getAccountState(accountId: string): Promise<Result<BrokerAccountState>>;
}
//# sourceMappingURL=oanda.d.ts.map