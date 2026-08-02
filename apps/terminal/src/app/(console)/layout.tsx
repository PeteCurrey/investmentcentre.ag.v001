'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'The Brief', href: '/' },
  { label: 'The Edge', href: '/edge' },
  { label: 'The Horizon', href: '/horizon' },
  { label: 'The World', href: '/world' },
  { label: 'The Markets', href: '/markets' },
  { label: 'Undercurrent', href: '/undercurrent' },
  { label: 'Alternatives', href: '/alternatives' },
  { label: 'AI Council', href: '/council' },
  { label: 'Automation', href: '/automation' },
  { label: 'System Health', href: '/health' },
];

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Top Operational Bar */}
      <header style={{
        height: '44px',
        borderBottom: '1px solid #E4E4DF',
        backgroundColor: '#1C3A5E',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '12px',
        fontFamily: '"DM Mono", monospace'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 700, letterSpacing: '1px' }}>MERIDIAN</span>
          <span style={{ color: '#E4E4DF' }}>|</span>
          <span style={{ color: '#C8F135', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#C8F135', display: 'inline-block' }}></span>
            SYSTEM ACTIVE [OBSERVE MODE]
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>COUNCIL: 3 MODELS ONLINE</span>
          <span>STALENESS: OK</span>

          {/* Mandatory Kill Switch Control */}
          <button
            id="kill-switch-btn"
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: '1px solid #991B1B',
              padding: '4px 12px',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.5px'
            }}
            onClick={() => { console.log('MERIDIAN HALT TRIGGERED. All order routing suspended.'); }}
          >
            HALT / KILL SWITCH
          </button>
        </div>
      </header>

      {/* Main Console Body */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Nav */}
        <aside style={{
          width: '200px',
          borderRight: '1px solid #E4E4DF',
          backgroundColor: '#F7F7F5',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ padding: '4px 16px 8px 16px', fontSize: '10px', color: '#6B7280', fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>
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
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    color: item.href === '/health' ? '#1C3A5E' : '#14181B',
                    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                    borderLeft: isActive ? '3px solid #1C3A5E' : '3px solid transparent',
                    display: 'block'
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div style={{ padding: '16px', fontSize: '11px', color: '#6B7280', borderTop: '1px solid #E4E4DF', fontFamily: '"DM Mono", monospace' }}>
            <div>ACCOUNT: PRIVATE</div>
            <div>RISK GATE: ENFORCED</div>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
