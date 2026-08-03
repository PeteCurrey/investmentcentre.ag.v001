import React from 'react';
import { Value } from '../../../components/Value';

export default function BookPage() {
  // DEMO DATA NOTICE: The positions array below is a structural placeholder.
  // No live positions have been fetched from OANDA or any other source.
  // Entry prices, current prices, units, and unrealized P&L are all '—'.
  // 'thesisStatus: INTACT' is a static label, not a computed falsification result.
  // The position count in the section header (2) reflects the seed array length,
  // not the number of actual open positions.
  const positions = [
    {
      symbol: 'GBP/USD',
      name: 'British Pound / US Dollar',
      pillar: 'MARKETS',
      units: '—',
      entryPrice: '—',
      currentPrice: '—',
      unrealizedPnl: '—',
      thesisTitle: 'UK/US Rate Differential Hold',
      thesisStatus: 'INTACT'
    },
    {
      symbol: 'WTI_CRUDE',
      name: 'WTI Light Sweet Crude Oil',
      pillar: 'MARKETS',
      units: '—',
      entryPrice: '—',
      currentPrice: '—',
      unrealizedPnl: '—',
      thesisTitle: 'EIA Energy Supply Drawdown',
      thesisStatus: 'INTACT'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          PORTFOLIO & WATCHLIST ENGINE
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The Book
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Standing positions, active watchlist items, and attached mandatory falsification criteria.
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
          color: '#1C3A5E',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          STANDING POSITIONS ({positions.length})
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontWeight: 700,
            fontSize: '10px',
            border: '1px solid #FCD34D',
          }}>DEMO — NO LIVE POSITIONS</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4DF', textAlign: 'left', color: '#6B7280' }}>
              <th style={{ padding: '10px 16px' }}>SYMBOL</th>
              <th style={{ padding: '10px 16px' }}>UNITS</th>
              <th style={{ padding: '10px 16px' }}>ENTRY</th>
              <th style={{ padding: '10px 16px' }}>CURRENT</th>
              <th style={{ padding: '10px 16px' }}>UNREALIZED P&L</th>
              <th style={{ padding: '10px 16px' }}>ATTACHED THESIS</th>
              <th style={{ padding: '10px 16px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #E4E4DF' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>{pos.symbol}</td>
                <td style={{ padding: '12px 16px' }}>{pos.units}</td>
                <td style={{ padding: '12px 16px' }}>{pos.entryPrice}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Value provenance={{ value: pos.currentPrice, source: 'twelve_data', sourceTimestamp: new Date().toISOString(), stalenessSeconds: 5 }} />
                </td>
                <td style={{ padding: '12px 16px', color: '#16A34A', fontWeight: 700 }}>{pos.unrealizedPnl}</td>
                <td style={{ padding: '12px 16px' }}>{pos.thesisTitle}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#DCFCE7',
                    color: '#166534',
                    fontWeight: 700,
                    fontSize: '10px',
                    border: '1px solid #86EFAC'
                  }}>
                    {pos.thesisStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
