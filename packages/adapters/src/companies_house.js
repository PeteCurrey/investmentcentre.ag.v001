"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesHouseAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const CompaniesHouseProfileSchema = zod_1.z.object({
    company_number: zod_1.z.string(),
    company_name: zod_1.z.string(),
    company_status: zod_1.z.string(),
    type: zod_1.z.string(),
    date_of_creation: zod_1.z.string()
});
class CompaniesHouseAdapter extends base_1.BaseAdapter {
    constructor() {
        super('companies_house');
    }
    checkApiKeyPresent() {
        return !!process.env.COMPANIES_HOUSE_API_KEY;
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            company_number: '01234567',
            company_name: 'MERIDIAN CAPITAL UK LTD',
            company_status: 'active',
            type: 'ltd',
            date_of_creation: '2020-01-15'
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/companies_house/01234567/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = CompaniesHouseProfileSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`Companies House Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const obs = {
            id: `obs_ch_${validated.data.company_number}_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.HORIZON,
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
        return (0, core_1.ok)([obs]);
    }
}
exports.CompaniesHouseAdapter = CompaniesHouseAdapter;
//# sourceMappingURL=companies_house.js.map