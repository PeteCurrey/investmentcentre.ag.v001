"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsaSpendingAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const UsaSpendingContractSchema = zod_1.z.object({
    awardId: zod_1.z.string(),
    recipientName: zod_1.z.string(),
    awardedAmountUsd: zod_1.z.string(),
    awardDate: zod_1.z.string()
});
class UsaSpendingAdapter extends base_1.BaseAdapter {
    constructor() {
        super('usaspending');
    }
    checkApiKeyPresent() {
        return true; // Free public endpoint
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            awardId: 'CONT_AWD_12345',
            recipientName: 'Defense Innovation Systems LLC',
            awardedAmountUsd: '5000000.00',
            awardDate: now
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/usaspending/CONT_AWD_12345/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = UsaSpendingContractSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`USAspending Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(Math.round(parseFloat(validated.data.awardedAmountUsd) * 100));
        const obs = {
            id: `obs_usaspending_${validated.data.awardId}_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.UNDERCURRENT,
            metric: 'contract.gov.award_amount',
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
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
        return (0, core_1.ok)([obs]);
    }
}
exports.UsaSpendingAdapter = UsaSpendingAdapter;
//# sourceMappingURL=usaspending.js.map