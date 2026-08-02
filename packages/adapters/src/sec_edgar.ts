import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const EdgarFilingSchema = z.object({
  cik: z.string(),
  companyName: z.string(),
  formType: z.string(), // S-1, F-1, 10-K, 10-Q
  filedAt: z.string()
});

export type EdgarFiling = z.infer<typeof EdgarFilingSchema>;

export class SecEdgarAdapter extends BaseAdapter<EdgarFiling> {
  constructor() {
    super('sec_edgar');
  }

  protected override checkApiKeyPresent(): boolean {
    return true; // Free at source (requires User-Agent header)
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      cik: '0001980000',
      companyName: 'Acme AI Tech Corp',
      formType: 'S-1',
      filedAt: now
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/sec_edgar/0001980000/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<EdgarFiling>> {
    const parseResult = EdgarFilingSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`SEC EDGAR Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<EdgarFiling>): Result<Observation[]> {
    const obs: Observation = {
      id: `obs_edgar_${validated.data.cik}_${validated.data.formType}_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.HORIZON,
      metric: `filing.sec.${validated.data.formType.toLowerCase()}`,
      value_numeric: null,
      value_scale: null,
      value_text: `Form ${validated.data.formType} filed by ${validated.data.companyName} (CIK ${validated.data.cik})`,
      unit: null,
      source_timestamp: validated.data.filedAt,
      captured_at: validated.capturedAt,
      staleness_seconds: 60,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/sec_edgar/${validated.data.cik}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
