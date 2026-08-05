'use client';

import React from 'react';
import TradeButton from '../../../components/TradeButton';
import { INSTRUMENT_UNIVERSE } from '../../../lib/instruments';

export default function UndercurrentPage() {
  const instruments = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'US500', 'US100', 'UK100', 'WTI', 'BTC/USD', 'ETH/USD', 'USD/CAD', 'AUD/USD'
  ];
  
  const sentimentData = instruments.map((sym, i) => {
    const inst = INSTRUMENT_UNIVERSE.find(u => u.symbol === sym) || { symbol: sym, oandaId: sym.replace('/', '_'), description: sym };
    const retailLong = 35 + (i * 7) % 50; 
    const retailShort = 100 - retailLong;
    const isContrarianBuy = retailLong < 40;
    const isContrarianSell = retailLong > 70;
    const instBias = isContrarianBuy ? 'LONG' : (isContrarianSell ? 'SHORT' : 'FLAT');
    const cot = (isContrarianBuy ? 1 : -1) * (10000 + (i * 3700) % 50000);
    const signal = isContrarianBuy ? 'CONTRARIAN BUY' : (isContrarianSell ? 'CONTRARIAN SELL' : 'NEUTRAL');
    
    return {
      symbol: inst.symbol,
      oandaId: inst.oandaId,
      name: inst.description,
      retailLong,
      retailShort,
      instBias,
      cot,
      signal
    };
  });

  return (
    <div style={{ padding: '24px', fontFamily: '"Inter", sans-serif', color: '#0F172A', backgroundColor: '#F7F7F5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#0F172A' }}>UNDERCURRENT</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>Sentiment & Positioning Intelligence (Indicative Modelled Data)</p>
      </div>

      {/* Top row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Risk meter */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#0F172A', padding: '8px 12px', marginBottom: '16px', borderRadius: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Systemic Risk Meter</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
            <span>Risk-Off</span>
            <span>Risk-On (62/100)</span>
          </div>
          <div style={{ height: '24px', width: '100%', background: 'linear-gradient(to right, #DC2626, #EAB308, #22C55E)', borderRadius: '12px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-4px', bottom: '-4px', left: '62%', width: '4px', backgroundColor: '#0F172A', border: '2px solid #FFFFFF', borderRadius: '4px' }}></div>
          </div>
        </div>

        {/* Fear & Greed */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#0F172A', padding: '8px 12px', marginBottom: '16px', borderRadius: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Fear & Greed Index</h2>
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <div style={{ fontSize: '48px', fontFamily: '"DM Mono", monospace', fontWeight: 700, color: '#22C55E', lineHeight: '1' }}>58</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#6B7280', marginTop: '4px' }}>GREED</div>
          </div>
        </div>

        {/* Put/Call Ratio */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#0F172A', padding: '8px 12px', marginBottom: '16px', borderRadius: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Put/Call Ratios</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>SPX</span>
              <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>0.85</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>NDX</span>
              <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>0.92</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Money Flow */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#0F172A', padding: '8px 12px', marginBottom: '16px', borderRadius: '2px', display: 'inline-block' }}>
          <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Smart Money Flow (Sector Capital Direction)</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { sector: 'Technology', flow: '+ $1.4B', bias: 'INFLOW', color: '#22C55E' },
            { sector: 'Energy', flow: '- $850M', bias: 'OUTFLOW', color: '#DC2626' },
            { sector: 'Financials', flow: '+ $320M', bias: 'INFLOW', color: '#22C55E' },
            { sector: 'Utilities', flow: '- $1.1B', bias: 'OUTFLOW', color: '#DC2626' },
          ].map(s => (
            <div key={s.sector} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1C3A5E', marginBottom: '8px' }}>{s.sector}</div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '20px', fontWeight: 700, color: s.color, marginBottom: '4px' }}>{s.flow}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>{s.bias}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment Breakdown Table */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ backgroundColor: '#0F172A', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Sentiment Breakdown</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E4E4DF' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Instrument</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Retail Long</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Retail Short</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Inst Bias</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>COT Net Pos</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Signal</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sentimentData.map((row, i) => (
                <tr key={row.symbol} style={{ borderBottom: '1px solid #E4E4DF', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9F9F9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1C3A5E' }}>{row.symbol}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{row.name}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Mono", monospace', color: row.retailLong > 50 ? '#22C55E' : '#DC2626' }}>{row.retailLong}%</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Mono", monospace', color: row.retailShort > 50 ? '#22C55E' : '#DC2626' }}>{row.retailShort}%</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: row.instBias === 'LONG' ? '#22C55E' : row.instBias === 'SHORT' ? '#DC2626' : '#6B7280' }}>{row.instBias}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Mono", monospace' }}>{row.cot > 0 ? '+' : ''}{row.cot.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '12px', color: row.signal.includes('BUY') ? '#22C55E' : row.signal.includes('SELL') ? '#DC2626' : '#6B7280' }}>{row.signal}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <TradeButton instrument={{ symbol: row.symbol, oandaId: row.oandaId }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
