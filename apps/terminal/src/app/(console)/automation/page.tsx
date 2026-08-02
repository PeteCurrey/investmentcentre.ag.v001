'use client';

import React from 'react';

export default function AutomationPage() {
  const tier4Enabled = process.env.NEXT_PUBLIC_TIER_4_ENABLED === 'true';
  const oandaEnv = process.env.NEXT_PUBLIC_OANDA_ENVIRONMENT || 'practice';
  const oandaAccount = process.env.NEXT_PUBLIC_OANDA_ACCOUNT_ID || '—';

  const rules = [
    {
      id: 'rule_1',
      name: 'Fed Funds Threshold Breached',
      triggerMetric: 'macro.fred.fedfunds',
      tier: '1_WATCH',
      enabled: true,
      targetInstrument: 'GBP/USD',
      direction: 'BUY',
      stopLossPrice: '1.3000'
    },
    {
      id: 'rule_2',
      name: 'EIA Energy Supply Shock',
      triggerMetric: 'commodity.eia.stockpile',
      tier: '2_RESEARCH',
      enabled: true,
      targetInstrument: 'WTI_CRUDE',
      direction: 'BUY',
      stopLossPrice: '75.00'
    },
    {
      id: 'rule_3',
      name: 'FCA Short Interest Acceleration',
      triggerMetric: 'short_interest.fca.uk_net_shorts',
      tier: '3_PREPARE',
      enabled: true,
      targetInstrument: 'GBP/USD',
      direction: 'BUY',
      stopLossPrice: '1.2950'
    },
    {
      id: 'rule_4',
      name: 'Direct Market Execution Seam',
      triggerMetric: 'price.spot.gbp_usd',
      tier: '4_EXECUTE',
      enabled: true,
      targetInstrument: 'GBP/USD',
      direction: 'BUY',
      stopLossPrice: '1.3000'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          PILLAR VIII — AUTOMATION ENGINE & 4-TIER ESCALATION
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          Automation Rule Registry
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Configured rules across Watch, Research, Prepare, and Execute tiers.
          {tier4Enabled ? ' Tier 4 live execution is ACTIVE via Oanda.' : ' Tier 4 Execution is config-disabled.'}
        </p>
      </div>

      <div style={{
        border: `2px solid ${tier4Enabled ? '#86EFAC' : '#FCA5A5'}`,
        padding: '16px',
        backgroundColor: tier4Enabled ? '#DCFCE7' : '#FEE2E2',
        fontFamily: '"DM Mono", monospace',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>GLOBAL SYSTEM STATE:</strong> TIER 4 (EXECUTE) IS currently{' '}
          {tier4Enabled ? (
            <span style={{ color: '#166534', fontWeight: 700, backgroundColor: '#FFFFFF', padding: '2px 8px', border: '1px solid #86EFAC' }}>⚡ LIVE — EXECUTE MODE</span>
          ) : (
            <span style={{ color: '#991B1B', fontWeight: 700 }}>CONFIG-DISABLED — OBSERVE MODE</span>
          )}
        </div>
        {tier4Enabled && (
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#166534' }}>
            <div>BROKER: Oanda v20 REST API</div>
            <div>ENV: {oandaEnv.toUpperCase()} | ACCOUNT: {oandaAccount}</div>
          </div>
        )}
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
          ACTIVE AUTOMATION RULES ({rules.length})
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4DF', textAlign: 'left', color: '#6B7280' }}>
              <th style={{ padding: '10px 16px' }}>RULE NAME</th>
              <th style={{ padding: '10px 16px' }}>TRIGGER METRIC</th>
              <th style={{ padding: '10px 16px' }}>TIER</th>
              <th style={{ padding: '10px 16px' }}>TARGET</th>
              <th style={{ padding: '10px 16px' }}>DIRECTION</th>
              <th style={{ padding: '10px 16px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #E4E4DF' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>{r.name}</td>
                <td style={{ padding: '12px 16px', color: '#1C3A5E' }}>{r.triggerMetric}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: r.tier === '4_EXECUTE' ? '#FEE2E2' : '#F7F7F5',
                    color: r.tier === '4_EXECUTE' ? '#991B1B' : '#14181B',
                    fontWeight: 700,
                    fontSize: '10px',
                    border: '1px solid #E4E4DF'
                  }}>
                    {r.tier}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>{r.targetInstrument}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: r.direction === 'BUY' ? '#16A34A' : '#DC2626' }}>
                  {r.direction}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: r.enabled ? '#DCFCE7' : '#FEF3C7',
                    color: r.enabled ? '#166534' : '#92400E',
                    fontWeight: 700,
                    fontSize: '10px',
                    border: '1px solid #E4E4DF'
                  }}>
                    {r.enabled ? 'ENABLED' : 'DISABLED'}
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
