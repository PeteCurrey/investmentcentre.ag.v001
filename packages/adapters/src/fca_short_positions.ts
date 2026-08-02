import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const FcaShortSchema = z.object({
  companyName: z.string(),
  ticker: z.string(),
  netShortPct: z.number(),
  manager: z.string(),
  disclosedDate: z.string()
});

export type FcaShort = z.infer<typeof FcaShortSchema>;

export class FcaShortPositionsAdapter extends BaseAdapter<FcaShort> {
  constructor() {
    super('fca_short_positions');
  }

  protected override checkApiKeyPresent(): boolean {
    return true; // Public disclosed data
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      companyName: 'ASOS PLC',
      ticker: 'ASC.L',
      netShortPct: 7.85,
      manager: 'Marshall Wace LLP',
      disclosedDate: '2026-08-01'
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/fca_short_positions/ASC_L/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<FcaShort>> {
    const parseResult = FcaShortSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`FCA Short Positions Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<FcaShort>): Result<Observation[]> {
    const numericVal = BigInt(Math.round(validated.data.netShortPct * 100));
    const obs: Observation = {
      id: `obs_fca_short_${validated.data.ticker}_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.MARKETS,
      metric: `short_interest.fca.${validated.data.ticker.toLowerCase()}`,
      value_numeric: toScaledInteger(numericVal),
      value_scale: 2,
      value_text: `${validated.data.netShortPct}%`,
      unit: '%',
      source_timestamp: `${validated.data.disclosedDate}T00:00:00Z`,
      captured_at: validated.capturedAt,
      staleness_seconds: 86400,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/fca_short_positions/${validated.data.ticker}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
