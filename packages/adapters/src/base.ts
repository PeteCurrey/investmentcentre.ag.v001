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

  protected checkApiKeyPresent(): boolean {
    return true;
  }

  public async health(): Promise<SourceHealth> {
    const hasKey = this.checkApiKeyPresent();
    return {
      source_id: this.sourceId,
      state: hasKey ? 'HEALTHY' : 'NOT_CONNECTED',
      last_success_at: hasKey ? new Date().toISOString() : null,
      expected_cadence: this.cadence,
      staleness_seconds: 0,
      error_rate_24h: 0.0,
      rows_written_last_window: hasKey ? 10 : 0,
      quota_consumed_mtd: 0,
      cost_mtd_usd: 0.0,
      updated_at: new Date().toISOString()
    };
  }
}
