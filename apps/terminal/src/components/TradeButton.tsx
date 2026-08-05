'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Instrument } from '../lib/instruments';

interface TradeButtonProps {
  instrument: Instrument | { symbol: string; oandaId: string };
  direction?: 'BUY' | 'SELL';
  size?: 'sm' | 'md';
  units?: string;
}

export default function TradeButton({
  instrument,
  direction = 'BUY',
  size = 'sm',
  units,
}: TradeButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams({
      instrument: instrument.oandaId,
      direction,
      ...(units ? { units } : {}),
    });
    router.push(`/trade?${params.toString()}`);
  };

  const isBuy = direction === 'BUY';
  const isSmall = size === 'sm';

  return (
    <button
      onClick={handleClick}
      title={`Trade ${instrument.symbol} ${direction} on MERIDIAN`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSmall ? '2px 8px' : '5px 12px',
        fontSize: isSmall ? '10px' : '12px',
        fontWeight: 700,
        cursor: 'pointer',
        border: `1px solid ${isBuy ? '#86EFAC' : '#FCA5A5'}`,
        backgroundColor: isBuy ? '#F0FDF4' : '#FFF5F5',
        color: isBuy ? '#166534' : '#991B1B',
        borderRadius: '3px',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        letterSpacing: '0.3px',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = isBuy ? '#DCFCE7' : '#FEE2E2';
        (e.currentTarget as HTMLButtonElement).style.borderColor = isBuy ? '#4ADE80' : '#F87171';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = isBuy ? '#F0FDF4' : '#FFF5F5';
        (e.currentTarget as HTMLButtonElement).style.borderColor = isBuy ? '#86EFAC' : '#FCA5A5';
      }}
    >
      {isBuy ? '▲' : '▼'} {isSmall ? instrument.symbol : `${direction} ${instrument.symbol}`}
    </button>
  );
}

// Convenience variants
export function BuyButton({ instrument, size }: { instrument: Instrument | { symbol: string; oandaId: string }; size?: 'sm' | 'md' }) {
  return <TradeButton instrument={instrument} direction="BUY" size={size} />;
}

export function SellButton({ instrument, size }: { instrument: Instrument | { symbol: string; oandaId: string }; size?: 'sm' | 'md' }) {
  return <TradeButton instrument={instrument} direction="SELL" size={size} />;
}
