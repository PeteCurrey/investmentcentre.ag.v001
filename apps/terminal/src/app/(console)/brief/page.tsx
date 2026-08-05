'use client';

import React from 'react';
import TradeButton from '../../../components/TradeButton';
import { INSTRUMENT_UNIVERSE } from '../../../lib/instruments';

export default function BriefPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();

  const kpis = [
    { label: 'MARKET SENTIMENT', value: 'RISK-ON', color: '#22C55E' },
    { label: 'USD INDEX (DXY)', value: '103.45', trend: 'DOWN 0.2%' },
    { label: 'VIX LEVEL', value: '14.20', trend: 'DOWN 0.5' },
    { label: '10Y UST YIELD', value: '4.15%', trend: 'UP 2BPS' }
  ];

  const briefs = [
    {
      category: 'MACRO',
      title: 'Fed Rate Path Uncertainty Persists',
      content: 'Recent inflation data has printed hotter than expected, causing markets to push back expectations for the first rate cut. While the labor market shows some signs of cooling, wage growth remains sticky. We anticipate Powell will maintain a hawkish bias at the upcoming press conference, prioritizing inflation control over growth concerns.',
      relevance: 'HIGH',
      implication: 'Expect elevated volatility in front-end rates and USD strength against low-yielders.',
      instruments: ['EUR/USD', 'USD/JPY']
    },
    {
      category: 'FX',
      title: 'GBP Strength Driven by UK CPI Upside',
      content: 'UK core CPI surprised to the upside, solidifying the view that the Bank of England will lag the ECB and Fed in cutting rates. Services inflation, a key metric for the BoE, remains stubbornly high. This divergence in monetary policy paths provides a strong tailwind for the pound in the near term.',
      relevance: 'HIGH',
      implication: 'Long GBP vs EUR and commodity currencies favored.',
      instruments: ['GBP/USD', 'EUR/GBP']
    },
    {
      category: 'COMMODITY',
      title: 'Oil Supply Constraints Tighten Market',
      content: 'OPEC+ output cuts combined with geopolitical tensions in the Middle East are tightening physical oil markets. Refined product inventories are drawing down faster than seasonal norms. Despite demand concerns in Asia, the supply-side narrative continues to dominate price action.',
      relevance: 'MED',
      implication: 'Upside pressure on Brent; energy sector equities to outperform broader market.',
      instruments: ['XTI/USD']
    },
    {
      category: 'EQUITY',
      title: 'NVDA Earnings Beat Sustains AI Momentum',
      content: 'Nvidia delivered another blowout quarter, crushing consensus estimates on both top and bottom lines. Forward guidance suggests AI infrastructure build-out is accelerating rather than plateauing. This result alleviates concerns of an AI bubble and provides fundamental support for mega-cap tech valuations.',
      relevance: 'HIGH',
      implication: 'Tech leadership intact; look for broader participation across the semiconductor supply chain.',
      instruments: ['US100', 'US500']
    },
    {
      category: 'FX',
      title: 'JPY Weakness Prompts Intervention Watch',
      content: 'The yen has broken through key psychological levels against the dollar, driven by the widening yield differential. While the BoJ has exited NIRP, their commitment to accommodative financial conditions limits JPY upside. However, verbal interventions from the MoF are escalating, raising the risk of coordinated action.',
      relevance: 'HIGH',
      implication: 'Short JPY trades carry high intervention risk; consider options for asymmetric payoff.',
      instruments: ['USD/JPY', 'EUR/JPY']
    },
    {
      category: 'MACRO',
      title: 'Gold Catching Safe Haven Bids',
      content: 'Gold continues to base build near all-time highs despite real yields remaining elevated. Central bank purchases, particularly from emerging markets diversifying away from USD reserves, provide a strong structural floor. Tactical safe-haven flows related to geopolitical uncertainty add to the bullish setup.',
      relevance: 'MED',
      implication: 'Buy on dips strategy favored; acts as an effective portfolio hedge.',
      instruments: ['XAU/USD']
    }
  ];

  return (
    <div style={{ backgroundColor: '#F7F7F5', minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '32px' }}>
      <header style={{ borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>MERIDIAN DAILY BRIEF</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginTop: '8px', letterSpacing: '1px' }}>{today}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ backgroundColor: '#FFFFFF', padding: '16px', border: '1px solid #E4E4DF', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '24px', fontWeight: 700, color: kpi.color || '#0F172A' }}>{kpi.value}</div>
            {kpi.trend && <div style={{ fontSize: '12px', color: kpi.trend.includes('UP') ? '#22C55E' : '#DC2626', fontWeight: 600, marginTop: '4px' }}>{kpi.trend}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {briefs.map((brief, i) => (
          <div key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '4px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ backgroundColor: '#0F172A', padding: '12px 16px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#C8F135', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }}>{brief.category}</span>
              <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 600, backgroundColor: brief.relevance === 'HIGH' ? '#DC2626' : '#F59E0B', padding: '2px 8px', borderRadius: '12px' }}>{brief.relevance} RELEVANCE</span>
            </div>
            
            <div style={{ padding: '20px', flexGrow: 1 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', marginBottom: '12px', lineHeight: 1.3 }}>{brief.title}</h2>
              <p style={{ fontSize: '14px', color: '#333333', lineHeight: 1.6, marginBottom: '20px' }}>{brief.content}</p>
              
              <div style={{ backgroundColor: '#F0F4F8', padding: '12px', borderRadius: '4px', borderLeft: '4px solid #1C3A5E', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1C3A5E', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>IMPLICATION</span>
                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{brief.implication}</span>
              </div>
              
              <div style={{ borderTop: '1px solid #E4E4DF', paddingTop: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '8px' }}>LINKED INSTRUMENTS</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {brief.instruments.map(symbol => {
                    const inst = INSTRUMENT_UNIVERSE.find(i => i.symbol === symbol);
                    return inst ? <TradeButton key={symbol} instrument={inst} /> : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
