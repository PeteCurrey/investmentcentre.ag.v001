'use client';

import React from 'react';
import TradeButton from '../../../components/TradeButton';
import AutoListButton from '../../../components/AutoListButton';
import { INSTRUMENT_UNIVERSE } from '../../../lib/instruments';

// Helper: get instrument object for TradeButton, fallback to symbol-based stub
function instFor(sym: string) {
  return INSTRUMENT_UNIVERSE.find(i => i.symbol === sym || i.oandaId === sym.replace('/', '_'))
    ?? { symbol: sym, oandaId: sym.replace('/', '_') };
}

const EVENTS = [
  { date: 'Aug 12, 2026', name: 'US CPI Release', impact: 'HIGH', outcome: 'Est: +2.1% YoY', instruments: ['EURUSD', 'SPX', 'XAUUSD'] },
  { date: 'Aug 14, 2026', name: 'UK CPI Release', impact: 'HIGH', outcome: 'Est: +2.5% YoY', instruments: ['GBPUSD', 'UK100'] },
  { date: 'Aug 20, 2026', name: 'China PMI', impact: 'MED', outcome: 'Est: 49.8', instruments: ['AUDUSD', 'BRENT'] },
  { date: 'Aug 26, 2026', name: 'Nvidia (NVDA) Earnings', impact: 'HIGH', outcome: 'Est: EPS $2.14', instruments: ['NVDA', 'NDX'] },
  { date: 'Sep 02, 2026', name: 'NFP (Non-Farm Payrolls)', impact: 'HIGH', outcome: 'Est: +180k', instruments: ['EURUSD', 'SPX', 'DXY'] },
  { date: 'Sep 09, 2026', name: 'ECB Rate Decision', impact: 'HIGH', outcome: 'Est: Hold at 3.25%', instruments: ['EURUSD', 'DAX'] },
  { date: 'Sep 16, 2026', name: 'FOMC Meeting', impact: 'HIGH', outcome: 'Est: -25bps Cut', instruments: ['SPX', 'XAUUSD', 'US10Y'] },
  { date: 'Sep 17, 2026', name: 'BOE MPC', impact: 'MED', outcome: 'Est: Hold at 4.75%', instruments: ['GBPUSD'] },
  { date: 'Sep 23, 2026', name: 'BOJ Policy', impact: 'HIGH', outcome: 'Est: +10bps Hike', instruments: ['USDJPY', 'NIKKEI'] },
];

const THEMES = [
  {
    title: 'USD: Path of Rates Divergence',
    analysis: [
      'The US Dollar faces headwinds as the Federal Reserve appears poised for a rate cutting cycle beginning in September, diverging from the ECB and BOE which are signaling extended holds.',
      'Historically, the early phase of Fed easing, when isolated, exerts downward pressure on the DXY, offering a tailwind to major pairs.'
    ],
    instruments: ['EURUSD', 'GBPUSD', 'DXY']
  },
  {
    title: 'Gold: Safe Haven Demand',
    analysis: [
      'Precious metals continue to catch bids amid simmering geopolitical tensions and the prospect of structurally lower real yields.',
      'Central bank accumulation remains robust, establishing a firm floor beneath prices during corrective phases.'
    ],
    instruments: ['XAUUSD', 'XAGUSD']
  },
  {
    title: 'Equities: Earnings Season Resilience',
    analysis: [
      'Despite elevated valuations, the Q3 earnings season is demonstrating margin resilience, particularly in the tech sector where AI monetization is accelerating.',
      'However, breadth remains narrow, suggesting stock picking is paramount over broad index exposure.'
    ],
    instruments: ['SPX', 'NDX', 'NVDA']
  },
  {
    title: 'Energy: Supply Constraints',
    analysis: [
      'Crude oil fundamentals are tightening. OPEC+ adherence to output curbs, coupled with falling US inventories, provides a supportive backdrop.',
      'Demand concerns from China are partially offsetting supply deficits, keeping prices range-bound in the near term.'
    ],
    instruments: ['WTI', 'BRENT']
  }
];

