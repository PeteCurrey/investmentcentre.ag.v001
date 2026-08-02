import { WAVE_1_REGISTRY } from '@meridian/registry';
import { createAdapter } from '@meridian/adapters';
import { DeltaEngine } from '@meridian/delta';
import { Observation } from '@meridian/core';

console.log('====================================================');
console.log('MERIDIAN Ingestion Daemon & Contradiction Engine v1.0');
console.log(`Loaded ${WAVE_1_REGISTRY.length} Wave-1 source registry entries.`);
console.log('Mode: OBSERVE | Ingestion Engine: ACTIVE');
console.log('====================================================');

const deltaEngine = new DeltaEngine();
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

  const accumulatedObservations: Observation[] = [];

  for (const sourceId of activeAdapters) {
    try {
      const adapter = createAdapter(sourceId);
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
    } catch (err: any) {
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
  } else {
    console.log(`[CONTRADICTION CHECK] Zero cross-source conflicts across ${accumulatedObservations.length} observations.`);
  }
}

// Initial Run
runIngestionCycle();

// Loop every 30s
setInterval(() => {
  runIngestionCycle();
}, 30000);
