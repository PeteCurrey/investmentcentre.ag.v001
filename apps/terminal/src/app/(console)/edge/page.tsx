'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { INSTRUMENT_UNIVERSE, ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../../lib/instruments';
import TradeButton from '../../../components/TradeButton';
import AutoListButton from '../../../components/AutoListButton';

// Mock signal generator
const generateSignals = () => {
  return INSTRUMENT_UNIVERSE.slice(0, 25).map((instrument, index) => {
    // Generate some deterministic-looking random values based on index
    const seed = index * 13.7;
    const rsi = Math.floor(20 + (Math.sin(seed) + 1) * 30); // 20 to 80
    
    let macd = 'NEUTRAL';
    if (Math.sin(seed * 2) > 0.5) macd = 'BULLISH';
    else if (Math.sin(seed * 2) < -0.5) macd = 'BEARISH';

    let bb = 'MID';
    const bbVal = Math.cos(seed);
    if (bbVal > 0.8) bb = 'ABOVE UPPER';
    else if (bbVal > 0.4) bb = 'NEAR UPPER';
    else if (bbVal < -0.8) bb = 'BELOW LOWER';
    else if (bbVal < -0.4) bb = 'NEAR LOWER';

    let signal = 'NEUTRAL';
    if (rsi < 35 && macd === 'BULLISH') signal = 'STRONG BUY';
    else if (rsi < 45) signal = 'BUY';
    else if (rsi > 65 && macd === 'BEARISH') signal = 'STRONG SELL';
    else if (rsi > 55) signal = 'SELL';

    let conviction = 'MED';
    if (signal === 'STRONG BUY' || signal === 'STRONG SELL') conviction = 'HIGH';
    else if (signal === 'NEUTRAL') conviction = 'LOW';

    return {
      ...instrument,
      rsi,
      macd,
      bb,
      signal,
      conviction
    };
  });
};

export default function EdgePage() {
  const [signals, setSignals] = useState<Array<ReturnType<typeof generateSignals>[number]>>([]);
  const [filter, setFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('Symbol');

  useEffect(() => {
    setSignals(generateSignals());
  }, []);

  const filteredSignals = useMemo(() => {
    let result = signals;
    if (filter !== 'ALL') {
      result = result.filter(s => s.signal === filter);
    }
    
    result.sort((a, b) => {
      if (sortBy === 'Symbol') return a.symbol.localeCompare(b.symbol);
      if (sortBy === 'RSI') return b.rsi - a.rsi;
      if (sortBy === 'Conviction') {
        const order: Record<string, number> = { 'HIGH': 3, 'MED': 2, 'LOW': 1 };
        return (order[b.conviction] ?? 0) - (order[a.conviction] ?? 0);
      }
      if (sortBy === 'Signal') {
        const order: Record<string, number> = { 'STRONG BUY': 5, 'BUY': 4, 'NEUTRAL': 3, 'SELL': 2, 'STRONG SELL': 1 };
        return (order[b.signal] ?? 0) - (order[a.signal] ?? 0);
      }
      return 0;
    });
    
    return result;
  }, [signals, filter, sortBy]);

  const highConvictionCount = signals.filter(s => s.conviction === 'HIGH').length;

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0F172A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#C8F135', margin: 0, fontSize: '18px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
          ◆ THE EDGE — TECHNICAL SIGNAL SCANNER
        </h1>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Summary Bar */}
        <div style={{ display: 'flex', gap: '24px', padding: '16px', backgroundColor: '#F7F7F5', border: '1px solid #E4E4DF', borderRadius: '4px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Signals Today</div>
            <div style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'DM Mono, monospace', color: '#0F172A' }}>{signals.length}</div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#E4E4DF' }}></div>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High Conviction</div>
            <div style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'DM Mono, monospace', color: '#22C55E' }}>{highConvictionCount}</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'STRONG BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG SELL'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: filter === f ? '#1C3A5E' : '#FFFFFF',
                  color: filter === f ? '#FFFFFF' : '#0F172A',
                  border: `1px solid ${filter === f ? '#1C3A5E' : '#E4E4DF'}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>SORT BY:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #E4E4DF',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                outline: 'none'
              }}
            >
              <option value="Symbol">Symbol</option>
              <option value="RSI">RSI</option>
              <option value="MACD">MACD</option>
              <option value="Signal">Signal</option>
              <option value="Conviction">Conviction</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ border: '1px solid #E4E4DF', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#F7F7F5', borderBottom: '1px solid #E4E4DF' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>SYMBOL</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>ASSET CLASS</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>RSI (14)</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>MACD</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>BOLLINGER BAND</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>COMPOSITE SIGNAL</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>CONVICTION</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 500, textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignals.map((signal, idx) => (
                <tr key={signal.symbol} style={{ borderBottom: '1px solid #E4E4DF', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{signal.symbol}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      backgroundColor: ASSET_CLASS_COLORS[signal.assetClass]?.bg ?? '#F3F4F6',
                      color: ASSET_CLASS_COLORS[signal.assetClass]?.text ?? '#6B7280',
                      border: `1px solid ${ASSET_CLASS_COLORS[signal.assetClass]?.border ?? '#E4E4DF'}`,
                    }}>
                      {ASSET_CLASS_LABELS[signal.assetClass]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '24px' }}>{signal.rsi}</span>
                      <div style={{ width: '60px', height: '4px', backgroundColor: '#E4E4DF', borderRadius: '2px', position: 'relative' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: `${signal.rsi}%`, 
                          top: '-3px', 
                          width: '10px', 
                          height: '10px', 
                          backgroundColor: signal.rsi < 30 ? '#22C55E' : signal.rsi > 70 ? '#DC2626' : '#6B7280', 
                          borderRadius: '50%',
                          transform: 'translateX(-50%)'
                        }}></div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: signal.macd === 'BULLISH' ? '#22C55E' : signal.macd === 'BEARISH' ? '#DC2626' : '#6B7280' }}>
                    {signal.macd}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1C3A5E' }}>
                    {signal.bb}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: signal.signal.includes('BUY') ? '#22C55E20' : signal.signal.includes('SELL') ? '#DC262620' : '#F3F4F6',
                      color: signal.signal.includes('BUY') ? '#22C55E' : signal.signal.includes('SELL') ? '#DC2626' : '#6B7280',
                    }}>
                      {signal.signal}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3].map(level => {
                        const isActive = (signal.conviction === 'HIGH' && level <= 3) || 
                                         (signal.conviction === 'MED' && level <= 2) || 
                                         (signal.conviction === 'LOW' && level <= 1);
                        return (
                          <div key={level} style={{ 
                            width: '8px', 
                            height: '12px', 
                            backgroundColor: isActive ? '#1C3A5E' : '#E4E4DF',
                            borderRadius: '1px'
                          }}></div>
                        )
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <AutoListButton symbol={signal.symbol} />
                      <TradeButton instrument={{ symbol: signal.symbol, oandaId: signal.oandaId }} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSignals.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
                    No signals found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
