'use client';

import React from 'react';
import { Value } from '../../../components/Value';

export default function BriefPage() {
  // DEMO DATA NOTICE: The previous version of this page contained:
  // 1. KPI tiles with hardcoded statistics: '18 Active' feeds, '142' deltas,
  //    '92% High' council consensus — none sourced from any live system.
  //    Sparkline paths were decorative SVG constants, not real data series.
  // 2. A salience board with three hardcoded items including:
  //    - 'Fed Funds Rate Breach 5.75%' — a fabricated specific rate figure.
  //    - 'Defense Innovation Systems $5M' — referencing the same fabricated
  //      entity join (with a real congresswoman's name) removed from /undercurrent.
  //    - Fabricated 'val' fields ('5.75%', '4.85%', '$5,000,000.00') rendered
  //      via Value with source IDs implying they were fetched observations.
  // 3. A hardcoded date string '02 AUGUST 2026' in the page header.
  //
  // The salience ranking engine, delta detector, and cross-pillar synthesis
  // are architectural components — they are not yet emitting live output to
  // this page. The Brief will populate from real engine output once adapters
  // are connected and the salience ranking pipeline is wired through.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: '"DM Mono", monospace' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', letterSpacing: '1px' }}>
            DAILY EXECUTIVE SYNTHESIS
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#14181B', letterSpacing: '-0.5px', margin: 0 }}>
            The Brief
          </h1>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', marginBottom: 0 }}>
            Deterministic explicit-weight salience ranking &amp; position impact assessment.
          </p>
        </div>
      </div>

      {/* DEMO notice */}
      <div style={{
        border: '1px solid #FCD34D',
        backgroundColor: '#FFFBEB',
        padding: '16px 20px',
        fontSize: '12px',
      }}>
        <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.05em' }}>
          ⚠ DEMO — SALIENCE ENGINE NOT CONNECTED
        </div>
        <div style={{ color: '#78350F', lineHeight: '1.6' }}>
          No live brief data is available. The salience ranking engine, delta detector, and cross-pillar synthesis pipeline are built but not yet wired to produce output for this page. KPI summary tiles and the ranked delta board will populate automatically once adapters are connected and the engine begins emitting scored Observation records. The date header, feed counts, and consensus figures on this page must come from live system state — not hardcoded values.
        </div>
      </div>

      {/* KPI tiles — only the honest GBP/USD '—' tile remains */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Three fabricated tiles replaced with disconnected placeholders */}
        {[
          { label: 'MONITORED FEEDS', source: 'registry' },
          { label: 'DELTAS DETECTED (24H)', source: 'delta_engine' },
          { label: 'COUNCIL CONSENSUS', source: 'ai_council' },
        ].map((kpi, idx) => (
          <div key={idx} style={{ border: '1px solid #FCD34D', padding: '14px 16px', backgroundColor: '#FFFBEB', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.5px' }}>
              {kpi.label}
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: '#92400E' }}>
              DEMO — NOT CONNECTED
            </div>
          </div>
        ))}
        {/* GBP/USD tile — honest '—' state, kept as-is */}
        <div style={{ border: '1px solid #E4E4DF', padding: '14px 16px', backgroundColor: '#F7F7F5', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.5px' }}>
            GBP/USD SPOT
          </div>
          <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 500, color: '#14181B' }}>
            <Value provenance={{ value: '—', unit: 'GBP/USD', source: 'twelve_data', sourceTimestamp: new Date().toISOString(), stalenessSeconds: 0 }} />
          </div>
        </div>
      </div>

      {/* Salience board — empty state */}
      <div style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E4E4DF', paddingBottom: '10px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#1C3A5E', margin: 0, letterSpacing: '0.5px' }}>
            [SALIENCE RANKING] HIGHEST PRIORITY OPPORTUNITIES &amp; DELTAS
          </h2>
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontWeight: 700,
            fontSize: '10px',
            border: '1px solid #FCD34D',
          }}>DEMO — ENGINE OUTPUT REQUIRED</span>
        </div>
        <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
          No ranked deltas available. Salience engine connection required.
        </div>
      </div>
    </div>
  );
}
