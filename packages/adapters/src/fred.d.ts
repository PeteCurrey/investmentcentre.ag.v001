import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const FredPayloadSchema: z.ZodObject<{
    series_id: z.ZodString;
    observations: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        date: string;
    }, {
        value: string;
        date: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    series_id: string;
    observations: {
        value: string;
        date: string;
    }[];
}, {
    series_id: string;
    observations: {
        value: string;
        date: string;
    }[];
}>;
export type FredData = z.infer<typeof FredPayloadSchema>;
export declare class FredAdapter extends BaseAdapter<FredData> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<FredData>>;
    normalise(validated: ValidatedPayload<FredData>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=fred.d.ts.map