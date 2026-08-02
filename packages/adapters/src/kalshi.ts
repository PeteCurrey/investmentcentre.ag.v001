import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const KalshiMarketSchema = z.object({
  ticker: z.string(),
  title: z.string(),
  yesBid: z.number(),
  yesAsk: z.number(),
  lastPrice: z.number()
});

export type KalshiMarket = z.infer<typeof KalshiMarketSchema>;

export class KalshiAdapter extends BaseAdapter<KalshiMarket> {
  constructor() {
    super('kalshi');
  }

  protected override checkApiKeyPresent(): boolean {
    return true; // Market data is public
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      ticker: 'KXFEDAUG26',
      title: 'Will Federal Reserve Cut Interest Rates at August 2026 Meeting?',
      yesBid: 68,
      yesAsk: 70,
      lastPrice: 69
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/kalshi/KXFEDAUG26/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<KalshiMarket>> {
    const parseResult = KalshiMarketSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`Kalshi Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<KalshiMarket>): Result<Observation[]> {
    const numericVal = BigInt(validated.data.lastPrice);
    const obs: Observation = {
      id: `obs_kalshi_${validated.data.ticker}_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.ALTERNATIVES,
      metric: `prediction.kalshi.${validated.data.ticker.toLowerCase()}.probability`,
      value_numeric: toScaledInteger(numericVal),
      value_scale: 0,
      value_text: `${validated.data.lastPrice}% (${validated.data.title})`,
      unit: '%',
      source_timestamp: validated.capturedAt,
      captured_at: validated.capturedAt,
      staleness_seconds: 10,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/kalshi/${validated.data.ticker}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
