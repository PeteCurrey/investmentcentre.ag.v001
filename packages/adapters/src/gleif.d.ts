import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const GleifLeiSchema: z.ZodObject<{
    lei: z.ZodString;
    legalName: z.ZodString;
    status: z.ZodString;
    jurisdiction: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lei: string;
    legalName: string;
    status: string;
    jurisdiction: string;
}, {
    lei: string;
    legalName: string;
    status: string;
    jurisdiction: string;
}>;
export type GleifLei = z.infer<typeof GleifLeiSchema>;
export declare class GleifAdapter extends BaseAdapter<GleifLei> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<GleifLei>>;
    normalise(validated: ValidatedPayload<GleifLei>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=gleif.d.ts.map