import { BaseAdapter, ValidatedPayload } from './base';
import { Result, err, RawPayload, TimeWindow } from '@meridian/core';

/**
 * UnbuiltAdapter — placeholder for sources registered in WAVE_1_REGISTRY that
 * do not yet have a concrete adapter implementation.
 *
 * Returns NOT_CONNECTED from health() and a descriptive error from fetch/validate/normalise.
 * This ensures unbuilt sources are visible in the health board rather than silently absent.
 */
export class UnbuiltAdapter extends BaseAdapter {
  constructor(sourceId: string) {
    super(sourceId);
  }

  public async fetch(_window: TimeWindow): Promise<Result<RawPayload>> {
    return err(new Error(`Adapter '${this.sourceId}' is not yet implemented (unbuilt in current wave). State: NOT_CONNECTED.`));
  }

  public validate(_raw: RawPayload): Result<ValidatedPayload> {
    return err(new Error(`Adapter '${this.sourceId}' is not yet implemented.`));
  }

  public normalise(_validated: ValidatedPayload): Result<any[]> {
    return err(new Error(`Adapter '${this.sourceId}' is not yet implemented.`));
  }

  // BaseAdapter.health() already returns NOT_CONNECTED when checkApiKeyPresent() is false.
  // checkApiKeyPresent() defaults to false, so no override needed.
}
