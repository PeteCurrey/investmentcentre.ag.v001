import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const TwelveDataQuoteSchema: z.ZodObject<{
    symbol: z.ZodString;
    name: z.ZodString;
    close: z.ZodString;
    datetime: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    name: string;
    close: string;
    datetime: string;
}, {
    symbol: string;
    name: string;
    close: string;
    datetime: string;
}>;
export type TwelveDataQuote = z.infer<typeof TwelveDataQuoteSchema>;
export declare class TwelveDataAdapter extends BaseAdapter<TwelveDataQuote> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<TwelveDataQuote>>;
    normalise(validated: ValidatedPayload<TwelveDataQuote>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=twelve_data.d.ts.map