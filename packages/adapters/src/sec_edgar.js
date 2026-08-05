"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecEdgarAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const EdgarFilingSchema = zod_1.z.object({
    cik: zod_1.z.string(),
    companyName: zod_1.z.string(),
    formType: zod_1.z.string(), // S-1, F-1, 10-K, 10-Q
    filedAt: zod_1.z.string()
});
class SecEdgarAdapter extends base_1.BaseAdapter {
    constructor() {
        super('sec_edgar');
    }
    checkApiKeyPresent() {
        return true; // Free at source (requires User-Agent header)
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            cik: '0001980000',
            companyName: 'Acme AI Tech Corp',
            formType: 'S-1',
            filedAt: now
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/sec_edgar/0001980000/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = EdgarFilingSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`SEC EDGAR Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const obs = {
            id: `obs_edgar_${validated.data.cik}_${validated.data.formType}_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.HORIZON,
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
        return (0, core_1.ok)([obs]);
    }
}
exports.SecEdgarAdapter = SecEdgarAdapter;
//# sourceMappingURL=sec_edgar.js.map