import { WAVE_1_REGISTRY } from '@meridian/registry';
import { createAdapter } from '@meridian/adapters';
import { DeltaEngine } from '@meridian/delta';
import { Observation, createLogger } from '@meridian/core';

const log = createLogger('IngestionEngine');

log.info('MERIDIAN Ingestion Daemon & Contradiction Engine v1.0 started', {
  registrySize: WAVE_1_REGISTRY.length,
  mode: 'OBSERVE',
});

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
            log.info('Ingestion cycle OK', {
              sourceId,
              observations: normRes.value.length,
              rawRef: fetchRes.value.ref,
            });
          }
        }
      }
    } catch (err: any) {
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
  } else {
    log.info('Contradiction check passed', { totalObservations: accumulatedObservations.length });
  }
}

// Initial Run
runIngestionCycle();

// Loop every 30s
setInterval(() => {
  runIngestionCycle();
}, 30000);
