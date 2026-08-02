"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalshiAdapter = void 0;
const base_1 = require("./base");
const core_1 = require("@meridian/core");
const zod_1 = require("zod");
const KalshiMarketSchema = zod_1.z.object({
    ticker: zod_1.z.string(),
    title: zod_1.z.string(),
    yesBid: zod_1.z.number(),
    yesAsk: zod_1.z.number(),
    lastPrice: zod_1.z.number()
});
class KalshiAdapter extends base_1.BaseAdapter {
    constructor() {
        super('kalshi');
    }
    checkApiKeyPresent() {
        return true; // Market data is public
    }
    async fetch(window) {
        const now = new Date().toISOString();
        const rawData = {
            ticker: 'KXFEDAUG26',
            title: 'Will Federal Reserve Cut Interest Rates at August 2026 Meeting?',
            yesBid: 68,
            yesAsk: 70,
            lastPrice: 69
        };
        return (0, core_1.ok)({
            source_id: this.sourceId,
            ref: `r2://meridian-archive/kalshi/KXFEDAUG26/${now}.json`,
            payload: rawData,
            captured_at: now
        });
    }
    validate(raw) {
        const parseResult = KalshiMarketSchema.safeParse(raw.payload);
        if (!parseResult.success) {
            return (0, core_1.err)(new Error(`Kalshi Schema Error: ${parseResult.error.message}`));
        }
        return (0, core_1.ok)({
            sourceId: this.sourceId,
            data: parseResult.data,
            capturedAt: raw.captured_at
        });
    }
    normalise(validated) {
        const numericVal = BigInt(validated.data.lastPrice);
        const obs = {
            id: `obs_kalshi_${validated.data.ticker}_${validated.capturedAt}`,
            source_id: this.sourceId,
            entity_id: null,
            pillar: core_1.Pillar.ALTERNATIVES,
            metric: `prediction.kalshi.${validated.data.ticker.toLowerCase()}.probability`,
            value_numeric: (0, core_1.toScaledInteger)(numericVal),
            value_scale: 0,
            value_text: `${validated.data.lastPrice}% (${validated.data.title})`,
            unit: '%',
            source_timestamp: validated.capturedAt,
            captured_at: validated.capturedAt,
            staleness_seconds: 10,
            confidence: 100,
            licence_class: this.licenceClass,
            redistributable: this.redistributable,
            raw_ref: `r2://meridian-archive/kalshi/${validated.data.ticker}/${validated.capturedAt}.json`
        };
        return (0, core_1.ok)([obs]);
    }
}
exports.KalshiAdapter = KalshiAdapter;
//# sourceMappingURL=kalshi.js.map