const SEASONAL = [
  { instrument: 'SPX', performance: '-1.2%', winRate: '45%', note: 'Historically weak September effect' },
  { instrument: 'XAUUSD', performance: '+2.4%', winRate: '68%', note: 'Safe haven accumulation into Q4' },
  { instrument: 'DXY', performance: '+0.8%', winRate: '62%', note: 'End of quarter repatriation flows' },
  { instrument: 'EURUSD', performance: '-0.9%', winRate: '40%', note: 'Often suffers against Q3 USD strength' },
  { instrument: 'WTI', performance: '-3.1%', winRate: '35%', note: 'End of summer driving season' },
];

export default function HorizonPage() {
  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', color: '#0F172A', fontFamily: 'Inter, sans-serif', paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0F172A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#C8F135', margin: 0, fontSize: '18px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
          ◆ THE HORIZON — MACRO & THEMATIC OUTLOOK
        </h1>
      </div>

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          
          {/* Left Column: Events & Seasonality */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1C3A5E', borderBottom: '2px solid #E4E4DF', paddingBottom: '12px', marginBottom: '24px' }}>
              UPCOMING MACRO EVENTS (AUG - SEP 2026)
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
              {EVENTS.map((evt, i) => (
                <div key={i} style={{ display: 'flex', border: '1px solid #E4E4DF', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#F7F7F5', padding: '16px', width: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid #E4E4DF' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Date</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{evt.date}</div>
                  </div>
                  <div style={{ padding: '16px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{evt.name}</h3>
                        <span style={{ 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          fontWeight: 700,
                          backgroundColor: evt.impact === 'HIGH' ? '#DC262620' : '#F59E0B20',
                          color: evt.impact === 'HIGH' ? '#DC2626' : '#D97706'
                        }}>
                          {evt.impact} IMPACT
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'DM Mono, monospace' }}>
                        {evt.outcome}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {evt.instruments.map(sym => (
                        <div key={sym} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <TradeButton instrument={instFor(sym)} />
                          <AutoListButton symbol={sym} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1C3A5E', borderBottom: '2px solid #E4E4DF', paddingBottom: '12px', marginBottom: '24px' }}>
              SEASONAL PATTERNS (AUG - SEP)
            </h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E4E4DF', borderRadius: '6px' }}>
              <thead style={{ backgroundColor: '#F7F7F5' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', borderBottom: '1px solid #E4E4DF' }}>INSTRUMENT</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', borderBottom: '1px solid #E4E4DF' }}>HISTORICAL PERF</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', borderBottom: '1px solid #E4E4DF' }}>WIN RATE</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', borderBottom: '1px solid #E4E4DF' }}>DRIVER</th>
                </tr>
              </thead>
              <tbody>
                {SEASONAL.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #E4E4DF' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{s.instrument}</td>
                    <td style={{ padding: '12px', fontFamily: 'DM Mono, monospace', color: s.performance.startsWith('+') ? '#22C55E' : '#DC2626' }}>{s.performance}</td>
                    <td style={{ padding: '12px', fontFamily: 'DM Mono, monospace' }}>{s.winRate}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#6B7280' }}>{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: Themes */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1C3A5E', borderBottom: '2px solid #E4E4DF', paddingBottom: '12px', marginBottom: '24px' }}>
              THEMATIC OUTLOOK
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {THEMES.map((theme, i) => (
                <div key={i} style={{ border: '1px solid #E4E4DF', borderRadius: '6px', padding: '20px', backgroundColor: '#FAFAFA' }}>
                  <h3 style={{ marginTop: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
                    {theme.title}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {theme.analysis.map((para, j) => (
                      <p key={j} style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#4B5563' }}>
                        {para}
                      </p>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #E4E4DF', paddingTop: '16px', alignItems: 'center' }}>
                    {theme.instruments.map(sym => (
                      <div key={sym} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <TradeButton instrument={instFor(sym)} />
                        <AutoListButton symbol={sym} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
