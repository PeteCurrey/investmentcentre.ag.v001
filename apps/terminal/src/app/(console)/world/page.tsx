'use client';

import React from 'react';
import Link from 'next/link';
import { Value } from '../../../components/Value';

export default function WorldPage() {
  const macroSeries = [
    {
      id: 'macro_1',
      name: 'Federal Funds Effective Rate',
      metric: 'macro.fred.fedfunds',
      value: '—',
      source: 'fred',
      staleness: 86400,
      timestamp: '2026-08-01T00:00:00Z',
      impact: 'NEUTRAL — Monetary policy unchanged at latest FOMC window',
      impactBias: 'NEUTRAL' as const,
      instruments: ['DXY', 'TLT', 'GLD', 'EEM'],
    },
    {
      id: 'macro_2',
      name: 'US Total Public Debt Outstanding',
      metric: 'rates.treasury.total_debt',
      value: '$34,920,410,000,000.00',
      source: 'us_treasury_fiscal',
      staleness: 86400,
      timestamp: '2026-08-01T00:00:00Z',
      impact: 'HIGH — Fiscal expansion trajectory maintains long-term inflation pressure',
      impactBias: 'BEARISH' as const,
      instruments: ['TLT', 'GLD', 'DXY', 'MBB'],
    },
    {
      id: 'macro_3',
      name: 'US Ending Stocks of Crude Oil (Excl. SPR)',
      metric: 'commodity.eia.crude_stocks',
      value: '426,800,000 bbl',
      source: 'eia',
      staleness: 604800,
      timestamp: '2026-07-26T00:00:00Z',
      impact: 'BULLISH — Crude inventories down 3.4M bbl week-on-week vs +1.2M consensus',
      impactBias: 'BULLISH' as const,
      instruments: ['WTI_CRUDE', 'XOM', 'XLE', 'UAL'],
    }
  ];

  const biasConfig = {
    BULLISH: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: '↑ BULLISH' },
    BEARISH: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: '↓ BEARISH' },
    NEUTRAL: { bg: '#F7F7F5', color: '#6B7280', border: '#E4E4DF', label: '→ NEUTRAL' },
  };

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
          Global macro releases, central bank policy stance, Treasury auctions, energy stockpiles, and geopolitical event streams. Click any indicator for full analysis.
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

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {macroSeries.map((item, idx) => {
            const bias = biasConfig[item.impactBias];
            return (
              <Link
                key={item.id}
                href={`/story/${item.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderBottom: idx < macroSeries.length - 1 ? '1px solid #E4E4DF' : 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => ((e.currentTarget as any).style.backgroundColor = '#F7F7F5')}
                  onMouseLeave={e => ((e.currentTarget as any).style.backgroundColor = '#FFFFFF')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#14181B' }}>{item.name}</span>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: bias.bg,
                          color: bias.color,
                          fontFamily: '"DM Mono", monospace',
                          fontWeight: 700,
                          fontSize: '10px',
                          border: `1px solid ${bias.border}`,
                        }}>
                          {bias.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '8px' }}>
                        {item.metric} | SOURCE: {item.source}
                      </div>
                      <div style={{ fontSize: '12px', color: '#1C3A5E', backgroundColor: bias.bg, padding: '6px 10px', border: `1px solid ${bias.border}`, display: 'inline-block' }}>
                        <strong>IMPACT:</strong> {item.impact}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                      <Value provenance={{ value: item.value, source: item.source, sourceTimestamp: item.timestamp, stalenessSeconds: item.staleness }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#6B7280', marginRight: '2px' }}>MOVES:</span>
                    {item.instruments.map(t => (
                      <span key={t} style={{
                        padding: '1px 6px',
                        backgroundColor: '#F7F7F5',
                        border: `1px solid ${bias.border}`,
                        fontFamily: '"DM Mono", monospace',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: bias.color,
                      }}>
                        {t}
                      </span>
                    ))}
                    <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#9CA3AF', marginLeft: 'auto' }}>
                      READ FULL ANALYSIS →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
