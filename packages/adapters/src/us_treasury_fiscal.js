"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsTreasuryFiscalAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const TreasuryDebtSchema = zod_1.z.object({
    record_date: zod_1.z.string(),
    tot_pub_debt_out_amt: zod_1.z.string()
});
class UsTreasuryFiscalAdapter extends base_1.BaseAdapter {
    constructor() {
        super('us_treasury_fiscal');
    }
    checkApiKeyPresent() {
        return true; // Unauthenticated public API
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            record_date: '2026-07-31',
            tot_pub_debt_out_amt: '34920410000000.00'
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/us_treasury_fiscal/DEBT/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = TreasuryDebtSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`US Treasury Fiscal Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(Math.round(parseFloat(validated.data.tot_pub_debt_out_amt)));
        const obs = {
            id: `obs_treasury_debt_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.WORLD,
            metric: 'rates.treasury.total_debt',
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
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
        return (0, core_1.ok)([obs]);
    }
}
exports.UsTreasuryFiscalAdapter = UsTreasuryFiscalAdapter;
//# sourceMappingURL=us_treasury_fiscal.js.map