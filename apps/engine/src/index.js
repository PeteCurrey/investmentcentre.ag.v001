"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("@meridian/registry");
const adapters_1 = require("@meridian/adapters");
const delta_1 = require("@meridian/delta");
const core_1 = require("@meridian/core");
const log = (0, core_1.createLogger)('IngestionEngine');
const mode = process.env.TIER_4_ENABLED === 'true' ? 'EXECUTE' : 'OBSERVE';
log.info('MERIDIAN Ingestion Daemon & Contradiction Engine v1.0 started', {
    registrySize: registry_1.WAVE_1_REGISTRY.length,
    mode,
});
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
                        log.info('Ingestion cycle OK', {
                            sourceId,
                            observations: normRes.value.length,
                            rawRef: fetchRes.value.ref,
                        });
                    }
                }
            }
        }
        catch (err) {
            log.error('Ingestion cycle failed', { sourceId, errorMessage: err.message });
        }
    }
    // Contradiction Detection
    const contradictions = deltaEngine.detectContradictions(accumulatedObservations);
    if (contradictions.length > 0) {
        log.warn('Cross-source contradictions detected', { count: contradictions.length });
        for (const c of contradictions) {
            log.warn('Contradiction detail', {
                metric: c.metric,
                sourceIdA: c.sourceIdA,
                valueA: c.valueA,
                sourceIdB: c.sourceIdB,
                valueB: c.valueB,
                divergencePct: c.divergencePct,
            });
        }
    }
    else {
        log.info('Contradiction check passed', { totalObservations: accumulatedObservations.length });
    }
}
// Initial Run
runIngestionCycle();
// Loop every 30s
setInterval(() => {
    runIngestionCycle();
}, 30000);
//# sourceMappingURL=index.js.map