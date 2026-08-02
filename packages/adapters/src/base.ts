import { Pillar, Cadence, LicenceClass, TimeWindow, RawPayload, Observation, SourceHealth } from '@meridian/core';
import { SourceRegistryEntry, getRegistrySource } from '@meridian/registry';

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

export abstract class BaseAdapter<T = unknown> implements Adapter<T> {
  public readonly registryEntry: SourceRegistryEntry;
  public readonly sourceId: string;

  constructor(sourceId: string) {
    this.sourceId = sourceId;
    const entry = getRegistrySource(sourceId);
    if (!entry) {
      throw new Error(`Adapter Init Error: Source '${sourceId}' not found in SourceRegistry.`);
    }
    this.registryEntry = entry;
  }

  get pillar(): Pillar { return this.registryEntry.pillar; }
  get cadence(): Cadence { return this.registryEntry.cadence; }
  get licenceClass(): LicenceClass { return this.registryEntry.licence_class; }
  get redistributable(): boolean { return this.registryEntry.redistributable; }

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
  protected checkApiKeyPresent(): boolean {
    return false; // Default: assume not configured. Subclasses override to check actual env vars.
  }

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
  public async health(): Promise<SourceHealth> {
    const hasCredentials = this.checkApiKeyPresent();
    return {
      source_id: this.sourceId,
      // UNVERIFIED: credentials configured but no live fetch verified against this source.
      // NOT_CONNECTED: no credentials found — adapter cannot connect at all.
      state: hasCredentials ? 'UNVERIFIED' : 'NOT_CONNECTED',
      last_success_at: null,  // null until a real fetch succeeds; override health() to populate.
      expected_cadence: this.cadence,
      staleness_seconds: 0,
      error_rate_24h: 0.0,
      rows_written_last_window: 0,
      quota_consumed_mtd: 0,
      cost_mtd_usd: 0.0,
      updated_at: new Date().toISOString()
    };
  }
}
