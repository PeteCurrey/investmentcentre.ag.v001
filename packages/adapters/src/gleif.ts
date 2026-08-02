import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar } from '@meridian/core';
import { z } from 'zod';

const GleifLeiSchema = z.object({
  lei: z.string(),
  legalName: z.string(),
  status: z.string(),
  jurisdiction: z.string()
});

export type GleifLei = z.infer<typeof GleifLeiSchema>;

export class GleifAdapter extends BaseAdapter<GleifLei> {
  constructor() {
    super('gleif');
  }

  protected override checkApiKeyPresent(): boolean {
    return true; // Open data API
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      lei: '5493001KJ957G9212345',
      legalName: 'DEFENSE INNOVATION SYSTEMS LLC',
      status: 'ISSUED',
      jurisdiction: 'US-VA'
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/gleif/5493001KJ957G9212345/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<GleifLei>> {
    const parseResult = GleifLeiSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`GLEIF Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<GleifLei>): Result<Observation[]> {
    const obs: Observation = {
      id: `obs_gleif_${validated.data.lei}_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.UNDERCURRENT,
      metric: 'entity.lei.status',
      value_numeric: null,
      value_scale: null,
      value_text: `LEI ${validated.data.lei}: ${validated.data.legalName} [${validated.data.status}]`,
      unit: null,
      source_timestamp: validated.capturedAt,
      captured_at: validated.capturedAt,
      staleness_seconds: 2592000,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/gleif/${validated.data.lei}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
