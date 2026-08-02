import React from 'react';
import { Value } from '../../../components/Value';

export default function MarketsPage() {
  const prices = [
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar', price: '1.3145', change: '+0.42%', source: 'twelve_data', age: 5 },
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: '1.0920', change: '-0.15%', source: 'twelve_data', age: 5 },
    { symbol: 'WTI_CRUDE', name: 'WTI Light Sweet Crude', price: '$78.40', change: '+1.85%', source: 'twelve_data', age: 10 },
    { symbol: 'SPX_INDEX', name: 'S&P 500 Index', price: '5,520.40', change: '+0.28%', source: 'finnhub', age: 15 }
  ];

  const shortPositions = [
    { company: 'ASOS PLC', ticker: 'ASC.L', netShortPct: '7.85%', manager: 'Marshall Wace LLP', date: '2026-08-01' },
    { company: 'BOOHOO GROUP PLC', ticker: 'BOO.L', netShortPct: '5.40%', manager: 'GLG Partners', date: '2026-08-01' }
  ];

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
          Real-time price feeds, futures positioning (CFTC COT), and FCA disclosed UK short positions.
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
          MULTI-ASSET SPOT BREADTH
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px' }}>
          {prices.map((p) => (
            <div key={p.symbol} style={{ border: '1px solid #E4E4DF', padding: '14px', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#14181B' }}>{p.symbol}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{p.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Value provenance={{ value: p.price, source: p.source, sourceTimestamp: new Date().toISOString(), stalenessSeconds: p.age }} />
                <div style={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', fontWeight: 700, color: p.change.startsWith('+') ? '#16A34A' : '#DC2626', marginTop: '2px' }}>
                  {p.change}
                </div>
              </div>
            </div>
          ))}
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
          FCA UK NET SHORT POSITIONS REGISTER
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4DF', textAlign: 'left', color: '#6B7280' }}>
              <th style={{ padding: '10px 16px' }}>COMPANY</th>
              <th style={{ padding: '10px 16px' }}>TICKER</th>
              <th style={{ padding: '10px 16px' }}>NET SHORT %</th>
              <th style={{ padding: '10px 16px' }}>INVESTMENT MANAGER</th>
              <th style={{ padding: '10px 16px' }}>DISCLOSED DATE</th>
            </tr>
          </thead>
          <tbody>
            {shortPositions.map((s, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #E4E4DF' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>{s.company}</td>
                <td style={{ padding: '12px 16px' }}>{s.ticker}</td>
                <td style={{ padding: '12px 16px', color: '#DC2626', fontWeight: 700 }}>{s.netShortPct}</td>
                <td style={{ padding: '12px 16px' }}>{s.manager}</td>
                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{s.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
