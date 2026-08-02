"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GleifAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const GleifLeiSchema = zod_1.z.object({
    lei: zod_1.z.string(),
    legalName: zod_1.z.string(),
    status: zod_1.z.string(),
    jurisdiction: zod_1.z.string()
});
class GleifAdapter extends base_1.BaseAdapter {
    constructor() {
        super('gleif');
    }
    checkApiKeyPresent() {
        return true; // Open data API
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            lei: '5493001KJ957G9212345',
            legalName: 'DEFENSE INNOVATION SYSTEMS LLC',
            status: 'ISSUED',
            jurisdiction: 'US-VA'
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/gleif/5493001KJ957G9212345/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = GleifLeiSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`GLEIF Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const obs = {
            id: `obs_gleif_${validated.data.lei}_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.UNDERCURRENT,
            metric: 'entity.lei.status',
            value_numeric: null,
            value_scale: null,
            value_text: `LEI ${validated.data.lei}: ${validated.data.legalName} [${validated.data.status}]`,
            unit: null,
            source_timestamp: validated.capturedAt,
            captured_at: validated.capturedAt,
            staleness_seconds: 2592000,
            confidence: 100,
            licence_class: this.licenceClass,
            redistributable: this.redistributable,
            raw_ref: `r2://meridian-archive/gleif/${validated.data.lei}/${validated.capturedAt}.json`
        };
        return (0, core_1.ok)([obs]);
    }
}
exports.GleifAdapter = GleifAdapter;
//# sourceMappingURL=gleif.js.map