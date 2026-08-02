import React from 'react';

export default function ThesesPage() {
  const theses = [
    {
      id: 'ths_101',
      symbol: 'GBP/USD',
      title: 'UK/US Rate Differential Hold',
      rationale: 'Bank of England holds rates while Fed prepares cuts, boosting GBP relative strength.',
      status: 'INTACT',
      criteria: [
        { metric: 'macro.fred.fedfunds', condition: 'GREATER_THAN 5.50%', desc: 'Fed hikes interest rates above 5.50%' },
        { metric: 'price.spot.gbp_usd', condition: 'LESS_THAN 1.2800', desc: 'Price breaches major support level at 1.2800' }
      ]
    },
    {
      id: 'ths_102',
      symbol: 'WTI_CRUDE',
      title: 'EIA Energy Supply Drawdown',
      rationale: 'Weekly EIA inventories show continuous drawdown in crude stockpiles.',
      status: 'INTACT',
      criteria: [
        { metric: 'commodity.eia.stockpile', condition: 'GREATER_THAN +5M bbl', desc: 'Unexpected inventory build of > 5 million barrels' }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          INVESTMENT CONVICTION & FALSIFICATION ENGINE
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          Active Theses & Invalidation Rules
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Every standing position MUST possess explicit, measurable falsification criteria. Unfalsifiable positions are prohibited.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {theses.map((t) => (
          <div key={t.id} style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700, fontSize: '14px', color: '#1C3A5E' }}>
                  [{t.symbol}]
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#14181B' }}>
                  {t.title}
                </span>
              </div>
              <span style={{
                padding: '3px 10px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                fontWeight: 700,
                fontSize: '11px',
                fontFamily: '"DM Mono", monospace',
                border: '1px solid #86EFAC'
              }}>
                STATUS: {t.status}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px', lineHeight: '1.4' }}>
              <strong>Rationale:</strong> {t.rationale}
            </p>

            <div style={{ borderTop: '1px solid #E4E4DF', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#14181B', fontFamily: '"DM Mono", monospace', marginBottom: '8px' }}>
                MANDATORY FALSIFICATION CRITERIA ({t.criteria.length})
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {t.criteria.map((c, idx) => (
                  <li key={idx} style={{
                    padding: '8px 12px',
                    backgroundColor: '#F7F7F5',
                    border: '1px solid #E4E4DF',
                    fontSize: '12px',
                    fontFamily: '"DM Mono", monospace',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>
                      <strong style={{ color: '#DC2626' }}>[TRIGGER]</strong> {c.metric} ({c.condition})
                    </span>
                    <span style={{ color: '#6B7280' }}>
                      {c.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
