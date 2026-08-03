'use client';

import React from 'react';

export default function HorizonPage() {
  // DEMO DATA NOTICE: The events array below was hardcoded seed data.
  // 'Acme AI Tech Corp S-1' is a fictional company. The FOMC and FTSE
  // entries had hardcoded dates and daysUntil counts that do not update.
  // The Kalshi odds (64%, 69%) were static literals, not fetched.
  // The horizon calendar is designed to ingest from sec_edgar, fred, and
  // kalshi/polymarket adapters — none of which are wired to this view yet.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          FORWARD EVENT &amp; TIMEFRAME HORIZON
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The Horizon
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Unified forward calendar linking SEC EDGAR filings, central bank dates, and Kalshi/Polymarket event contract odds.
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
          ⚠ DEMO — CALENDAR ADAPTERS NOT CONNECTED
        </div>
        <div style={{ color: '#78350F', lineHeight: '1.6' }}>
          No live event data is available. The forward calendar is designed to ingest from SEC EDGAR, FRED, and Kalshi/Polymarket adapters. None are currently wired to populate this view. This panel will populate automatically once the respective adapters are connected and fetching.
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
          UPCOMING EVENTS (NEXT 90 DAYS)
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
          No events loaded. Adapter connection required.
        </div>
      </div>
    </div>
  );
}
