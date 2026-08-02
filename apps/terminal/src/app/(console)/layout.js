"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConsoleLayout;
const react_1 = __importDefault(require("react"));
const navigation_1 = require("next/navigation");
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
function ConsoleLayout({ children, }) {
    const pathname = (0, navigation_1.usePathname)();
    return (<div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
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
          {process.env.NEXT_PUBLIC_TIER_4_ENABLED !== 'false' ? (<span style={{ color: '#C8F135', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#C8F135', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #C8F135' }}></span>
              SYSTEM ACTIVE [EXECUTE MODE]
            </span>) : (<span style={{ color: '#9CA3AF', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: '#9CA3AF', display: 'inline-block' }}></span>
              SYSTEM ACTIVE [OBSERVE MODE]
            </span>)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>COUNCIL: 3 MODELS ONLINE</span>
          <span>STALENESS: OK</span>
          <a href="/landing" style={{ color: '#E4E4DF', textDecoration: 'none', fontSize: '11px' }}>PRODUCT OVERVIEW</a>
          <a href="/architecture" style={{ color: '#E4E4DF', textDecoration: 'none', fontSize: '11px' }}>SPECIFICATION</a>

          {/* Mandatory Kill Switch Control */}
          <button id="kill-switch-btn" style={{
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: '1px solid #991B1B',
            padding: '4px 12px',
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '0.5px',
            cursor: 'pointer'
        }} onClick={() => { console.log('MERIDIAN HALT TRIGGERED. All order routing suspended.'); }}>
            HALT / KILL SWITCH
          </button>
        </div>
      </header>

      {/* Multi-Asset Ticker Tape Subheader */}
      <div style={{
            height: '28px',
            backgroundColor: '#0F172A',
            borderBottom: '1px solid #1E293B',
            color: '#94A3B8',
            fontFamily: '"DM Mono", monospace',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '24px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
        }}>
        <span style={{ color: '#C8F135', letterSpacing: '1px' }}>LIVE TICKS //</span>
        <span>GBP/USD <strong style={{ color: '#4ADE80', fontWeight: 500 }}>1.3145 (+0.42%)</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>WTI CRUDE <strong style={{ color: '#4ADE80', fontWeight: 500 }}>$78.40 (+1.85%)</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>SPX INDEX <strong style={{ color: '#4ADE80', fontWeight: 500 }}>5,520.40 (+0.28%)</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>EUR/USD <strong style={{ color: '#F87171', fontWeight: 500 }}>1.0920 (-0.15%)</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>US 10Y TREASURY <strong style={{ color: '#F87171', fontWeight: 500 }}>4.18% (-2bps)</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>FED FUNDS EFFECTIVE <strong style={{ color: '#CBD5E1', fontWeight: 500 }}>5.33%</strong></span>
      </div>

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
            <div style={{ padding: '4px 16px 6px 16px', fontSize: '10px', color: '#6B7280', fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>
              DOCUMENTATION & SPEC
            </div>
            <a href="/" style={{
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#1C3A5E',
            backgroundColor: pathname === '/' || pathname === '/landing' ? '#FFFFFF' : 'transparent',
            display: 'block',
            textDecoration: 'none'
        }}>
              Product Overview →
            </a>
            <a href="/architecture" style={{
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#6B7280',
            backgroundColor: pathname === '/architecture' ? '#FFFFFF' : 'transparent',
            display: 'block',
            textDecoration: 'none',
            marginBottom: '8px'
        }}>
              System Specification
            </a>

            <div style={{ padding: '4px 16px 6px 16px', fontSize: '10px', color: '#6B7280', fontWeight: 700, fontFamily: '"DM Mono", monospace', borderTop: '1px solid #E4E4DF', paddingTop: '10px' }}>
              CORE SURFACES
            </div>
            {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (<a key={item.href} href={item.href} style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    color: item.href === '/health' ? '#1C3A5E' : '#14181B',
                    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                    borderLeft: isActive ? '3px solid #1C3A5E' : '3px solid transparent',
                    display: 'block'
                }}>
                  {item.label}
                </a>);
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
    </div>);
}
//# sourceMappingURL=layout.js.map