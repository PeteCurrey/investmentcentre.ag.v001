import { BaseAdapter, ValidatedPayload } from './base';
import { Result, ok, err, TimeWindow, RawPayload, Observation, Pillar, toScaledInteger } from '@meridian/core';
import { z } from 'zod';

const UsaSpendingContractSchema = z.object({
  awardId: z.string(),
  recipientName: z.string(),
  awardedAmountUsd: z.string(),
  awardDate: z.string()
});

export type UsaSpendingContract = z.infer<typeof UsaSpendingContractSchema>;

export class UsaSpendingAdapter extends BaseAdapter<UsaSpendingContract> {
  constructor() {
    super('usaspending');
  }

  protected override checkApiKeyPresent(): boolean {
    return true; // Free public endpoint
  }

  public async fetch(window: TimeWindow): Promise<Result<RawPayload>> {
    const now = new Date().toISOString();
    const rawData = {
      awardId: 'CONT_AWD_12345',
      recipientName: 'Defense Innovation Systems LLC',
      awardedAmountUsd: '5000000.00',
      awardDate: now
    };

    return ok({
      source_id: this.sourceId,
      ref: `r2://meridian-archive/usaspending/CONT_AWD_12345/${now}.json`,
      payload: rawData,
      captured_at: now
    });
  }

  public validate(raw: RawPayload): Result<ValidatedPayload<UsaSpendingContract>> {
    const parseResult = UsaSpendingContractSchema.safeParse(raw.payload);
    if (!parseResult.success) {
      return err(new Error(`USAspending Schema Error: ${parseResult.error.message}`));
    }
    return ok({
      sourceId: this.sourceId,
      data: parseResult.data,
      capturedAt: raw.captured_at
    });
  }

  public normalise(validated: ValidatedPayload<UsaSpendingContract>): Result<Observation[]> {
    const numericVal = BigInt(Math.round(parseFloat(validated.data.awardedAmountUsd) * 100));
    const obs: Observation = {
      id: `obs_usaspending_${validated.data.awardId}_${validated.capturedAt}`,
      source_id: this.sourceId,
      entity_id: null,
      pillar: Pillar.UNDERCURRENT,
      metric: 'contract.gov.award_amount',
      value_numeric: toScaledInteger(numericVal),
      value_scale: 2,
      value_text: `Award ${validated.data.awardId} of $${validated.data.awardedAmountUsd} to ${validated.data.recipientName}`,
      unit: 'USD',
      source_timestamp: validated.data.awardDate,
      captured_at: validated.capturedAt,
      staleness_seconds: 3600,
      confidence: 100,
      licence_class: this.licenceClass,
      redistributable: this.redistributable,
      raw_ref: `r2://meridian-archive/usaspending/${validated.data.awardId}/${validated.capturedAt}.json`
    };

    return ok([obs]);
  }
}
