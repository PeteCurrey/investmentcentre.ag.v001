'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  INSTRUMENT_UNIVERSE,
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  ALL_ASSET_CLASSES,
  AssetClass,
  Instrument
} from '../../../lib/instruments';
import TradeButton from '../../../components/TradeButton';

type PriceData = {
  price: string;
  change: string;
};

// Generate realistic dummy prices for instruments not in the API
function generateMockPrice(instrument: Instrument): PriceData {
  let baseValue = 0;
  if (instrument.assetClass.startsWith('FX')) baseValue = 1.2;
  else if (instrument.assetClass === 'INDEX') baseValue = 5000;
  else if (instrument.assetClass === 'COMMODITY') baseValue = 100;
  else if (instrument.assetClass === 'CRYPTO') baseValue = 40000;
  else baseValue = 150;

  const r1 = Math.random();
  const price = (baseValue + (r1 * baseValue * 0.1)).toFixed(instrument.digits);
  
  const r2 = (Math.random() - 0.5) * 5; // -2.5% to +2.5%
  const sign = r2 >= 0 ? '+' : '';
  const change = `${sign}${r2.toFixed(2)}%`;

  return { price, change };
}

const TOP_MOVERS = [
  { symbol: 'TSLA', description: 'Tesla Inc.', change: '+5.42%', price: '214.50' },
  { symbol: 'NVDA', description: 'NVIDIA Corp.', change: '+4.15%', price: '128.40' },
  { symbol: 'BTC/USD', description: 'Bitcoin / US Dollar', change: '+3.85%', price: '65210.00' },
  { symbol: 'NAT GAS', description: 'Natural Gas', change: '-4.20%', price: '2.140' },
  { symbol: 'GBP/JPY', description: 'British Pound / Japanese Yen', change: '-2.15%', price: '198.42' }
];

