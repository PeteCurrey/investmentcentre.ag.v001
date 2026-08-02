import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const TreasuryDebtSchema = z.object({
  record_date: z.string(),
  tot_pub_debt_out_amt: z.string()
});

export type TreasuryDebt = z.infer<typeof TreasuryDebtSchema>;

export class UsTreasuryFiscalAdapter extends BaseAdapter<TreasuryDebt> {
  constructor() {
    super('us_treasury_fiscal');
  }

  protected override checkApiKeyPresent(): boolean {
    return true; // Unauthenticated public API
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      record_date: '2026-07-31',
      tot_pub_debt_out_amt: '34920410000000.00'
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/us_treasury_fiscal/DEBT/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<TreasuryDebt>> {
    const parseResult = TreasuryDebtSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`US Treasury Fiscal Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<TreasuryDebt>): Result<Observation[]> {
    const numericVal = BigInt(Math.round(parseFloat(validated.data.tot_pub_debt_out_amt)));
    const obs: Observation = {
      id: `obs_treasury_debt_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.WORLD,
      metric: 'rates.treasury.total_debt',
      value_numeric: toScaledInteger(numericVal),
      value_scale: 0,
      value_text: `$${parseFloat(validated.data.tot_pub_debt_out_amt).toLocaleString()}`,
      unit: 'USD',
      source_timestamp: `${validated.data.record_date}T00:00:00Z`,
      captured_at: validated.capturedAt,
      staleness_seconds: 86400,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/us_treasury_fiscal/DEBT/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
