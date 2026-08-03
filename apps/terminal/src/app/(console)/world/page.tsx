'use client';

import React from 'react';

export default function WorldPage() {
  // DEMO DATA NOTICE: Two of the three rows below contained specific fabricated figures:
  // - 'US Total Public Debt $34,920,410,000,000.00' — a hardcoded number, not fetched
  //   from us_treasury_fiscal, with a hardcoded timestamp '2026-08-01'.
  // - 'US Ending Stocks of Crude Oil 426,800,000 bbl' — hardcoded, not fetched from EIA,
  //   with a fabricated 'EIA draw -3.4M bbl vs +1.2M consensus' narrative.
  // The Fed Funds Rate row was honest ('—', value not available).
  // All three rows are removed here. The FRED, EIA, and us_treasury_fiscal adapters
  // are built in the registry but are not yet wired to populate this view.
  // Specific named figures with named sources must come from real fetches, not literals.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          PILLAR I — GLOBAL STATE, MACRO &amp; PHYSICAL ECONOMY
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The World
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Global macro releases, central bank policy stance, Treasury auctions, energy stockpiles, and geopolitical event streams. Click any indicator for full analysis.
        </p>
      </div>

      {/* DEMO notice */}
      <div style={{
        border: '1px solid #FCD34D',
        backgroundColor: '#FFFBEB',
        padding: '16px 20px',
        fontFamily: '"DM Mono", monospace',
        fontSize: '12px',
      }}>
        <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.05em' }}>
          ⚠ DEMO — MACRO ADAPTERS NOT CONNECTED
        </div>
        <div style={{ color: '#78350F', lineHeight: '1.6' }}>
          No live macro data is available. The FRED, EIA, US Treasury Fiscal Data, and related adapters are registered (see <a href="/health" style={{ color: '#1C3A5E', textDecoration: 'underline' }}>/health</a>) but are not yet wired to populate this view. Specific macro figures and narrative impact assessments require real adapter output — hardcoded numbers with named sources are not permitted. This board will populate once adapter fetches are connected.
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
          MACROECONOMIC &amp; PHYSICAL ECONOMY MONITORING
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontWeight: 700,
            fontSize: '10px',
            border: '1px solid #FCD34D',
          }}>DEMO — NO LIVE FEED</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: '"DM Mono", monospace', fontSize: '12px', color: '#9CA3AF' }}>
          No macro observations loaded. Adapter connection required.
        </div>
      </div>
    </div>
  );
}
