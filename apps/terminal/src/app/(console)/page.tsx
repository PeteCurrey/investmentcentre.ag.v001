import React from 'react';
import { Value } from '../../components/Value';

export default function BriefPage() {
  const salienceRankedDeltas = [
    {
      id: 'sal_1',
      title: 'Fed Funds Rate Breach (5.75% vs 5.50% Thesis Threshold)',
      metric: 'macro.fred.fedfunds',
      pillar: 'WORLD',
      score: 90,
      breakdown: 'Matches active thesis (+40); Triggers complete thesis invalidation (+30); Cross-source contradiction (+20)',
      source: 'fred',
      val: '5.75%',
      age: 10
    },
    {
      id: 'sal_2',
      title: 'FCA Net Short Positions Spike on FTSE Retail Equities',
      metric: 'short_interest.fca.uk_net_shorts',
      pillar: 'MARKETS',
      score: 70,
      breakdown: 'Matches active thesis (+40); Cross-source contradiction (+20); Metric velocity accelerating (+10)',
      source: 'fca_short_positions',
      val: '4.85%',
      age: 120
    },
    {
      id: 'sal_3',
      title: 'Defense Innovation Systems Contract Award ($5M USD)',
      metric: 'contract.gov.award_amount',
      pillar: 'UNDERCURRENT',
      score: 40,
      breakdown: 'Matches active thesis (+40)',
      source: 'usaspending',
      val: '$5,000,000.00',
      age: 3600
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          DAILY EXECUTIVE SYNTHESIS — 02 AUGUST 2026
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B', letterSpacing: '-0.5px' }}>
          The Brief
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Ranked cross-asset intelligence, deterministic explicit-weight salience ranking, and position impact assessment.
        </p>
      </div>

      {/* KPI Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'MONITORED FEEDS', val: '18 Active', source: 'registry', age: 0 },
          { label: 'DELTAS DETECTED (24H)', val: '142', source: 'delta_engine', age: 12 },
          { label: 'COUNCIL CONSENSUS', val: '92% High', source: 'ai_council', age: 45 },
          { label: 'GBP/USD SPOT', val: '1.3145', unit: 'GBP/USD', source: 'twelve_data', age: 5 },
        ].map((kpi, idx) => (
          <div key={idx} style={{ border: '1px solid #E4E4DF', padding: '16px', backgroundColor: '#F7F7F5' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>
              {kpi.label}
            </div>
            <div style={{ marginTop: '8px', fontSize: '18px' }}>
              <Value provenance={{ value: kpi.val, unit: kpi.unit, source: kpi.source, sourceTimestamp: new Date().toISOString(), stalenessSeconds: kpi.age }} />
            </div>
          </div>
        ))}
      </div>

      {/* Salience Ranked Priority Board */}
      <div style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#FFFFFF' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E', borderBottom: '1px solid #E4E4DF', paddingBottom: '8px', marginBottom: '16px' }}>
          [SALIENCE RANKING] HIGHEST PRIORITY OPPORTUNITIES & DELTAS
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {salienceRankedDeltas.map((item) => (
            <div key={item.id} style={{
              border: '1px solid #E4E4DF',
              padding: '16px',
              backgroundColor: '#F7F7F5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: item.score >= 80 ? '#FEE2E2' : '#FEF3C7',
                    color: item.score >= 80 ? '#991B1B' : '#92400E',
                    fontFamily: '"DM Mono", monospace',
                    fontWeight: 700,
                    fontSize: '11px',
                    border: '1px solid #E4E4DF'
                  }}>
                    SALIENCE SCORE: {item.score}/100
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#14181B' }}>
                    {item.title}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                  <strong>WEIGHT BREAKDOWN:</strong> {item.breakdown}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Value provenance={{ value: item.val, source: item.source, sourceTimestamp: new Date().toISOString(), stalenessSeconds: item.age }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
