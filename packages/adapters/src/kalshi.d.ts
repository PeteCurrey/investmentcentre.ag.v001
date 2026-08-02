import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const KalshiMarketSchema: z.ZodObject<{
    ticker: z.ZodString;
    title: z.ZodString;
    yesBid: z.ZodNumber;
    yesAsk: z.ZodNumber;
    lastPrice: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    ticker: string;
    title: string;
    yesBid: number;
    yesAsk: number;
    lastPrice: number;
}, {
    ticker: string;
    title: string;
    yesBid: number;
    yesAsk: number;
    lastPrice: number;
}>;
export type KalshiMarket = z.infer<typeof KalshiMarketSchema>;
export declare class KalshiAdapter extends BaseAdapter<KalshiMarket> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<KalshiMarket>>;
    normalise(validated: ValidatedPayload<KalshiMarket>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=kalshi.d.ts.map