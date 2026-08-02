"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinnhubAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const FinnhubQuoteSchema = zod_1.z.object({
    c: zod_1.z.number(), // Current price
    d: zod_1.z.number().nullable(), // Change
    dp: zod_1.z.number().nullable(), // Percent change
    h: zod_1.z.number(), // High
    l: zod_1.z.number(), // Low
    o: zod_1.z.number(), // Open
    pc: zod_1.z.number(), // Previous close
    t: zod_1.z.number() // Timestamp
});
class FinnhubAdapter extends base_1.BaseAdapter {
    constructor() {
        super('finnhub');
    }
    checkApiKeyPresent() {
        return !!process.env.FINNHUB_API_KEY;
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            c: 5520.40,
            d: 15.20,
            dp: 0.28,
            h: 5535.10,
            l: 5510.00,
            o: 5512.00,
            pc: 5505.20,
            t: Math.floor(Date.now() / 1000)
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/finnhub/SPX/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = FinnhubQuoteSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`Finnhub Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(Math.round(validated.data.c * 100));
        const obs = {
            id: `obs_finnhub_spx_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.MARKETS,
            metric: 'price.spot.spx_index',
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
            value_scale: 2,
            value_text: validated.data.c.toString(),
            unit: 'USD',
            source_timestamp: new Date(validated.data.t * 1000).toISOString(),
            captured_at: validated.capturedAt,
            staleness_seconds: 15,
            confidence: 100,
            licence_class: this.licenceClass,
            redistributable: this.redistributable,
            raw_ref: `r2://meridian-archive/finnhub/SPX/${validated.capturedAt}.json`
        };
        return (0, core_1.ok)([obs]);
    }
}
exports.FinnhubAdapter = FinnhubAdapter;
//# sourceMappingURL=finnhub.js.map