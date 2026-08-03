'use client';

import React from 'react';

export default function AlternativesPage() {
  // DEMO DATA NOTICE: The predictionMarkets array was hardcoded seed data.
  // Kalshi KXFEDAUG26 69%, Polymarket 52%/48%, and Manifold 31% were static
  // literals — not fetched from any Kalshi, Polymarket, or Manifold API.
  // Volume figures ($1.4M, $12.8M, M$450k) were hardcoded.
  // The Kalshi and prediction market adapters are designed but not yet wired
  // to populate this view.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          PILLAR V — ALTERNATIVE ASSETS &amp; PREDICTION MARKETS
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          Alternatives &amp; Event Contracts
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Event probabilities from Kalshi, Polymarket, and Manifold alongside alternative asset pricing feeds.
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
          ⚠ DEMO — PREDICTION MARKET ADAPTERS NOT CONNECTED
        </div>
        <div style={{ color: '#78350F', lineHeight: '1.6' }}>
          No live prediction market data is available. Probability figures displayed here must come from real Kalshi/Polymarket/Manifold API fetches — static probability literals are not permitted. This panel will populate once the prediction market adapters are wired to this view.
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
          PREDICTION MARKET EVENT PROBABILITIES
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
          No event contracts loaded. Adapter connection required.
        </div>
      </div>
    </div>
  );
}
