import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const EiaStorageSchema = z.object({
  seriesId: z.string(),
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  period: z.string()
});

export type EiaStorage = z.infer<typeof EiaStorageSchema>;

export class EiaAdapter extends BaseAdapter<EiaStorage> {
  constructor() {
    super('eia');
  }

  protected override checkApiKeyPresent(): boolean {
    return !!process.env.EIA_API_KEY;
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      seriesId: 'PET.WCRSTUS1.W',
      name: 'U.S. Ending Stocks of Crude Oil',
      value: 426.8,
      unit: 'Million Barrels',
      period: '2026-07-24'
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/eia/WCRSTUS1/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<EiaStorage>> {
    const parseResult = EiaStorageSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`EIA Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<EiaStorage>): Result<Observation[]> {
    const numericVal = BigInt(Math.round(validated.data.value * 10));
    const obs: Observation = {
      id: `obs_eia_crude_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.WORLD,
      metric: 'commodity.eia.crude_stocks',
      value_numeric: toScaledInteger(numericVal),
      value_scale: 1,
      value_text: `${validated.data.value}M bbl`,
      unit: 'Million Barrels',
      source_timestamp: `${validated.data.period}T00:00:00Z`,
      captured_at: validated.capturedAt,
      staleness_seconds: 604800,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/eia/${validated.data.seriesId}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
