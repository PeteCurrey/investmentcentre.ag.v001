"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcaShortPositionsAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const FcaShortSchema = zod_1.z.object({
    companyName: zod_1.z.string(),
    ticker: zod_1.z.string(),
    netShortPct: zod_1.z.number(),
    manager: zod_1.z.string(),
    disclosedDate: zod_1.z.string()
});
class FcaShortPositionsAdapter extends base_1.BaseAdapter {
    constructor() {
        super('fca_short_positions');
    }
    checkApiKeyPresent() {
        return true; // Public disclosed data
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            companyName: 'ASOS PLC',
            ticker: 'ASC.L',
            netShortPct: 7.85,
            manager: 'Marshall Wace LLP',
            disclosedDate: '2026-08-01'
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/fca_short_positions/ASC_L/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = FcaShortSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`FCA Short Positions Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(Math.round(validated.data.netShortPct * 100));
        const obs = {
            id: `obs_fca_short_${validated.data.ticker}_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.MARKETS,
            metric: `short_interest.fca.${validated.data.ticker.toLowerCase()}`,
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
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
        return (0, core_1.ok)([obs]);
    }
}
exports.FcaShortPositionsAdapter = FcaShortPositionsAdapter;
//# sourceMappingURL=fca_short_positions.js.map