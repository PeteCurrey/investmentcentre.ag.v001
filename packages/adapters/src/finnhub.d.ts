import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const FinnhubQuoteSchema: z.ZodObject<{
    c: z.ZodNumber;
    d: z.ZodNullable<z.ZodNumber>;
    dp: z.ZodNullable<z.ZodNumber>;
    h: z.ZodNumber;
    l: z.ZodNumber;
    o: z.ZodNumber;
    pc: z.ZodNumber;
    t: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    c: number;
    d: number | null;
    h: number;
    l: number;
    o: number;
    t: number;
    dp: number | null;
    pc: number;
}, {
    c: number;
    d: number | null;
    h: number;
    l: number;
    o: number;
    t: number;
    dp: number | null;
    pc: number;
}>;
export type FinnhubQuote = z.infer<typeof FinnhubQuoteSchema>;
export declare class FinnhubAdapter extends BaseAdapter<FinnhubQuote> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<FinnhubQuote>>;
    normalise(validated: ValidatedPayload<FinnhubQuote>): Result<Observation[]>;
    health(): Promise<import('@meridian/core').SourceHealth>;
}
export {};
//# sourceMappingURL=finnhub.d.ts.map