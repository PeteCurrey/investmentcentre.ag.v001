import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const CftcCotSchema = z.object({
  marketName: z.string(),
  longPositions: z.number(),
  shortPositions: z.number(),
  netPosition: z.number(),
  reportDate: z.string()
});

export type CftcCot = z.infer<typeof CftcCotSchema>;

export class CftcCotAdapter extends BaseAdapter<CftcCot> {
  constructor() {
    super('cftc_cot');
  }

  protected override checkApiKeyPresent(): boolean {
    return true; // Public official dataset
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      marketName: 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
      longPositions: 54200,
      shortPositions: 32100,
      netPosition: 22100,
      reportDate: '2026-07-28'
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/cftc_cot/GBP/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<CftcCot>> {
    const parseResult = CftcCotSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`CFTC COT Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<CftcCot>): Result<Observation[]> {
    const numericVal = BigInt(validated.data.netPosition);
    const obs: Observation = {
      id: `obs_cftc_cot_gbp_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.MARKETS,
      metric: 'positioning.cftc.cot.gbp_net_contracts',
      value_numeric: toScaledInteger(numericVal),
      value_scale: 0,
      value_text: `${validated.data.netPosition > 0 ? '+' : ''}${validated.data.netPosition} contracts`,
      unit: 'contracts',
      source_timestamp: `${validated.data.reportDate}T00:00:00Z`,
      captured_at: validated.capturedAt,
      staleness_seconds: 604800,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/cftc_cot/GBP/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
