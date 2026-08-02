import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const FredObservationSchema = z.object({
  date: z.string(),
  value: z.string()
});

const FredPayloadSchema = z.object({
  series_id: z.string(),
  observations: z.array(FredObservationSchema)
});

export type FredData = z.infer<typeof FredPayloadSchema>;

export class FredAdapter extends BaseAdapter<FredData> {
  constructor() {
    super('fred');
  }

  protected override checkApiKeyPresent(): boolean {
    return !!process.env.FRED_API_KEY;
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    // Raw payload fetch simulation / fallback
    const rawData = {
      series_id: 'FEDFUNDS',
      observations: [
        { date: '2026-08-01', value: '5.25' }
      ]
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/fred/FEDFUNDS/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<FredData>> {
    const parseResult = FredPayloadSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`FRED Schema Validation Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<FredData>): Result<Observation[]> {
    const obsList: Observation[] = validated.data.observations
      .filter(o => o.value !== '.')
      .map(o => {
        const numericVal = BigInt(Math.round(parseFloat(o.value) * 100));
        return {
          id: `obs_fred_${validated.data.series_id}_${o.date}`,
          source_id: this.sourceId,
          entity_id: null,
          pillar: Pillar.WORLD,
          metric: `macro.fred.${validated.data.series_id.toLowerCase()}`,
          value_numeric: toScaledInteger(numericVal),
          value_scale: 2,
          value_text: o.value,
          unit: '%',
          source_timestamp: `${o.date}T00:00:00Z`,
          captured_at: validated.capturedAt,
          staleness_seconds: Math.round((new Date().getTime() - new Date(o.date).getTime()) / 1000),
          confidence: 100,
          licence_class: this.licenceClass,
          redistributable: this.redistributable,
          raw_ref: `r2://meridian-archive/fred/${validated.data.series_id}/${o.date}.json`
        };
      });

    return ok(obsList);
  }
}
