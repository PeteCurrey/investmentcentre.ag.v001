'use client';

import React, { useState, useEffect } from 'react';

interface AutoListButtonProps {
  symbol: string;
  size?: 'sm' | 'md';
}

const STORAGE_KEY = 'meridian_auto_trading_list';
const DEFAULT_LIST = ['GBP/USD', 'EUR/USD', 'XAU/USD'];

export function getStoredAutoList(): string[] {
  if (typeof window === 'undefined') return DEFAULT_LIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LIST;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_LIST;
  } catch {
    return DEFAULT_LIST;
  }
}

export function setStoredAutoList(list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('meridian_autolist_changed', { detail: list }));
    // Sync with backend autotrader engine
    fetch('/api/autotrader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedInstruments: list })
    }).catch(() => {});
  } catch {}
}

export default function AutoListButton({ symbol, size = 'sm' }: AutoListButtonProps) {
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateState = () => {
      const list = getStoredAutoList();
      setInList(list.includes(symbol));
    };

    updateState();

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setInList(detail.includes(symbol));
      } else {
        updateState();
      }
    };

    window.addEventListener('meridian_autolist_changed', handleCustomEvent);
    window.addEventListener('storage', updateState);
    return () => {
      window.removeEventListener('meridian_autolist_changed', handleCustomEvent);
      window.removeEventListener('storage', updateState);
    };
  }, [symbol]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const currentList = getStoredAutoList();
    let nextList: string[];
    if (currentList.includes(symbol)) {
      nextList = currentList.filter(s => s !== symbol);
    } else {
      nextList = [...currentList, symbol];
    }

    setStoredAutoList(nextList);
    setInList(nextList.includes(symbol));
    setLoading(false);
  };

  const isSmall = size === 'sm';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={inList ? `Remove ${symbol} from Auto-Trading List` : `Add ${symbol} to Auto-Trading List`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSmall ? '2px 7px' : '4px 10px',
        fontSize: isSmall ? '9px' : '11px',
        fontWeight: 700,
        cursor: 'pointer',
        border: `1px solid ${inList ? '#1E293B' : '#CBD5E1'}`,
        backgroundColor: inList ? '#0F172A' : '#F8FAFC',
        color: inList ? '#C8F135' : '#475569',
        borderRadius: '3px',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        letterSpacing: '0.3px',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!inList) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E2E8F0';
          (e.currentTarget as HTMLButtonElement).style.color = '#0F172A';
        }
      }}
      onMouseLeave={e => {
        if (!inList) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F8FAFC';
          (e.currentTarget as HTMLButtonElement).style.color = '#475569';
        }
      }}
    >
      {inList ? '✓ IN AUTO LIST' : '+ AUTO LIST'}
    </button>
  );
}
