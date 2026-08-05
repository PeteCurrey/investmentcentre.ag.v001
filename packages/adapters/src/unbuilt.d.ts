import { BaseAdapter, ValidatedPayload } from './base';
import { Result, RawPayload, TimeWindow } from '@meridian/core';
/**
 * UnbuiltAdapter — placeholder for sources registered in WAVE_1_REGISTRY that
 * do not yet have a concrete adapter implementation.
 *
 * Returns NOT_CONNECTED from health() and a descriptive error from fetch/validate/normalise.
 * This ensures unbuilt sources are visible in the health board rather than silently absent.
 */
export declare class UnbuiltAdapter extends BaseAdapter {
    constructor(sourceId: string);
    fetch(_window: TimeWindow): Promise<Result<RawPayload>>;
    validate(_raw: RawPayload): Result<ValidatedPayload>;
    normalise(_validated: ValidatedPayload): Result<any[]>;
}
//# sourceMappingURL=unbuilt.d.ts.map