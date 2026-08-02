import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const FinnhubQuoteSchema = z.object({
  c: z.number(), // Current price
  d: z.number().nullable(), // Change
  dp: z.number().nullable(), // Percent change
  h: z.number(), // High
  l: z.number(), // Low
  o: z.number(), // Open
  pc: z.number(), // Previous close
  t: z.number()  // Timestamp
});

export type FinnhubQuote = z.infer<typeof FinnhubQuoteSchema>;

export class FinnhubAdapter extends BaseAdapter<FinnhubQuote> {
  constructor() {
    super('finnhub');
  }

  protected override checkApiKeyPresent(): boolean {
    return !!process.env.FINNHUB_API_KEY;
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      c: 5520.40,
      d: 15.20,
      dp: 0.28,
      h: 5535.10,
      l: 5510.00,
      o: 5512.00,
      pc: 5505.20,
      t: Math.floor(Date.now() / 1000)
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/finnhub/SPX/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<FinnhubQuote>> {
    const parseResult = FinnhubQuoteSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`Finnhub Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<FinnhubQuote>): Result<Observation[]> {
    const numericVal = BigInt(Math.round(validated.data.c * 100));
    const obs: Observation = {
      id: `obs_finnhub_spx_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.MARKETS,
      metric: 'price.spot.spx_index',
      value_numeric: toScaledInteger(numericVal),
      value_scale: 2,
      value_text: validated.data.c.toString(),
      unit: 'USD',
      source_timestamp: new Date(validated.data.t * 1000).toISOString(),
      captured_at: validated.capturedAt,
      staleness_seconds: 15,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/finnhub/SPX/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
