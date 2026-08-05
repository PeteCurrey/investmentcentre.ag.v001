import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const EdgarFilingSchema: z.ZodObject<{
    cik: z.ZodString;
    companyName: z.ZodString;
    formType: z.ZodString;
    filedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cik: string;
    companyName: string;
    formType: string;
    filedAt: string;
}, {
    cik: string;
    companyName: string;
    formType: string;
    filedAt: string;
}>;
export type EdgarFiling = z.infer<typeof EdgarFilingSchema>;
export declare class SecEdgarAdapter extends BaseAdapter<EdgarFiling> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<EdgarFiling>>;
    normalise(validated: ValidatedPayload<EdgarFiling>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=sec_edgar.d.ts.map