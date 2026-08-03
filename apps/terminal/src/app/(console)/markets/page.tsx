'use client';

import React from 'react';
import Link from 'next/link';
import { Value } from '../../../components/Value';

export default function MarketsPage() {
  const prices = [
    { id: 'mkt_gbpusd', symbol: 'GBP/USD', name: 'British Pound / US Dollar', price: '—', change: '—', source: 'twelve_data', age: 0, bias: 'NEUTRAL' as const, note: 'Range-bound 1.295–1.328. FOMC catalyst.' },
    { id: 'mkt_eurusd', symbol: 'EUR/USD', name: 'Euro / US Dollar', price: '—', change: '—', source: 'twelve_data', age: 0, bias: 'BEARISH' as const, note: 'USD strength on delayed cut cycle.' },
    { id: 'mkt_wti', symbol: 'WTI_CRUDE', name: 'WTI Light Sweet Crude', price: '—', change: '—', source: 'twelve_data', age: 0, bias: 'BULLISH' as const, note: 'EIA draw -3.4M bbl vs +1.2M consensus.' },
    { id: 'mkt_spx', symbol: 'SPX_INDEX', name: 'S&P 500 Index', price: '—', change: '—', source: 'finnhub', age: 0, bias: 'NEUTRAL' as const, note: 'Earnings season support. Fed rate sensitivity.' },
  ];

  const shortPositions = [
    { id: 'mkt_short_asos', company: 'ASOS PLC', ticker: 'ASC.L', netShortPct: '7.85%', manager: 'Marshall Wace LLP', date: '2026-08-01', severity: 'HIGH' },
    { id: 'mkt_short_boohoo', company: 'BOOHOO GROUP PLC', ticker: 'BOO.L', netShortPct: '5.40%', manager: 'GLG Partners', date: '2026-08-01', severity: 'MEDIUM' },
  ];

  const biasConfig = {
    BULLISH: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', arrow: '↑' },
    BEARISH: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', arrow: '↓' },
    NEUTRAL: { bg: '#F7F7F5', color: '#6B7280', border: '#E4E4DF', arrow: '→' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          PILLAR II — MULTI-ASSET PRICES & DISCLOSED POSITIONING
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The Markets
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Real-time price feeds, futures positioning (CFTC COT), and FCA disclosed UK short positions. Click any item for full trader analysis.
        </p>
      </div>

      {/* Spot Price Breadth */}
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
          MULTI-ASSET SPOT BREADTH — CLICK FOR FULL ANALYSIS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {prices.map((p, idx) => {
            const bias = biasConfig[p.bias];
            const isPositive = p.change.startsWith('+');
            return (
              <Link
                key={p.symbol}
                href={`/story/${p.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderRight: idx % 2 === 0 ? '1px solid #E4E4DF' : 'none',
                    borderBottom: idx < 2 ? '1px solid #E4E4DF' : 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => ((e.currentTarget as any).style.backgroundColor = '#F7F7F5')}
                  onMouseLeave={e => ((e.currentTarget as any).style.backgroundColor = '#FFFFFF')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#14181B' }}>{p.symbol}</span>
                        <span style={{
                          padding: '1px 6px',
                          backgroundColor: bias.bg,
                          color: bias.color,
                          fontFamily: '"DM Mono", monospace',
                          fontWeight: 700,
                          fontSize: '10px',
                          border: `1px solid ${bias.border}`,
                        }}>
                          {bias.arrow} {p.bias}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', fontStyle: 'italic' }}>
                        {p.note}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Value provenance={{ value: p.price, source: p.source, sourceTimestamp: new Date().toISOString(), stalenessSeconds: p.age }} />
                      <div style={{
                        fontSize: '12px',
                        fontFamily: '"DM Mono", monospace',
                        fontWeight: 700,
                        color: isPositive ? '#16A34A' : '#DC2626',
                        marginTop: '2px',
                      }}>
                        {p.change}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* FCA UK Net Short Positions */}
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
          FCA UK NET SHORT POSITIONS REGISTER — CLICK FOR FULL ANALYSIS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shortPositions.map((s, idx) => (
            <Link
              key={s.id}
              href={`/story/${s.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: idx < shortPositions.length - 1 ? '1px solid #E4E4DF' : 'none',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => ((e.currentTarget as any).style.backgroundColor = '#FEE2E2')}
                onMouseLeave={e => ((e.currentTarget as any).style.backgroundColor = '#FFFFFF')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#14181B', fontFamily: '"DM Mono", monospace', marginBottom: '2px' }}>
                      {s.ticker}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{s.company}</div>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontFamily: '"DM Mono", monospace',
                    fontWeight: 700,
                    color: '#DC2626',
                  }}>
                    {s.netShortPct}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                    Net Short<br />{s.manager}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#6B7280' }}>
                    Disclosed: {s.date}
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    backgroundColor: s.severity === 'HIGH' ? '#FEE2E2' : '#FEF3C7',
                    color: s.severity === 'HIGH' ? '#991B1B' : '#92400E',
                    fontFamily: '"DM Mono", monospace',
                    fontWeight: 700,
                    fontSize: '10px',
                    border: `1px solid ${s.severity === 'HIGH' ? '#FCA5A5' : '#FCD34D'}`,
                  }}>
                    {s.severity} CONVICTION →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
