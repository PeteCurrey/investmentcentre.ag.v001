'use client';

import React from 'react';
import TradeButton from '../../../components/TradeButton';
import AutoListButton from '../../../components/AutoListButton';
import { INSTRUMENT_UNIVERSE } from '../../../lib/instruments';

export default function WorldPage() {
  const regions = [
    {
      name: 'UNITED STATES',
      rate: '5.50%',
      cpi: '3.2%',
      gdp: '2.5%',
      pmi: '50.3',
      bias: 'NEUTRAL',
      biasColor: '#6B7280',
      risk: 'Sticky inflation delaying Fed cuts',
      instruments: ['USD/JPY', 'US500']
    },
    {
      name: 'EUROZONE',
      rate: '4.50%',
      cpi: '2.6%',
      gdp: '0.1%',
      pmi: '49.2',
      bias: 'BEARISH',
      biasColor: '#DC2626',
      risk: 'Stagflation amid weak German manufacturing',
      instruments: ['EUR/USD', 'EUR/GBP']
    },
    {
      name: 'UNITED KINGDOM',
      rate: '5.25%',
      cpi: '3.4%',
      gdp: '-0.3%',
      pmi: '51.1',
      bias: 'BULLISH',
      biasColor: '#22C55E',
      risk: 'Services inflation remains elevated',
      instruments: ['GBP/USD']
    },
    {
      name: 'JAPAN',
      rate: '0.10%',
      cpi: '2.8%',
      gdp: '0.4%',
      pmi: '48.2',
      bias: 'BEARISH',
      biasColor: '#DC2626',
      risk: 'Intervention risks on excessive JPY weakness',
      instruments: ['USD/JPY']
    },
    {
      name: 'CHINA',
      rate: '3.45%',
      cpi: '0.7%',
      gdp: '5.2%',
      pmi: '50.8',
      bias: 'NEUTRAL',
      biasColor: '#6B7280',
      risk: 'Property sector liquidity constraints',
      instruments: ['AUD/USD']
    },
    {
      name: 'EMERGING MARKETS',
      rate: 'VARIES',
      cpi: '4.5%',
      gdp: '4.0%',
      pmi: '51.5',
      bias: 'BULLISH',
      biasColor: '#22C55E',
      risk: 'Strong USD tightening financial conditions',
      instruments: ['XAU/USD', 'XTI/USD']
    }
  ];

  const rates = [
    { name: 'US 2Y', yield: '4.62%', change: '+0.04' },
    { name: 'US 10Y', yield: '4.21%', change: '+0.03' },
    { name: 'US 30Y', yield: '4.35%', change: '+0.02' },
    { name: 'UK 10Y', yield: '3.98%', change: '+0.05' },
    { name: 'GER 10Y', yield: '2.35%', change: '-0.01' },
    { name: 'JPN 10Y', yield: '0.75%', change: '+0.02' },
    { name: 'AUS 10Y', yield: '4.05%', change: '+0.01' },
    { name: 'EM INDEX', yield: '6.12%', change: '-0.03' }
  ];

  const fxImplications = [
    { pair: 'GBP/USD', setup: 'Divergent policy favoring BoE over Fed in near term', action: 'LONG' },
    { pair: 'EUR/USD', setup: 'Growth differentials supporting USD', action: 'SHORT' },
    { pair: 'USD/JPY', setup: 'Carry trade intact but intervention risk elevated', action: 'NEUTRAL' }
  ];

  return (
    <div style={{ backgroundColor: '#F7F7F5', minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '32px' }}>
      <header style={{ borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>THE WORLD</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginTop: '8px', letterSpacing: '1px' }}>MACROECONOMIC MONITOR</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {regions.map((region, i) => (
          <div key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ backgroundColor: '#0F172A', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#C8F135', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>{region.name}</span>
              <span style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 700, backgroundColor: region.biasColor, padding: '2px 8px', borderRadius: '12px' }}>{region.bias}</span>
            </div>
            
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>POLICY RATE</div>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{region.rate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>CPI YOY</div>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{region.cpi}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>GDP GROWTH</div>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{region.gdp}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>PMI</div>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{region.pmi}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: '10px', borderRadius: '4px', border: '1px solid #E5E7EB', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, marginBottom: '4px' }}>KEY RISK</div>
                <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{region.risk}</div>
              </div>
              
              <div>
                <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, marginBottom: '8px' }}>LINKED INSTRUMENTS</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {region.instruments.map(symbol => {
                    const inst = INSTRUMENT_UNIVERSE.find(i => i.symbol === symbol);
                    return inst ? (
                      <div key={symbol} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <TradeButton instrument={inst} />
                        <AutoListButton symbol={symbol} />
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px' }}>
          <div style={{ backgroundColor: '#1C3A5E', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px' }}>
            <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>GLOBAL RATES</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E4E4DF' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>BOND</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>YIELD</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>CHANGE</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{rate.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: '"DM Mono", monospace', fontSize: '14px', color: '#0F172A', fontWeight: 600 }}>{rate.yield}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: '"DM Mono", monospace', fontSize: '14px', color: rate.change.startsWith('+') ? '#22C55E' : '#DC2626', fontWeight: 600 }}>{rate.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px' }}>
          <div style={{ backgroundColor: '#1C3A5E', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px' }}>
            <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>FX IMPLICATIONS</span>
          </div>
          <div style={{ padding: '16px' }}>
            {fxImplications.map((fx, i) => {
              const inst = INSTRUMENT_UNIVERSE.find(inst => inst.symbol === fx.pair);
              return (
                <div key={i} style={{ paddingBottom: '16px', marginBottom: '16px', borderBottom: i < fxImplications.length - 1 ? '1px solid #E4E4DF' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flexGrow: 1, paddingRight: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{fx.pair}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: fx.action === 'LONG' ? '#DCFCE7' : fx.action === 'SHORT' ? '#FEE2E2' : '#F3F4F6', color: fx.action === 'LONG' ? '#166534' : fx.action === 'SHORT' ? '#991B1B' : '#374151' }}>{fx.action}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4B5563', margin: 0 }}>{fx.setup}</p>
                  </div>
                  <div>
                    {inst && <TradeButton instrument={inst} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
