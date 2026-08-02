import React from 'react';

export default function AlternativesPage() {
  const predictionMarkets = [
    { source: 'Kalshi', ticker: 'KXFEDAUG26', title: 'Will Federal Reserve Cut Rates at August 2026 Meeting?', prob: '69%', volume: '$1.4M', status: 'ACTIVE' },
    { source: 'Polymarket', ticker: 'US-ELECTION-2028', title: 'US Presidential Election 2028 Winner Party', prob: '52% Dem / 48% Rep', volume: '$12.8M', status: 'ACTIVE' },
    { source: 'Manifold', ticker: 'M-AI-AGI-2026', title: 'Will AGI be declared by top lab before end of 2026?', prob: '31%', volume: 'M$450k', status: 'SANDBOX' }
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
          Event probabilities from Kalshi, Polymarket, and Manifold alongside alternative asset pricing feeds.
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
          PREDICTION MARKET EVENT PROBABILITIES
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4DF', textAlign: 'left', color: '#6B7280' }}>
              <th style={{ padding: '10px 16px' }}>SOURCE</th>
              <th style={{ padding: '10px 16px' }}>TICKER</th>
              <th style={{ padding: '10px 16px' }}>EVENT TITLE</th>
              <th style={{ padding: '10px 16px' }}>IMPLIED PROBABILITY</th>
              <th style={{ padding: '10px 16px' }}>VOLUME</th>
              <th style={{ padding: '10px 16px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {predictionMarkets.map((pm, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #E4E4DF' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1C3A5E' }}>{pm.source}</td>
                <td style={{ padding: '12px 16px' }}>{pm.ticker}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{pm.title}</td>
                <td style={{ padding: '12px 16px', color: '#16A34A', fontWeight: 700 }}>{pm.prob}</td>
                <td style={{ padding: '12px 16px' }}>{pm.volume}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: pm.status === 'ACTIVE' ? '#DCFCE7' : '#F7F7F5',
                    color: pm.status === 'ACTIVE' ? '#166534' : '#6B7280',
                    fontWeight: 700,
                    fontSize: '10px',
                    border: '1px solid #E4E4DF'
                  }}>
                    {pm.status}
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
