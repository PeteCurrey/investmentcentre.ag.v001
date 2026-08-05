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
    /**
     * Returns true if the adapter has credentials configured (API key, token, etc).
     * Overridden by concrete adapters to check their specific env var.
     * A return value of true does NOT imply the credentials are valid or that the
     * source is reachable — only that configuration is present.
     * Default is false: un-overridden adapters report NOT_CONNECTED, not UNVERIFIED.
     */
    protected checkApiKeyPresent(): boolean;
    /**
     * Default health() implementation.
     * Returns:
     *   NOT_CONNECTED  — if checkApiKeyPresent() returns false (no API key / token found)
     *   UNVERIFIED     — if credentials appear configured but no live fetch has been verified
     *
     * Concrete adapters that perform a real connectivity probe should override this method
     * and return HEALTHY (or DEGRADED/OFFLINE) based on an actual network check.
     *
     * UNVERIFIED is intentionally distinct from HEALTHY: "key present" is not evidence
     * that the source is reachable, quotas are intact, or data is flowing.
     */
    health(): Promise<SourceHealth>;
}
//# sourceMappingURL=base.d.ts.map