'use client';

import React from 'react';
import Link from 'next/link';

export default function AlternativesPage() {
  const predictionMarkets = [
    { id: 'alt_1', source: 'Kalshi', ticker: 'KXFEDAUG26', title: 'Will Federal Reserve Cut Rates at August 2026 Meeting?', prob: '69%', volume: '$1.4M', status: 'ACTIVE' },
    { id: 'alt_2', source: 'Polymarket', ticker: 'US-ELECTION-2028', title: 'US Presidential Election 2028 Winner Party', prob: '52% Dem / 48% Rep', volume: '$12.8M', status: 'ACTIVE' },
    { id: 'alt_3', source: 'Manifold', ticker: 'M-AI-AGI-2026', title: 'Will AGI be declared by top lab before end of 2026?', prob: '31%', volume: 'M$450k', status: 'SANDBOX' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          PILLAR V — ALTERNATIVE ASSETS & PREDICTION MARKETS
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          Alternatives & Event Contracts
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Event probabilities from Kalshi, Polymarket, and Manifold alongside alternative asset pricing feeds. Click row for detail.
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
          PREDICTION MARKET EVENT PROBABILITIES — CLICK FOR FULL ANALYSIS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {predictionMarkets.map((pm, idx) => (
            <Link
              key={pm.id}
              href={`/story/${pm.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: idx < predictionMarkets.length - 1 ? '1px solid #E4E4DF' : 'none',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => ((e.currentTarget as any).style.backgroundColor = '#F7F7F5')}
                onMouseLeave={e => ((e.currentTarget as any).style.backgroundColor = '#FFFFFF')}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#14181B' }}>{pm.title}</span>
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor: pm.status === 'ACTIVE' ? '#DCFCE7' : '#F7F7F5',
                      color: pm.status === 'ACTIVE' ? '#166534' : '#6B7280',
                      fontWeight: 700,
                      fontSize: '9px',
                      fontFamily: '"DM Mono", monospace',
                      border: '1px solid #E4E4DF'
                    }}>
                      {pm.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                    {pm.source} | Ticker: {pm.ticker} | Vol: {pm.volume}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#16A34A', fontWeight: 700, fontSize: '18px', fontFamily: '"DM Mono", monospace' }}>
                    {pm.prob}
                  </div>
                </div>
                
                <div style={{ color: '#9CA3AF', fontSize: '14px', paddingLeft: '8px' }}>
                  →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
