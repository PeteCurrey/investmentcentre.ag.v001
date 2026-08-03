'use client';

import React from 'react';
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
        <span style={{ color: '#1E3A5F', fontWeight: 700, letterSpacing: '1px' }}>LIVE TICKS //</span>
        <span>GBP/USD <strong style={{ color: '#15803D', fontWeight: 600 }}>1.3145 (+0.42%)</strong></span>
        <span style={{ color: '#CBD5E1' }}>|</span>
        <span>WTI CRUDE <strong style={{ color: '#15803D', fontWeight: 600 }}>$78.40 (+1.85%)</strong></span>
        <span style={{ color: '#CBD5E1' }}>|</span>
        <span>SPX INDEX <strong style={{ color: '#15803D', fontWeight: 600 }}>5,520.40 (+0.28%)</strong></span>
        <span style={{ color: '#CBD5E1' }}>|</span>
        <span>EUR/USD <strong style={{ color: '#B91C1C', fontWeight: 600 }}>1.0920 (-0.15%)</strong></span>
        <span style={{ color: '#CBD5E1' }}>|</span>
        <span>US 10Y TREASURY <strong style={{ color: '#B91C1C', fontWeight: 600 }}>4.18% (-2bps)</strong></span>
        <span style={{ color: '#CBD5E1' }}>|</span>
        <span>FED FUNDS EFFECTIVE <strong style={{ color: '#0F172A', fontWeight: 600 }}>5.33%</strong></span>
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
