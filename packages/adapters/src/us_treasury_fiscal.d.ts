import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const TreasuryDebtSchema: z.ZodObject<{
    record_date: z.ZodString;
    tot_pub_debt_out_amt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    record_date: string;
    tot_pub_debt_out_amt: string;
}, {
    record_date: string;
    tot_pub_debt_out_amt: string;
}>;
export type TreasuryDebt = z.infer<typeof TreasuryDebtSchema>;
export declare class UsTreasuryFiscalAdapter extends BaseAdapter<TreasuryDebt> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<TreasuryDebt>>;
    normalise(validated: ValidatedPayload<TreasuryDebt>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=us_treasury_fiscal.d.ts.map