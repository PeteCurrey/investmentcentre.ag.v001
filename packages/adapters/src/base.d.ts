import { Pillar, Cadence, LicenceClass, TimeWindow, RawPayload, Observation, SourceHealth } from '@meridian/core';
import { SourceRegistryEntry } from '@meridian/registry';
export interface ValidatedPayload<T = unknown> {
    sourceId: string;
    data: T;
    capturedAt: string;
}
export interface Adapter<T = unknown> {
    readonly sourceId: string;
    readonly pillar: Pillar;
    readonly cadence: Cadence;
    readonly licenceClass: LicenceClass;
    readonly redistributable: boolean;
    fetch(window: TimeWindow): Promise<import('@meridian/core').Result<RawPayload>>;
    validate(raw: RawPayload): import('@meridian/core').Result<ValidatedPayload<T>>;
    normalise(validated: ValidatedPayload<T>): import('@meridian/core').Result<Observation[]>;
    health(): Promise<SourceHealth>;
}
export declare abstract class BaseAdapter<T = unknown> implements Adapter<T> {
    readonly registryEntry: SourceRegistryEntry;
    readonly sourceId: string;
    constructor(sourceId: string);
    get pillar(): Pillar;
    get cadence(): Cadence;
    get licenceClass(): LicenceClass;
    get redistributable(): boolean;
    abstract fetch(window: TimeWindow): Promise<import('@meridian/core').Result<RawPayload>>;
    abstract validate(raw: RawPayload): import('@meridian/core').Result<ValidatedPayload<T>>;
    abstract normalise(validated: ValidatedPayload<T>): import('@meridian/core').Result<Observation[]>;
    protected checkApiKeyPresent(): boolean;
    health(): Promise<SourceHealth>;
}
//# sourceMappingURL=base.d.ts.map