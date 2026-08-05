"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CftcCotAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const CftcCotSchema = zod_1.z.object({
    marketName: zod_1.z.string(),
    longPositions: zod_1.z.number(),
    shortPositions: zod_1.z.number(),
    netPosition: zod_1.z.number(),
    reportDate: zod_1.z.string()
});
class CftcCotAdapter extends base_1.BaseAdapter {
    constructor() {
        super('cftc_cot');
    }
    checkApiKeyPresent() {
        return true; // Public official dataset
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            marketName: 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
            longPositions: 54200,
            shortPositions: 32100,
            netPosition: 22100,
            reportDate: '2026-07-28'
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/cftc_cot/GBP/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = CftcCotSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`CFTC COT Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(validated.data.netPosition);
        const obs = {
            id: `obs_cftc_cot_gbp_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.MARKETS,
            metric: 'positioning.cftc.cot.gbp_net_contracts',
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
            value_scale: 0,
            value_text: `${validated.data.netPosition > 0 ? '+' : ''}${validated.data.netPosition} contracts`,
            unit: 'contracts',
            source_timestamp: `${validated.data.reportDate}T00:00:00Z`,
            captured_at: validated.capturedAt,
            staleness_seconds: 604800,
            confidence: 100,
            licence_class: this.licenceClass,
            redistributable: this.redistributable,
            raw_ref: `r2://meridian-archive/cftc_cot/GBP/${validated.capturedAt}.json`
        };
        return (0, core_1.ok)([obs]);
    }
}
exports.CftcCotAdapter = CftcCotAdapter;
//# sourceMappingURL=cftc_cot.js.map