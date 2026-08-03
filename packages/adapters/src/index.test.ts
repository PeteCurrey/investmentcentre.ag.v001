import { describe, it, expect } from 'vitest';
import { createAdapter } from './index';

describe('packages/adapters (Phase 1 Ingestion Adapters)', () => {
  const adapters = [
    { id: 'fred', expectedPillar: 'WORLD' },
    { id: 'twelve_data', expectedPillar: 'MARKETS' },
    { id: 'sec_edgar', expectedPillar: 'HORIZON' },
    { id: 'usaspending', expectedPillar: 'UNDERCURRENT' },
    { id: 'kalshi', expectedPillar: 'ALTERNATIVES' },
    { id: 'finnhub', expectedPillar: 'MARKETS' },
    { id: 'fca_short_positions', expectedPillar: 'MARKETS' },
    { id: 'cftc_cot', expectedPillar: 'MARKETS' },
    { id: 'eia', expectedPillar: 'WORLD' },
    { id: 'us_treasury_fiscal', expectedPillar: 'WORLD' },
    { id: 'companies_house', expectedPillar: 'HORIZON' },
    { id: 'gleif', expectedPillar: 'UNDERCURRENT' },
  ];

  adapters.forEach(({ id, expectedPillar }) => {
    it(`runs full ingestion pipeline for adapter '${id}' across pillar ${expectedPillar}`, async () => {
      const adapter = createAdapter(id);
      expect(adapter.sourceId).toBe(id);
      expect(adapter.pillar).toBe(expectedPillar);

      // 1. Fetch
      const fetchRes = await adapter.fetch({ start: '2026-08-01T00:00:00Z', end: '2026-08-02T00:00:00Z' });
      expect(fetchRes.success).toBe(true);

      if (fetchRes.success) {
        // 2. Validate
        const valRes = adapter.validate(fetchRes.value);
        expect(valRes.success).toBe(true);

        if (valRes.success) {
          // 3. Normalise
          const normRes = adapter.normalise(valRes.value);
          expect(normRes.success).toBe(true);

          if (normRes.success) {
            expect(normRes.value.length).toBeGreaterThan(0);
            const obs = normRes.value[0];
            expect(obs.source_id).toBe(id);
            expect(obs.pillar).toBe(expectedPillar);
            expect(obs.licence_class).toBeDefined();
            // Raw reference must point to R2 archive
            expect(obs.raw_ref).toMatch(/^r2:\/\//);
          }
        }
      }

      // 4. Health check
      const health = await adapter.health();
      expect(health.source_id).toBe(id);
      expect(health.state).toBeDefined();
    });
  });

  it('handles unbuilt registered sources cleanly by returning NOT_CONNECTED state without throwing', async () => {
    const unbuiltIds = ['nasdaq_ipo_calendar', 'opencorporates', 'polymarket', 'manifold'];
    for (const id of unbuiltIds) {
      const adapter = createAdapter(id);
      expect(adapter.sourceId).toBe(id);
      const health = await adapter.health();
      expect(health.state).toBe('NOT_CONNECTED');
      const fetchRes = await adapter.fetch();
      expect(fetchRes.success).toBe(false);
    }
  });
});

