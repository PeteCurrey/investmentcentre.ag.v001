import { BaseAdapter, ValidatedPayload } from './base';
import { Result, TimeWindow, RawPayload, Observation } from '@meridian/core';
import { z } from 'zod';
declare const UsaSpendingContractSchema: z.ZodObject<{
    awardId: z.ZodString;
    recipientName: z.ZodString;
    awardedAmountUsd: z.ZodString;
    awardDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    awardId: string;
    recipientName: string;
    awardedAmountUsd: string;
    awardDate: string;
}, {
    awardId: string;
    recipientName: string;
    awardedAmountUsd: string;
    awardDate: string;
}>;
export type UsaSpendingContract = z.infer<typeof UsaSpendingContractSchema>;
export declare class UsaSpendingAdapter extends BaseAdapter<UsaSpendingContract> {
    constructor();
    protected checkApiKeyPresent(): boolean;
    fetch(window: TimeWindow): Promise<Result<RawPayload>>;
    validate(raw: RawPayload): Result<ValidatedPayload<UsaSpendingContract>>;
    normalise(validated: ValidatedPayload<UsaSpendingContract>): Result<Observation[]>;
}
export {};
//# sourceMappingURL=usaspending.d.ts.map