"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwelveDataAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const TwelveDataQuoteSchema = zod_1.z.object({
    symbol: zod_1.z.string(),
    name: zod_1.z.string(),
    close: zod_1.z.string(),
    datetime: zod_1.z.string()
});
class TwelveDataAdapter extends base_1.BaseAdapter {
    constructor() {
        super('twelve_data');
    }
    checkApiKeyPresent() {
        return !!process.env.TWELVE_DATA_API_KEY;
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            symbol: 'GBP/USD',
            name: 'British Pound / US Dollar',
            close: '1.3145',
            datetime: now
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/twelve_data/GBP_USD/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = TwelveDataQuoteSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`TwelveData Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(Math.round(parseFloat(validated.data.close) * 10000));
        const obs = {
            id: `obs_td_${validated.data.symbol.replace('/', '_')}_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.MARKETS,
            metric: `price.spot.${validated.data.symbol.replace('/', '_').toLowerCase()}`,
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
            value_scale: 4,
            value_text: validated.data.close,
            unit: 'USD',
            source_timestamp: validated.data.datetime,
            captured_at: validated.capturedAt,
            staleness_seconds: 5,
            confidence: 100,
            licence_class: this.licenceClass,
            redistributable: this.redistributable,
            raw_ref: `r2://meridian-archive/twelve_data/${validated.data.symbol}/${validated.capturedAt}.json`
        };
        return (0, core_1.ok)([obs]);
    }
}
exports.TwelveDataAdapter = TwelveDataAdapter;
//# sourceMappingURL=twelve_data.js.map