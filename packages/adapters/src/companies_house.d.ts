import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const CompaniesHouseProfileSchema: z.ZodObject<{
    company_number: z.ZodString;
    company_name: z.ZodString;
    company_status: z.ZodString;
    type: z.ZodString;
    date_of_creation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    company_number: string;
    company_name: string;
    company_status: string;
    date_of_creation: string;
}, {
    type: string;
    company_number: string;
    company_name: string;
    company_status: string;
    date_of_creation: string;
}>;
export type CompaniesHouseProfile = z.infer<typeof CompaniesHouseProfileSchema>;
export declare class CompaniesHouseAdapter extends BaseAdapter<CompaniesHouseProfile> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<CompaniesHouseProfile>>;
    normalise(validated: ValidatedPayload<CompaniesHouseProfile>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=companies_house.d.ts.map