import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const FcaShortSchema: z.ZodObject<{
    companyName: z.ZodString;
    ticker: z.ZodString;
    netShortPct: z.ZodNumber;
    manager: z.ZodString;
    disclosedDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyName: string;
    ticker: string;
    netShortPct: number;
    manager: string;
    disclosedDate: string;
}, {
    companyName: string;
    ticker: string;
    netShortPct: number;
    manager: string;
    disclosedDate: string;
}>;
export type FcaShort = z.infer<typeof FcaShortSchema>;
export declare class FcaShortPositionsAdapter extends BaseAdapter<FcaShort> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<FcaShort>>;
    normalise(validated: ValidatedPayload<FcaShort>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=fca_short_positions.d.ts.map