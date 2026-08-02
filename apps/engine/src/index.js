"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("@meridian/registry");
const adapters_1 = require("@meridian/adapters");
const delta_1 = require("@meridian/delta");
console.log('====================================================');
console.log('MERIDIAN Ingestion Daemon & Contradiction Engine v1.0');
console.log(`Loaded ${registry_1.WAVE_1_REGISTRY.length} Wave-1 source registry entries.`);
console.log('Mode: OBSERVE | Ingestion Engine: ACTIVE');
console.log('====================================================');
const deltaEngine = new delta_1.DeltaEngine();
const activeAdapters = [
    'fred',
    'twelve_data',
    'sec_edgar',
    'usaspending',
    'kalshi',
    'finnhub',
    'fca_short_positions',
    'cftc_cot',
    'eia',
    'us_treasury_fiscal',
    'companies_house',
    'gleif'
];
async function runIngestionCycle() {
    const window = {
        start: new Date(Date.now() - 86400000).toISOString(),
        end: new Date().toISOString()
    };
    const accumulatedObservations = [];
    for (const sourceId of activeAdapters) {
        try {
            const adapter = (0, adapters_1.createAdapter)(sourceId);
            const fetchRes = await adapter.fetch(window);
            if (fetchRes.success) {
                const valRes = adapter.validate(fetchRes.value);
                if (valRes.success) {
                    const normRes = adapter.normalise(valRes.value);
                    if (normRes.success) {
                        accumulatedObservations.push(...normRes.value);
                        console.log(`[INGESTION OK] Source: ${sourceId} | Observations: ${normRes.value.length} | RawRef: ${fetchRes.value.ref}`);
                    }
                }
            }
        }
        catch (err) {
            console.error(`[INGESTION ERROR] Source ${sourceId}:`, err.message);
        }
    }
    // Contradiction Detection
    const contradictions = deltaEngine.detectContradictions(accumulatedObservations);
    if (contradictions.length > 0) {
        console.warn(`[CONTRADICTION DETECTED] ${contradictions.length} cross-source conflicts logged.`);
        for (const c of contradictions) {
            console.warn(` -> Metric: ${c.metric} | SourceA: ${c.sourceIdA} (${c.valueA}) vs SourceB: ${c.sourceIdB} (${c.valueB}) | Divergence: ${c.divergencePct}%`);
        }
    }
    else {
        console.log(`[CONTRADICTION CHECK] Zero cross-source conflicts across ${accumulatedObservations.length} observations.`);
    }
}
// Initial Run
runIngestionCycle();
// Loop every 30s
setInterval(() => {
    runIngestionCycle();
}, 30000);
//# sourceMappingURL=index.js.map