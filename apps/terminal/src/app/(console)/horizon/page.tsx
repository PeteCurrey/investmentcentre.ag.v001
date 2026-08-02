import React from 'react';
import { Value } from '../../../components/Value';

export default function HorizonPage() {
  const events = [
    {
      id: 'evt_1',
      title: 'Acme AI Tech Corp S-1 IPO Registration',
      eventType: 'IPO_REGISTRATION',
      scheduledAt: '2026-08-15',
      daysUntil: 13,
      sourceId: 'sec_edgar',
      filingRef: 'r2://sec_edgar/0001980000/S1.json',
      predictionOdds: { source: 'kalshi', ticker: 'KXACMEIPO', prob: '64%' }
    },
    {
      id: 'evt_2',
      title: 'FOMC Federal Reserve Interest Rate Decision',
      eventType: 'CENTRAL_BANK_DECISION',
      scheduledAt: '2026-08-20',
      daysUntil: 18,
      sourceId: 'fred',
      predictionOdds: { source: 'kalshi', ticker: 'KXFEDAUG26', prob: '69%' }
    },
    {
      id: 'evt_3',
      title: 'FTSE 100 Quarterly Index Rebalance',
      eventType: 'INDEX_REBALANCE',
      scheduledAt: '2026-09-01',
      daysUntil: 30,
      sourceId: 'companies_house',
      predictionOdds: null
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          FORWARD EVENT & TIMEFRAME HORIZON
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The Horizon
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Unified forward calendar linking SEC EDGAR filings, central bank dates, and Kalshi/Polymarket event contract odds.
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
          UPCOMING EVENTS (NEXT 90 DAYS)
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4DF', textAlign: 'left', color: '#6B7280' }}>
              <th style={{ padding: '10px 16px' }}>COUNTDOWN</th>
              <th style={{ padding: '10px 16px' }}>EVENT TYPE</th>
              <th style={{ padding: '10px 16px' }}>TITLE</th>
              <th style={{ padding: '10px 16px' }}>SCHEDULED DATE</th>
              <th style={{ padding: '10px 16px' }}>SOURCE & ARCHIVE</th>
              <th style={{ padding: '10px 16px' }}>PREDICTION ODDS</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt) => (
              <tr key={evt.id} style={{ borderBottom: '1px solid #E4E4DF' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1C3A5E' }}>
                  T-{evt.daysUntil} Days
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: '#F7F7F5',
                    border: '1px solid #E4E4DF',
                    fontSize: '10px',
                    fontWeight: 700
                  }}>
                    {evt.eventType}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{evt.title}</td>
                <td style={{ padding: '12px 16px' }}>{evt.scheduledAt}</td>
                <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                  {evt.sourceId}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {evt.predictionOdds ? (
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>
                      {evt.predictionOdds.prob} ({evt.predictionOdds.source})
                    </span>
                  ) : (
                    <span style={{ color: '#9CA3AF' }}>N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
