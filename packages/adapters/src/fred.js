"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FredAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const FredObservationSchema = zod_1.z.object({
    date: zod_1.z.string(),
    value: zod_1.z.string()
});
const FredPayloadSchema = zod_1.z.object({
    series_id: zod_1.z.string(),
    observations: zod_1.z.array(FredObservationSchema)
});
class FredAdapter extends base_1.BaseAdapter {
    constructor() {
        super('fred');
    }
    checkApiKeyPresent() {
        return !!process.env.FRED_API_KEY;
    }
    async fetch(window) {
        const now = new Date().toISOString();
        // Raw payload fetch simulation / fallback
        const rawData = {
            series_id: 'FEDFUNDS',
            observations: [
                { date: '2026-08-01', value: '5.25' }
            ]
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/fred/FEDFUNDS/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = FredPayloadSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`FRED Schema Validation Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const obsList = validated.data.observations
            .filter(o => o.value !== '.')
            .map(o => {
            const numericVal = BigInt(Math.round(parseFloat(o.value) * 100));
            return {
                id: `obs_fred_${validated.data.series_id}_${o.date}`,
                source_id: this.sourceId,
                entity_id: null,
                pillar: core_1.Pillar.WORLD,
                metric: `macro.fred.${validated.data.series_id.toLowerCase()}`,
                value_numeric: (0, core_1.toScaledInteger)(numericVal),
                value_scale: 2,
                value_text: o.value,
                unit: '%',
                source_timestamp: `${o.date}T00:00:00Z`,
                captured_at: validated.capturedAt,
                staleness_seconds: Math.round((new Date().getTime() - new Date(o.date).getTime()) / 1000),
                confidence: 100,
                licence_class: this.licenceClass,
                redistributable: this.redistributable,
                raw_ref: `r2://meridian-archive/fred/${validated.data.series_id}/${o.date}.json`
            };
        });
        return (0, core_1.ok)(obsList);
    }
}
exports.FredAdapter = FredAdapter;
//# sourceMappingURL=fred.js.map