"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EiaAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const EiaStorageSchema = zod_1.z.object({
    seriesId: zod_1.z.string(),
    name: zod_1.z.string(),
    value: zod_1.z.number(),
    unit: zod_1.z.string(),
    period: zod_1.z.string()
});
class EiaAdapter extends base_1.BaseAdapter {
    constructor() {
        super('eia');
    }
    checkApiKeyPresent() {
        return !!process.env.EIA_API_KEY;
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            seriesId: 'PET.WCRSTUS1.W',
            name: 'U.S. Ending Stocks of Crude Oil',
            value: 426.8,
            unit: 'Million Barrels',
            period: '2026-07-24'
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/eia/WCRSTUS1/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = EiaStorageSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`EIA Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(Math.round(validated.data.value * 10));
        const obs = {
            id: `obs_eia_crude_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.WORLD,
            metric: 'commodity.eia.crude_stocks',
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
            value_scale: 1,
            value_text: `${validated.data.value}M bbl`,
            unit: 'Million Barrels',
            source_timestamp: `${validated.data.period}T00:00:00Z`,
            captured_at: validated.capturedAt,
            staleness_seconds: 604800,
            confidence: 100,
            licence_class: this.licenceClass,
            redistributable: this.redistributable,
            raw_ref: `r2://meridian-archive/eia/${validated.data.seriesId}/${validated.capturedAt}.json`
        };
        return (0, core_1.ok)([obs]);
    }
}
exports.EiaAdapter = EiaAdapter;
//# sourceMappingURL=eia.js.map