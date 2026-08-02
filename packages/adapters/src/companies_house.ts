import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar } from '@meridian/core';
import { z } from 'zod';

const CompaniesHouseProfileSchema = z.object({
  company_number: z.string(),
  company_name: z.string(),
  company_status: z.string(),
  type: z.string(),
  date_of_creation: z.string()
});

export type CompaniesHouseProfile = z.infer<typeof CompaniesHouseProfileSchema>;

export class CompaniesHouseAdapter extends BaseAdapter<CompaniesHouseProfile> {
  constructor() {
    super('companies_house');
  }

  protected override checkApiKeyPresent(): boolean {
    return !!process.env.COMPANIES_HOUSE_API_KEY;
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      company_number: '01234567',
      company_name: 'MERIDIAN CAPITAL UK LTD',
      company_status: 'active',
      type: 'ltd',
      date_of_creation: '2020-01-15'
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/companies_house/01234567/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<CompaniesHouseProfile>> {
    const parseResult = CompaniesHouseProfileSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`Companies House Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<CompaniesHouseProfile>): Result<Observation[]> {
    const obs: Observation = {
      id: `obs_ch_${validated.data.company_number}_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.HORIZON,
      metric: 'entity.uk_ch.company_status',
      value_numeric: null,
      value_scale: null,
      value_text: `${validated.data.company_name} (${validated.data.company_number}): Status ${validated.data.company_status}`,
      unit: null,
      source_timestamp: validated.capturedAt,
      captured_at: validated.capturedAt,
      staleness_seconds: 86400,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/companies_house/${validated.data.company_number}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
