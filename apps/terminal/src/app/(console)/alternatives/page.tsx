'use client';

import React from 'react';
import TradeButton from '../../../components/TradeButton';
import { INSTRUMENT_UNIVERSE } from '../../../lib/instruments';

function instFor(sym: string) {
  return INSTRUMENT_UNIVERSE.find(i => i.symbol === sym || i.oandaId === sym.replace('/', '_'))
    ?? { symbol: sym, oandaId: sym.replace('/', '_') };
}

export default function AlternativesPage() {
  // We can filter INSTRUMENT_UNIVERSE if we wanted live symbols, but to guarantee the required list we'll just match against it where possible
  // Using explicit list for the required UI
  const commData = [
    { symbol: 'XAU/USD', name: 'Gold', price: '2,420.50', ytd: '+12.4%', high52: '2,450.00', low52: '1,810.00', bias: 'DEMAND DRIVEN' },
    { symbol: 'XAG/USD', name: 'Silver', price: '29.85', ytd: '+18.2%', high52: '32.50', low52: '21.00', bias: 'BALANCED' },
    { symbol: 'WTI', name: 'WTI Crude', price: '82.40', ytd: '+9.5%', high52: '95.03', low52: '67.71', bias: 'SUPPLY TIGHT' },
    { symbol: 'BRENT', name: 'Brent Crude', price: '86.10', ytd: '+8.8%', high52: '97.69', low52: '71.84', bias: 'SUPPLY TIGHT' },
    { symbol: 'NATGAS', name: 'Natural Gas', price: '2.85', ytd: '-15.4%', high52: '3.64', low52: '1.52', bias: 'OVERSUPPLY' },
    { symbol: 'COPPER', name: 'Copper', price: '4.65', ytd: '+22.1%', high52: '5.20', low52: '3.50', bias: 'DEMAND DRIVEN' },
    { symbol: 'PLAT', name: 'Platinum', price: '985.20', ytd: '-4.2%', high52: '1,130.00', low52: '840.00', bias: 'BALANCED' },
    { symbol: 'PALL', name: 'Palladium', price: '940.50', ytd: '-18.5%', high52: '1,320.00', low52: '850.00', bias: 'OVERSUPPLY' },
  ];

  const cryptoData = [
    { symbol: 'BTC/USD', name: 'Bitcoin', dom: '54.2%', vol: '$28.4B', fg: '65' },
    { symbol: 'ETH/USD', name: 'Ethereum', dom: '17.8%', vol: '$12.1B', fg: '58' },
    { symbol: 'SOL/USD', name: 'Solana', dom: '3.1%', vol: '$2.5B', fg: '72' },
    { symbol: 'XRP/USD', name: 'Ripple', dom: '1.9%', vol: '$1.1B', fg: '45' },
  ];

  return (
    <div style={{ padding: '24px', fontFamily: '"Inter", sans-serif', color: '#0F172A', backgroundColor: '#F7F7F5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#0F172A' }}>ALTERNATIVES DEEP-DIVE</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>Commodities, Crypto & Alternative Yield</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* COMMODITIES TABLE */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#0F172A', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px' }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Commodities Board</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E4E4DF' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Instrument</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Price</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>YTD</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>52W H/L</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Bias</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {commData.map((row, i) => (
                  <tr key={row.symbol} style={{ borderBottom: '1px solid #E4E4DF', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9F9F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1C3A5E' }}>{row.symbol}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{row.name}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Mono", monospace', fontWeight: 600 }}>{row.price}</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Mono", monospace', color: row.ytd.startsWith('+') ? '#22C55E' : '#DC2626' }}>{row.ytd}</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Mono", monospace', fontSize: '12px' }}>
                      <span style={{ color: '#22C55E' }}>{row.high52}</span> / <span style={{ color: '#DC2626' }}>{row.low52}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '12px', color: '#6B7280' }}>{row.bias}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <TradeButton instrument={instFor(row.symbol)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* COMMODITIES OUTLOOK */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ backgroundColor: '#0F172A', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Commodities Outlook</h2>
            </div>
            <div style={{ padding: '16px', fontSize: '14px', lineHeight: '1.6', color: '#1C3A5E' }}>
              <p style={{ margin: '0 0 12px 0' }}>Structural underinvestment in energy and metals extraction continues to provide a long-term floor for industrial commodities, despite immediate macroeconomic headwinds.</p>
              <p style={{ margin: 0 }}>Precious metals are currently supported by unprecedented central bank buying and retail demand in Eastern markets, offsetting higher Western interest rates.</p>
            </div>
          </div>

          {/* PERF COMPARISON */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ backgroundColor: '#0F172A', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Asset Performance YTD</h2>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Equities (US500)</span>
                <span style={{ fontFamily: '"DM Mono", monospace', color: '#22C55E' }}>+15.2%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Gold</span>
                <span style={{ fontFamily: '"DM Mono", monospace', color: '#22C55E' }}>+12.4%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Bitcoin</span>
                <span style={{ fontFamily: '"DM Mono", monospace', color: '#22C55E' }}>+42.8%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Commodities (BCOM)</span>
                <span style={{ fontFamily: '"DM Mono", monospace', color: '#DC2626' }}>-1.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* CRYPTO SECTION */}
        <div>
          <div style={{ backgroundColor: '#0F172A', padding: '8px 12px', marginBottom: '16px', borderRadius: '2px', display: 'inline-block' }}>
            <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Digital Assets</h2>
          </div>
          
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>BTC Dominance (54.2%)</div>
            <div style={{ height: '24px', width: '100%', backgroundColor: '#E4E4DF', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: '54.2%', backgroundColor: '#F7931A', height: '100%' }}></div>
              <div style={{ width: '17.8%', backgroundColor: '#627EEA', height: '100%' }}></div>
              <div style={{ width: '28%', backgroundColor: '#1C3A5E', height: '100%' }}></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {cryptoData.map(c => (
              <div key={c.symbol} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1C3A5E' }}>{c.symbol}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{c.name}</div>
                  </div>
                  <TradeButton instrument={instFor(c.symbol)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#6B7280' }}>Dominance</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600 }}>{c.dom}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#6B7280' }}>24h Vol</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600 }}>{c.vol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#6B7280' }}>Fear/Greed</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 600, color: parseInt(c.fg) > 50 ? '#22C55E' : '#DC2626' }}>{c.fg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CORRELATION MATRIX */}
        <div>
          <div style={{ backgroundColor: '#0F172A', padding: '8px 12px', marginBottom: '16px', borderRadius: '2px', display: 'inline-block' }}>
            <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#C8F135', letterSpacing: '1px', textTransform: 'uppercase' }}>Cross-Asset Correlation Matrix</h2>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', color: '#6B7280', fontSize: '12px' }}></th>
                  <th style={{ padding: '12px', color: '#6B7280', fontSize: '12px', fontWeight: 600 }}>SPX</th>
                  <th style={{ padding: '12px', color: '#6B7280', fontSize: '12px', fontWeight: 600 }}>USD</th>
                  <th style={{ padding: '12px', color: '#6B7280', fontSize: '12px', fontWeight: 600 }}>GOLD</th>
                  <th style={{ padding: '12px', color: '#6B7280', fontSize: '12px', fontWeight: 600 }}>BTC</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E4E4DF' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1C3A5E', textAlign: 'left' }}>GOLD</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>+0.12</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#ffebee', color: '#c62828' }}>-0.65</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', color: '#6B7280' }}>1.00</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>+0.28</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E4E4DF' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1C3A5E', textAlign: 'left' }}>WTI</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>+0.45</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#ffebee', color: '#c62828' }}>-0.32</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#ffebee', color: '#c62828' }}>-0.15</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>+0.18</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1C3A5E', textAlign: 'left' }}>BTC</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>+0.72</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#ffebee', color: '#c62828' }}>-0.58</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>+0.28</td>
                  <td style={{ padding: '12px', fontFamily: '"DM Mono", monospace', color: '#6B7280' }}>1.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
