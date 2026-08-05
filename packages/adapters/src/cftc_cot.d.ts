import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const CftcCotSchema: z.ZodObject<{
    marketName: z.ZodString;
    longPositions: z.ZodNumber;
    shortPositions: z.ZodNumber;
    netPosition: z.ZodNumber;
    reportDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    marketName: string;
    longPositions: number;
    shortPositions: number;
    netPosition: number;
    reportDate: string;
}, {
    marketName: string;
    longPositions: number;
    shortPositions: number;
    netPosition: number;
    reportDate: string;
}>;
export type CftcCot = z.infer<typeof CftcCotSchema>;
export declare class CftcCotAdapter extends BaseAdapter<CftcCot> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<CftcCot>>;
    normalise(validated: ValidatedPayload<CftcCot>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=cftc_cot.d.ts.map