export default function MarketsPage() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<AssetClass | 'ALL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPrices = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/prices');
      if (res.ok) {
        const data = await res.json();
        
        const newPrices: Record<string, PriceData> = {};
        // Use API prices where available, fill in the rest
        INSTRUMENT_UNIVERSE.forEach(inst => {
          let apiSymbol = inst.symbol;
          if (inst.symbol === 'SPX500') apiSymbol = 'SPX 500'; // match API quirk
          
          if (data.prices && data.prices[apiSymbol]) {
            newPrices[inst.symbol] = {
              price: data.prices[apiSymbol].price,
              change: data.prices[apiSymbol].change
            };
          } else {
            // keep existing mock or generate new one
            newPrices[inst.symbol] = prices[inst.symbol] || generateMockPrice(inst);
          }
        });
        setPrices(newPrices);
      }
    } catch (err) {
      console.error('Failed to fetch prices', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Visual feedback
    }
  }, [prices]);

  useEffect(() => {
    // Initial fetch
    if (Object.keys(prices).length === 0) {
      const initialPrices: Record<string, PriceData> = {};
      INSTRUMENT_UNIVERSE.forEach(inst => {
        initialPrices[inst.symbol] = generateMockPrice(inst);
      });
      setPrices(initialPrices);
      fetchPrices();
    }

    // Auto-refresh every 30s
    const interval = setInterval(() => {
      fetchPrices();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchPrices]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredInstruments = useMemo(() => {
    return INSTRUMENT_UNIVERSE.filter(inst => {
      const matchesSearch = inst.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            inst.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClass === 'ALL' || inst.assetClass === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [searchTerm, selectedClass]);

  // Group by asset class if showing ALL
  const groupedInstruments = useMemo(() => {
    if (selectedClass !== 'ALL') return { [selectedClass]: filteredInstruments };
    
    const groups: Partial<Record<AssetClass, Instrument[]>> = {};
    ALL_ASSET_CLASSES.forEach(cls => {
      const insts = filteredInstruments.filter(i => i.assetClass === cls);
      if (insts.length > 0) {
        groups[cls] = insts;
      }
    });
    return groups;
  }, [filteredInstruments, selectedClass]);

  const renderChange = (change: string) => {
    const isPositive = change.startsWith('+');
    const isNegative = change.startsWith('-');
    return (
      <span style={{ color: isPositive ? '#22C55E' : (isNegative ? '#DC2626' : '#6B7280') }}>
        {change}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F7F7F5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#0F172A',
        padding: '12px 24px',
        borderRadius: '6px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ 
            color: '#C8F135', 
            fontSize: '14px', 
            fontWeight: 700, 
            letterSpacing: '1px',
            margin: 0,
            textTransform: 'uppercase'
          }}>
            ◆ LIVE MARKETS — {INSTRUMENT_UNIVERSE.length} INSTRUMENTS · OANDA PRACTICE
          </h1>
        </div>
        <button 
          onClick={fetchPrices}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #1C3A5E',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isRefreshing ? 'REFRESHING...' : 'REFRESH ↻'}
        </button>
      </div>

      {/* Movers Panel */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Top Movers Today
        </h2>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {TOP_MOVERS.map(mover => (
            <div key={mover.symbol} style={{ 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #E4E4DF', 
              borderRadius: '8px', 
              padding: '16px',
              minWidth: '200px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{mover.symbol}</span>
                <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 500, fontSize: '14px' }}>
                  {renderChange(mover.change)}
                </span>
              </div>
              <div style={{ color: '#6B7280', fontSize: '12px', marginBottom: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mover.description}
              </div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>
                {mover.price}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedClass('ALL')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              border: selectedClass === 'ALL' ? 'none' : '1px solid #E4E4DF',
              backgroundColor: selectedClass === 'ALL' ? '#0F172A' : '#FFFFFF',
              color: selectedClass === 'ALL' ? '#FFFFFF' : '#0F172A',
              whiteSpace: 'nowrap'
            }}
          >
            ALL
          </button>
          {ALL_ASSET_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                border: selectedClass === cls ? 'none' : '1px solid #E4E4DF',
                backgroundColor: selectedClass === cls ? '#0F172A' : '#FFFFFF',
                color: selectedClass === cls ? '#FFFFFF' : '#0F172A',
                whiteSpace: 'nowrap'
              }}
            >
              {ASSET_CLASS_LABELS[cls]}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#0F172A', 
            color: '#FFFFFF', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '12px',
            fontWeight: 600 
          }}>
            {filteredInstruments.length} RESULTS
          </div>
          <input 
            type="text" 
            placeholder="Search symbol or description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #E4E4DF',
              fontSize: '14px',
              width: '250px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Instruments Table */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4DF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {Object.entries(groupedInstruments).map(([cls, insts], groupIdx) => {
          if (!insts || insts.length === 0) return null;
          
          return (
            <div key={cls}>
              {selectedClass === 'ALL' && (
                <div style={{ 
                  backgroundColor: '#0F172A', 
                  color: '#C8F135',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  {ASSET_CLASS_LABELS[cls as AssetClass]}
                </div>
              )}
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                {groupIdx === 0 && selectedClass !== 'ALL' && (
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E4E4DF', backgroundColor: '#F7F7F5' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>ASSET CLASS</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>SYMBOL</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>DESCRIPTION</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textAlign: 'right' }}>PRICE</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textAlign: 'right' }}>CHANGE</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  {insts.map((inst, idx) => {
                    const priceData = prices[inst.symbol] || { price: '...', change: '...' };
                    const colors = ASSET_CLASS_COLORS[inst.assetClass];
                    
                    return (
                      <tr key={inst.symbol} style={{ borderBottom: '1px solid #E4E4DF', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '16px', width: '15%' }}>
                          <span style={{ 
                            backgroundColor: colors.bg, 
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {ASSET_CLASS_LABELS[inst.assetClass]}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 600, color: '#0F172A', width: '15%' }}>
                          {inst.symbol}
                        </td>
                        <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px', width: '25%' }}>
                          {inst.description}
                        </td>
                        <td style={{ padding: '16px', fontFamily: '"DM Mono", monospace', fontWeight: 600, textAlign: 'right', fontSize: '15px', color: '#0F172A', width: '15%' }}>
                          {priceData.price}
                        </td>
                        <td style={{ padding: '16px', fontFamily: '"DM Mono", monospace', fontWeight: 500, textAlign: 'right', fontSize: '14px', width: '10%' }}>
                          {renderChange(priceData.change)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', width: '20%' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <TradeButton 
                              instrument={inst}
                              direction="SELL"
                            />
                            <TradeButton 
                              instrument={inst}
                              direction="BUY"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        {filteredInstruments.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            No instruments found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
