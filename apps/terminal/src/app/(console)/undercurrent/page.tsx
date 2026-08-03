'use client';

import React from 'react';

export default function UndercurrentPage() {
  // DEMO DATA NOTICE — NAMED-PERSON LIABILITY: The entity join row previously
  // displayed here used the name of a real US congresswoman (Rep. Virginia Foxx)
  // and a named executive ('CEO Johnathan Vance') in fabricated financial
  // disclosure data with specific dollar amounts and transaction types.
  // This is a distinct liability from generic seed data and is removed entirely
  // — not just labelled as DEMO. No fabricated entity join involving real
  // named individuals may remain visible at any disclosure level.
  //
  // The entity resolution, congressional trade, USAspending, and SEC Form 4
  // cross-join pipeline is built in the registry but not yet wired to any
  // live data source. When real alt-data adapters begin producing verified
  // entity-join records, they will appear here via the standard Observation
  // query interface.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          THE UNDERCURRENT — ALT-DATA &amp; CROSS-SOURCE ENTITY JOINS
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          Smart Money &amp; Government Contract Joins
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Congressional stock transactions cross-referenced against federal contract awards, SEC Form 4 insider purchases, and flight/maritime tracking.
        </p>
      </div>

      {/* DEMO notice — elevated severity for named-person fabrication */}
      <div style={{
        border: '1px solid #FCA5A5',
        backgroundColor: '#FEF2F2',
        padding: '16px 20px',
        fontFamily: '"DM Mono", monospace',
        fontSize: '12px',
      }}>
        <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.05em' }}>
          ⚠ DEMO — ALT-DATA ADAPTERS NOT CONNECTED
        </div>
        <div style={{ color: '#7F1D1D', lineHeight: '1.6' }}>
          No live entity join data is available. The congressional trade (Quiver Quant), federal contract (USAspending), and SEC Form 4 adapter pipeline is built but not yet wired to this view. Records will appear here only when sourced from a verified live adapter fetch — fabricated joins involving real named individuals or institutions are not permitted at any stage.
        </div>
      </div>

      <div style={{ border: '1px solid #E4E4DF' }}>
        <div style={{
          backgroundColor: '#F7F7F5',
          padding: '12px 16px',
          fontSize: '12px',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 700,
          borderBottom: '1px solid #E4E4DF',
          color: '#1C3A5E',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          CROSS-SOURCE ENTITY JOINS
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            fontWeight: 700,
            fontSize: '10px',
            border: '1px solid #FCA5A5',
          }}>DEMO — NO LIVE DATA</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: '"DM Mono", monospace', fontSize: '12px', color: '#9CA3AF' }}>
          No entity joins available. Live alt-data adapter connection required.
        </div>
      </div>
    </div>
  );
}
