import { NextResponse } from 'next/server';
import { WAVE_1_REGISTRY } from '@meridian/registry';
import { createAdapter } from '@meridian/adapters';

export async function GET() {
  const healthResults = await Promise.all(
    WAVE_1_REGISTRY.map(async (source) => {
      try {
        const adapter = createAdapter(source.id);
        const h = await adapter.health();
        return {
          ...h,
          name: source.name,
          pillar: source.pillar,
          licence_class: source.licence_class,
          redistributable: source.redistributable
        };
      } catch {
        return {
          source_id: source.id,
          name: source.name,
          pillar: source.pillar,
          state: 'NOT_CONNECTED',
          expected_cadence: source.cadence,
          staleness_seconds: 0,
          error_rate_24h: 0.0,
          rows_written_last_window: 0,
          quota_consumed_mtd: 0,
          cost_mtd_usd: 0.0,
          licence_class: source.licence_class,
          redistributable: source.redistributable,
          updated_at: new Date().toISOString()
        };
      }
    })
  );

  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    total_sources: healthResults.length,
    connected_sources: healthResults.filter(h => h.state === 'HEALTHY').length,
    sources: healthResults
  });
}
