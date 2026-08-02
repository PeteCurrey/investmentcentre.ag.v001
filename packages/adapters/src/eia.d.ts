import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const EiaStorageSchema: z.ZodObject<{
    seriesId: z.ZodString;
    name: z.ZodString;
    value: z.ZodNumber;
    unit: z.ZodString;
    period: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: number;
    seriesId: string;
    name: string;
    unit: string;
    period: string;
}, {
    value: number;
    seriesId: string;
    name: string;
    unit: string;
    period: string;
}>;
export type EiaStorage = z.infer<typeof EiaStorageSchema>;
export declare class EiaAdapter extends BaseAdapter<EiaStorage> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<EiaStorage>>;
    normalise(validated: ValidatedPayload<EiaStorage>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=eia.d.ts.map