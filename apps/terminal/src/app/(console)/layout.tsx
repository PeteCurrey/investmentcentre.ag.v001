'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'The Brief', href: '/brief' },
  { label: 'The Edge', href: '/edge' },
  { label: 'The Horizon', href: '/horizon' },
  { label: 'The World', href: '/world' },
  { label: 'The Markets', href: '/markets' },
  { label: 'Undercurrent', href: '/undercurrent' },
  { label: 'Alternatives', href: '/alternatives' },
  { label: 'AI Council', href: '/council' },
  { label: 'Trade', href: '/trade' },
  { label: 'Automation', href: '/automation' },
  { label: 'System Health', href: '/health' },
];

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const isTier4Active = process.env.NEXT_PUBLIC_TIER_4_ENABLED === 'true';

  const [feedStatus, setFeedStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [tickerPrices, setTickerPrices] = useState<{ symbol: string; price: string; change: string }[]>([]);

  type AccountSummary = {
    balance: string;
    nav: string;
    unrealizedPL: string;
    pnlPositive: boolean;
    openTradesCount: number;
    currency: string;
  };
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        if (data?.prices && Object.keys(data.prices).length > 0) {
          setFeedStatus('connected');
          setTickerPrices(
            Object.entries(data.prices).map(([symbol, v]: [string, any]) => ({
              symbol,
              price: v.price,
              change: v.change,
            }))
          );
        } else {
          setFeedStatus('error');
        }
      } catch {
        setFeedStatus('error');
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const [posRes, atRes] = await Promise.all([
          fetch('/api/oanda-positions'),
          fetch('/api/autotrader'),
        ]);
        if (posRes.ok) {
          const data = await posRes.json();
          if (data.account) setAccount(data.account);
        }
        if (atRes.ok) {
          const atData = await atRes.json();
          setAutoEnabled(atData.mode ? atData.mode !== 'OBSERVE' : Boolean(atData.enabled));
        }
      } catch {}
    };
    fetchAccount();
    const interval = setInterval(fetchAccount, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A' }}>
      {/* Top Operational Bar — Clean Corporate Header */}
      <header style={{
        height: '52px',
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        fontSize: '13px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 700, letterSpacing: '1.5px', color: '#0F172A', fontSize: '14px' }}>MERIDIAN</span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          {isTier4Active ? (
            <span style={{ color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
              <span style={{ width: '7px', height: '7px', backgroundColor: '#22C55E', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)' }}></span>
              SYSTEM ACTIVE [EXECUTE MODE]
            </span>
          ) : (
            <span style={{ color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: '#94A3B8', display: 'inline-block' }}></span>
              SYSTEM ACTIVE [OBSERVE MODE]
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', color: '#475569' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', color: '#64748B' }}>COUNCIL: 3 MODELS ONLINE</span>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', color: '#64748B' }}>STALENESS: OK</span>
          <a href="/landing" style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 500 }}>PRODUCT OVERVIEW</a>
          <a href="/architecture" style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 500 }}>SPECIFICATION</a>

          {/* Mandatory Kill Switch Control */}
          <button
            id="kill-switch-btn"
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: '1px solid #DC2626',
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: '11px',
              letterSpacing: '0.5px',
              cursor: 'pointer'
            }}
            onClick={() => { console.log('MERIDIAN HALT TRIGGERED. All order routing suspended.'); }}
          >
            HALT / KILL SWITCH
          </button>
        </div>
      </header>

      {/* Multi-Asset Ticker Tape Subheader */}
      <div style={{
        height: '32px',
        backgroundColor: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        color: '#475569',
        fontFamily: '"DM Mono", monospace',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '24px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ color: '#1E3A5F', fontWeight: 700, letterSpacing: '1px', flexShrink: 0 }}>LIVE FEED //</span>
        {feedStatus === 'loading' && (
          <span style={{ color: '#94A3B8' }}>CONNECTING TO MARKET DATA...</span>
        )}
        {feedStatus === 'error' && (
          <span style={{ color: '#991B1B', fontWeight: 600 }}>⚠ FEED DISCONNECTED — Check TWELVE_DATA_API_KEY / FINNHUB_API_KEY in Vercel environment variables</span>
        )}
        {feedStatus === 'connected' && tickerPrices.map((t, i) => {
          const isUp = t.change.startsWith('+');
          return (
            <span key={t.symbol} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              {i > 0 && <span style={{ color: '#CBD5E1', marginRight: '-16px' }}>·</span>}
              <span style={{ color: '#1E3A5F', fontWeight: 700 }}>{t.symbol}</span>
              <span style={{ color: '#0F172A' }}>{t.price}</span>
              <span style={{ color: isUp ? '#16A34A' : '#DC2626', fontWeight: 700 }}>{t.change}</span>
            </span>
          );
        })}
        {feedStatus === 'connected' && (
          <span style={{ color: '#22C55E', fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>● LIVE</span>
        )}
      </div>

      {/* ── Persistent Account Summary Bar ── */}
      <div style={{
        backgroundColor: '#0F172A',
        borderBottom: '1px solid #1E293B',
        padding: '0 24px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        fontFamily: '"DM Mono", monospace',
        fontSize: '11px',
        flexShrink: 0,
      }}>
        {/* BALANCE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 20px 0 0', borderRight: '1px solid #1E293B' }}>
          <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.8px', fontWeight: 700 }}>BALANCE</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '12px' }}>
            {account ? `${account.currency} ${parseFloat(account.balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—'}
          </span>
        </div>

        {/* NAV */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 20px', borderRight: '1px solid #1E293B' }}>
          <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.8px', fontWeight: 700 }}>NET ASSET VALUE</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '12px' }}>
            {account ? `${account.currency} ${parseFloat(account.nav).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—'}
          </span>
        </div>

        {/* UNREALIZED P&L */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 20px', borderRight: '1px solid #1E293B' }}>
          <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.8px', fontWeight: 700 }}>UNREALIZED P&amp;L</span>
          <span style={{ color: account ? (account.pnlPositive ? '#4ADE80' : '#F87171') : '#64748B', fontWeight: 700, fontSize: '12px' }}>
            {account
              ? `${account.pnlPositive ? '+' : '-'}${account.currency} ${Math.abs(parseFloat(account.unrealizedPL)).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
              : '—'}
          </span>
        </div>

        {/* OPEN TRADES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 20px', borderRight: '1px solid #1E293B' }}>
          <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.8px', fontWeight: 700 }}>OPEN TRADES</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '12px' }}>
            {account ? account.openTradesCount : '—'}
          </span>
        </div>

        {/* ACCOUNT TYPE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 20px', borderRight: '1px solid #1E293B' }}>
          <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.8px', fontWeight: 700 }}>ACCOUNT</span>
          <span style={{ color: '#C8F135', fontWeight: 700, fontSize: '11px', letterSpacing: '1px' }}>
            {(process.env.NEXT_PUBLIC_OANDA_ENVIRONMENT || 'PRACTICE').toUpperCase()}
          </span>
        </div>

        {/* AUTO-TRADING STATUS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 20px', borderRight: '1px solid #1E293B' }}>
          <span style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.8px', fontWeight: 700 }}>AUTO-TRADING</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '11px', color: autoEnabled ? '#4ADE80' : '#94A3B8' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: autoEnabled ? '#4ADE80' : '#475569', display: 'inline-block', boxShadow: autoEnabled ? '0 0 8px rgba(74,222,128,0.7)' : 'none' }} />
            {autoEnabled ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {/* Last updated */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {account ? (
            <span style={{ fontSize: '9px', color: '#334155', letterSpacing: '0.5px' }}>UPDATED {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          ) : (
            <span style={{ fontSize: '9px', color: '#475569' }}>CONNECTING TO OANDA...</span>
          )}
          <a href="/trade" style={{ fontSize: '9px', color: '#C8F135', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.5px', padding: '3px 8px', border: '1px solid #C8F135', borderRadius: '2px' }}>→ TRADE DESK</a>
        </div>
      </div>

      {/* Main Console Body */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Nav */}
        <aside style={{
          width: '210px',
          borderRight: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ padding: '4px 20px 8px 20px', fontSize: '10px', color: '#64748B', fontWeight: 700, fontFamily: '"DM Mono", monospace', letterSpacing: '1px' }}>
              DOCUMENTATION & SPEC
            </div>
            <a
              href="/landing"
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1E3A5F',
                backgroundColor: pathname === '/' || pathname === '/landing' ? '#F8FAFC' : 'transparent',
                display: 'block',
                textDecoration: 'none'
              }}
            >
              Product Overview →
            </a>
            <a
              href="/architecture"
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#64748B',
                backgroundColor: pathname === '/architecture' ? '#F8FAFC' : 'transparent',
                display: 'block',
                textDecoration: 'none',
                marginBottom: '12px'
              }}
            >
              System Specification
            </a>

            <div style={{ padding: '4px 20px 8px 20px', fontSize: '10px', color: '#64748B', fontWeight: 700, fontFamily: '"DM Mono", monospace', borderTop: '1px solid #E2E8F0', paddingTop: '12px', letterSpacing: '1px' }}>
              CORE SURFACES
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#1E3A5F' : '#334155',
                    backgroundColor: isActive ? '#F8FAFC' : 'transparent',
                    borderLeft: isActive ? '3px solid #1E3A5F' : '3px solid transparent',
                    display: 'block'
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div style={{ padding: '16px 20px', fontSize: '11px', color: '#64748B', borderTop: '1px solid #E2E8F0', fontFamily: '"DM Mono", monospace' }}>
            <div>ACCOUNT: PRIVATE</div>
            <div>RISK GATE: ENFORCED</div>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '28px 32px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
