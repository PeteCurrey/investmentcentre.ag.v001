"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PublicLandingPage;
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
function PublicLandingPage() {
    return (<div style={{
            backgroundColor: '#0A0D12',
            color: '#E2E8F0',
            minHeight: '100vh',
            fontFamily: '"DM Mono", monospace',
            fontSize: '12px',
            lineHeight: '1.6'
        }}>
      {/* Top Header Navigation */}
      <header style={{
            borderBottom: '1px solid #1E293B',
            padding: '0 32px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0F172A'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '2px', color: '#F8FAFC' }}>
            MERIDIAN // TERMINAL
          </span>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ fontSize: '10px', color: '#38BDF8', letterSpacing: '1px' }}>
            AUTONOMOUS MACRO & RISK ENGINE v2.4
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px' }}>
          <link_1.default href="/trade" style={{ color: '#C8F135', textDecoration: 'none', fontWeight: 600 }}>
            TRADE DESK
          </link_1.default>
          <link_1.default href="/architecture" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            ARCHITECTURE
          </link_1.default>
          <link_1.default href="/automation" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            AUTOMATION
          </link_1.default>
          <link_1.default href="/" style={{
            padding: '6px 16px',
            backgroundColor: '#C8F135',
            color: '#090D16',
            textDecoration: 'none',
            fontWeight: 600,
            letterSpacing: '1px',
            border: '1px solid #A3E635'
        }}>
            ENTER CONSOLE →
          </link_1.default>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
            padding: '80px 32px',
            maxWidth: '1200px',
            margin: '0 auto',
            borderBottom: '1px solid #1E293B'
        }}>
        <div style={{ fontSize: '11px', color: '#C8F135', letterSpacing: '2px', marginBottom: '16px' }}>
          [INSTITUTIONAL INTELLIGENCE & DETERMINISTIC RISK ROUTING]
        </div>
        <h1 style={{
            fontSize: '36px',
            fontWeight: 400,
            color: '#F8FAFC',
            letterSpacing: '-1px',
            lineHeight: '1.2',
            maxWidth: '800px',
            marginBottom: '24px'
        }}>
          Cross-Asset Macro Synthesis & Falsification-Gated Execution
        </h1>
        <p style={{
            fontSize: '14px',
            color: '#94A3B8',
            maxWidth: '680px',
            marginBottom: '36px',
            lineHeight: '1.7'
        }}>
          Meridian continuously ingests macro feeds, central bank signals, SEC filings, and alternative dataset joins. Every market delta is evaluated against active investment theses, ranked by explicit salience scoring, and gated through cryptographic HMAC risk tokens before broker execution.
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
          <link_1.default href="/" style={{
            padding: '12px 24px',
            backgroundColor: '#C8F135',
            color: '#090D16',
            textDecoration: 'none',
            fontWeight: 600,
            letterSpacing: '1px',
            border: '1px solid #A3E635'
        }}>
            LAUNCH CONSOLE SURFACES
          </link_1.default>
          <link_1.default href="/architecture" style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: '#F8FAFC',
            textDecoration: 'none',
            fontWeight: 400,
            letterSpacing: '1px',
            border: '1px solid #334155'
        }}>
            SYSTEM SPECIFICATION
          </link_1.default>
        </div>
      </section>

      {/* Live Operational Metrics HUD */}
      <section style={{ borderBottom: '1px solid #1E293B', backgroundColor: '#0F172A' }}>
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            { label: 'INGESTION FEEDS', val: '18 REAL-TIME', sub: 'FRED, EIA, SEC, FCA, TwelveData' },
            { label: 'DELTAS EVALUATED (24H)', val: '1,420 METRICS', sub: 'Deterministic Salience Pipeline' },
            { label: 'COUNCIL SYNTHESIS', val: '3 AI MODELS', sub: 'Claude 3.5, GPT-4o, Grok-2' },
            { label: 'BROKER ADAPTER', val: 'OANDA v20 ACTIVE', sub: 'HMAC RiskToken Protected' }
        ].map((m, i) => (<div key={i} style={{
                padding: '24px 32px',
                borderRight: i < 3 ? '1px solid #1E293B' : 'none'
            }}>
              <div style={{ fontSize: '10px', color: '#64748B', letterSpacing: '1px', marginBottom: '8px' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '16px', color: '#F8FAFC', fontWeight: 500, marginBottom: '4px' }}>
                {m.val}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                {m.sub}
              </div>
            </div>))}
        </div>
      </section>

      {/* Core Architecture Matrix */}
      <section style={{ padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ fontSize: '11px', color: '#64748B', letterSpacing: '2px', marginBottom: '12px' }}>
          SYSTEM PIPELINE & 4-TIER ESCALATION MODEL
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 400, color: '#F8FAFC', marginBottom: '48px' }}>
          End-to-End Autonomous Intelligence Flow
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            {
                tier: 'TIER 1 — WATCH',
                color: '#38BDF8',
                title: 'Continuous Observation',
                desc: 'Monitors raw data streams across macroeconomic releases, Treasury fiscal reports, EIA inventory stock draws, and disclosed UK FCA net short positions.'
            },
            {
                tier: 'TIER 2 — RESEARCH',
                color: '#FACC15',
                title: 'Council Deep Synthesis',
                desc: 'Multi-LLM consensus (Claude, GPT-4o, Grok) cross-references anomalies against historical cycles, SEC Form 4 insider trades, and government contract awards.'
            },
            {
                tier: 'TIER 3 — PREPARE',
                color: '#FB923C',
                title: 'Thesis Falsification Check',
                desc: 'Drafts explicit OrderIntent parameters. Validates stop loss targets and verifies that mandatory falsification criteria are intact before staging.'
            },
            {
                tier: 'TIER 4 — EXECUTE',
                color: '#C8F135',
                title: 'RiskGate & Broker Route',
                desc: 'Generates cryptographically signed ApprovalToken. Passes security checks and routes execution payload to Oanda v20 REST endpoints.'
            }
        ].map((t, i) => (<div key={i} style={{
                border: '1px solid #1E293B',
                backgroundColor: '#0F172A',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                fontSize: '10px',
                color: t.color,
                letterSpacing: '1px',
                marginBottom: '12px',
                borderBottom: `1px solid ${t.color}33`,
                paddingBottom: '6px'
            }}>
                  {t.tier}
                </div>
                <div style={{ fontSize: '15px', color: '#F8FAFC', fontWeight: 500, marginBottom: '12px' }}>
                  {t.title}
                </div>
                <p style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.6', margin: 0 }}>
                  {t.desc}
                </p>
              </div>
              <div style={{ marginTop: '24px', fontSize: '10px', color: '#475569', letterSpacing: '1px' }}>
                STATUS: ENFORCED
              </div>
            </div>))}
        </div>
      </section>

      {/* 8-Pillar Coverage Matrix */}
      <section style={{ borderTop: '1px solid #1E293B', padding: '80px 32px', backgroundColor: '#0F172A' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', color: '#64748B', letterSpacing: '2px', marginBottom: '12px' }}>
            INTELLIGENCE COVERAGE
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 400, color: '#F8FAFC', marginBottom: '40px' }}>
            The 8 Pillars of Cross-Asset Context
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
            { num: 'PILLAR I', name: 'THE WORLD', detail: 'Global macro indicators, FRED fed funds rate, US public debt, EIA crude oil inventories.' },
            { num: 'PILLAR II', name: 'THE MARKETS', detail: 'Real-time multi-asset spot breadth (GBP/USD, EUR/USD, WTI), CFTC COT, FCA UK net short registers.' },
            { num: 'PILLAR III', name: 'THE HORIZON', detail: 'Forward event calendar linking SEC EDGAR S-1 IPO filings, central bank rate decisions, prediction odds.' },
            { num: 'PILLAR IV', name: 'THE UNDERCURRENT', detail: 'Alternative data joins: Congressional stock trading cross-referenced with USAspending federal contract awards.' },
            { num: 'PILLAR V', name: 'ALTERNATIVES', detail: 'Kalshi, Polymarket, and Manifold event contract probabilities and alternative asset valuation curves.' },
            { num: 'PILLAR VI', name: 'ACTIVE THESES', detail: 'Investment conviction & mandatory falsification engine. Every position possesses explicit invalidation rules.' },
            { num: 'PILLAR VII', name: 'AI COUNCIL', detail: 'Tri-model synthesis engine producing structured macro consensus reports and scenario probability distributions.' },
            { num: 'PILLAR VIII', name: 'AUTOMATION & RISK', detail: 'Deterministic 4-tier escalation model, RiskGate HMAC token signing, and Oanda broker execution.' },
        ].map((p, i) => (<div key={i} style={{
                border: '1px solid #1E293B',
                backgroundColor: '#0A0D12',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
            }}>
                <span style={{ fontSize: '10px', color: '#C8F135', letterSpacing: '1px', paddingTop: '2px' }}>{p.num}</span>
                <div>
                  <div style={{ fontSize: '13px', color: '#F8FAFC', fontWeight: 500, marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.5' }}>{p.detail}</div>
                </div>
              </div>))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
            borderTop: '1px solid #1E293B',
            padding: '32px',
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#64748B'
        }}>
        <div>MERIDIAN INVESTMENT CENTRE // PRIVATELY DEPLOYED SYSTEM</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <link_1.default href="/" style={{ color: '#94A3B8', textDecoration: 'none' }}>THE BRIEF</link_1.default>
          <link_1.default href="/automation" style={{ color: '#94A3B8', textDecoration: 'none' }}>AUTOMATION</link_1.default>
          <link_1.default href="/architecture" style={{ color: '#94A3B8', textDecoration: 'none' }}>SPECIFICATION</link_1.default>
        </div>
      </footer>
    </div>);
}
//# sourceMappingURL=page.js.map