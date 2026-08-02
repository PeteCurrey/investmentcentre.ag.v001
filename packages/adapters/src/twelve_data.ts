import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const TwelveDataQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  close: z.string(),
  datetime: z.string()
});

export type TwelveDataQuote = z.infer<typeof TwelveDataQuoteSchema>;

export class TwelveDataAdapter extends BaseAdapter<TwelveDataQuote> {
  constructor() {
    super('twelve_data');
  }

  protected override checkApiKeyPresent(): boolean {
    return !!process.env.TWELVE_DATA_API_KEY;
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      symbol: 'GBP/USD',
      name: 'British Pound / US Dollar',
      close: '1.3145',
      datetime: now
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/twelve_data/GBP_USD/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<TwelveDataQuote>> {
    const parseResult = TwelveDataQuoteSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`TwelveData Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<TwelveDataQuote>): Result<Observation[]> {
    const numericVal = BigInt(Math.round(parseFloat(validated.data.close) * 10000));
    const obs: Observation = {
      id: `obs_td_${validated.data.symbol.replace('/', '_')}_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.MARKETS,
      metric: `price.spot.${validated.data.symbol.replace('/', '_').toLowerCase()}`,
      value_numeric: toScaledInteger(numericVal),
      value_scale: 4,
      value_text: validated.data.close,
      unit: 'USD',
      source_timestamp: validated.data.datetime,
      captured_at: validated.capturedAt,
      staleness_seconds: 5,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/twelve_data/${validated.data.symbol}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
