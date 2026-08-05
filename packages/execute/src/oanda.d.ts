import { Result, ScaledInteger } from '@meridian/core';
import { OrderIntent, ApprovalToken } from '@meridian/risk';
import { BrokerAdapter, BrokerOrder, BrokerPosition, BrokerAccountState } from './index';
import { z } from 'zod';
export interface OandaConfig {
    accountId: string;
    apiKey: string;
    environment: 'practice' | 'live';
}
export declare const OandaOrderResponseSchema: z.ZodObject<{
    orderCreateTransaction: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        price: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        price?: string | undefined;
    }, {
        id?: string | undefined;
        price?: string | undefined;
    }>>;
    orderFillTransaction: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        price: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        price?: string | undefined;
    }, {
        id?: string | undefined;
        price?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    orderCreateTransaction?: {
        id?: string | undefined;
        price?: string | undefined;
    } | undefined;
    orderFillTransaction?: {
        id?: string | undefined;
        price?: string | undefined;
    } | undefined;
}, {
    orderCreateTransaction?: {
        id?: string | undefined;
        price?: string | undefined;
    } | undefined;
    orderFillTransaction?: {
        id?: string | undefined;
        price?: string | undefined;
    } | undefined;
}>;
export declare const OandaPositionSchema: z.ZodObject<{
    instrument: z.ZodString;
    long: z.ZodOptional<z.ZodObject<{
        units: z.ZodOptional<z.ZodString>;
        averagePrice: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        units?: string | undefined;
        averagePrice?: string | undefined;
    }, {
        units?: string | undefined;
        averagePrice?: string | undefined;
    }>>;
    short: z.ZodOptional<z.ZodObject<{
        units: z.ZodOptional<z.ZodString>;
        averagePrice: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        units?: string | undefined;
        averagePrice?: string | undefined;
    }, {
        units?: string | undefined;
        averagePrice?: string | undefined;
    }>>;
    unrealizedPL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    instrument: string;
    long?: {
        units?: string | undefined;
        averagePrice?: string | undefined;
    } | undefined;
    short?: {
        units?: string | undefined;
        averagePrice?: string | undefined;
    } | undefined;
    unrealizedPL?: string | undefined;
}, {
    instrument: string;
    long?: {
        units?: string | undefined;
        averagePrice?: string | undefined;
    } | undefined;
    short?: {
        units?: string | undefined;
        averagePrice?: string | undefined;
    } | undefined;
    unrealizedPL?: string | undefined;
}>;
export declare const OandaPositionsResponseSchema: z.ZodObject<{
    positions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        instrument: z.ZodString;
        long: z.ZodOptional<z.ZodObject<{
            units: z.ZodOptional<z.ZodString>;
            averagePrice: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            units?: string | undefined;
            averagePrice?: string | undefined;
        }, {
            units?: string | undefined;
            averagePrice?: string | undefined;
        }>>;
        short: z.ZodOptional<z.ZodObject<{
            units: z.ZodOptional<z.ZodString>;
            averagePrice: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            units?: string | undefined;
            averagePrice?: string | undefined;
        }, {
            units?: string | undefined;
            averagePrice?: string | undefined;
        }>>;
        unrealizedPL: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        instrument: string;
        long?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        short?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        unrealizedPL?: string | undefined;
    }, {
        instrument: string;
        long?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        short?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        unrealizedPL?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    positions?: {
        instrument: string;
        long?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        short?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        unrealizedPL?: string | undefined;
    }[] | undefined;
}, {
    positions?: {
        instrument: string;
        long?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        short?: {
            units?: string | undefined;
            averagePrice?: string | undefined;
        } | undefined;
        unrealizedPL?: string | undefined;
    }[] | undefined;
}>;
export declare const OandaAccountSummarySchema: z.ZodObject<{
    account: z.ZodObject<{
        id: z.ZodString;
        balance: z.ZodString;
        NAV: z.ZodString;
        unrealizedPL: z.ZodString;
        openPositionCount: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        unrealizedPL: string;
        balance: string;
        NAV: string;
        currency: string;
        openPositionCount?: number | undefined;
    }, {
        id: string;
        unrealizedPL: string;
        balance: string;
        NAV: string;
        currency: string;
        openPositionCount?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    account: {
        id: string;
        unrealizedPL: string;
        balance: string;
        NAV: string;
        currency: string;
        openPositionCount?: number | undefined;
    };
}, {
    account: {
        id: string;
        unrealizedPL: string;
        balance: string;
        NAV: string;
        currency: string;
        openPositionCount?: number | undefined;
    };
}>;
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
export declare function parsePriceStringToBigInt(priceStr: string, targetScale?: number): {
    amount: ScaledInteger;
    scale: number;
};
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