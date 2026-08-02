import React from 'react';
import { Value } from '../../../components/Value';

export default function WorldPage() {
  const macroSeries = [
    {
      id: 'macro_1',
      name: 'Federal Funds Effective Rate',
      metric: 'macro.fred.fedfunds',
      value: '5.33%',
      source: 'fred',
      pillar: 'WORLD',
      staleness: 86400,
      timestamp: '2026-08-01T00:00:00Z',
      impact: 'NEUTRAL — Monetary policy unchanged at latest FOMC window'
    },
    {
      id: 'macro_2',
      name: 'US Total Public Debt Outstanding',
      metric: 'rates.treasury.total_debt',
      value: '$34,920,410,000,000.00',
      source: 'us_treasury_fiscal',
      pillar: 'WORLD',
      staleness: 86400,
      timestamp: '2026-08-01T00:00:00Z',
      impact: 'HIGH — Fiscal expansion trajectory maintains long-term inflation pressure'
    },
    {
      id: 'macro_3',
      name: 'US Ending Stocks of Crude Oil (Excl. SPR)',
      metric: 'commodity.eia.crude_stocks',
      value: '426,800,000 bbl',
      source: 'eia',
      pillar: 'WORLD',
      staleness: 604800,
      timestamp: '2026-07-26T00:00:00Z',
      impact: 'BULLISH — Crude inventories down 3.4M bbl week-on-week'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          PILLAR I — GLOBAL STATE, MACRO & PHYSICAL ECONOMY
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The World
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Global macro releases, central bank policy stance, Treasury auctions, energy stockpiles, and geopolitical event streams.
        </p>
      </div>

      <div style={{ border: '1px solid #E4E4DF' }}>
        <div style={{
          backgroundColor: '#F7F7F5',
          padding: '12px 16px',
          fontSize: '12px',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 700,
          borderBottom: '1px solid #E4E4DF',
          color: '#1C3A5E'
        }}>
          MACROECONOMIC & PHYSICAL ECONOMY MONITORING
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          {macroSeries.map((item) => (
            <div key={item.id} style={{ border: '1px solid #E4E4DF', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#14181B' }}>
                  {item.name}
                </span>
                <Value provenance={{ value: item.value, source: item.source, sourceTimestamp: item.timestamp, stalenessSeconds: item.staleness }} />
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '8px' }}>
                METRIC: {item.metric} | SOURCE: {item.source}
              </div>
              <div style={{ fontSize: '12px', color: '#1C3A5E', backgroundColor: '#F7F7F5', padding: '8px 12px', border: '1px solid #E4E4DF' }}>
                <strong>IMPACT ASSESSMENT:</strong> {item.impact}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
