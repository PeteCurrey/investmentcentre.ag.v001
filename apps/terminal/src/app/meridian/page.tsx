import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'MERIDIAN — Autonomous Institutional Investment Intelligence Platform',
  description: 'Deterministic 4-tier decision engine, multi-LLM synthesis, and real-time cross-asset intelligence pipeline.',
};

export default function MeridianMarketingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* Top Announcement Bar */}
      <div style={{
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        padding: '10px 24px',
        fontSize: '11px',
        fontFamily: '"DM Mono", monospace',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1E293B',
        letterSpacing: '0.5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            boxShadow: '0 0 8px #22C55E'
          }} />
          <span>SYSTEM ARCHITECTURE SPECIFICATION v1.0 — DETERMINISTIC RISK-GATE ENGINE LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', color: '#94A3B8' }}>
          <span>ENVIRONMENT: PRODUCTION</span>
          <span>OANDA v20 REST</span>
          <span>MULTI-LLM COUNCIL</span>
        </div>
      </div>

      {/* Primary Header */}
      <header style={{
        borderBottom: '1px solid #E2E8F0',
        padding: '20px 48px',
        backgroundColor: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              backgroundColor: '#1E3A5F',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
              fontFamily: '"DM Mono", monospace',
              border: '1px solid #0F172A'
            }}>
              M
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                MERIDIAN
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', fontFamily: '"DM Mono", monospace', letterSpacing: '0.5px' }}>
                INVESTMENT CENTRE
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '13px', fontWeight: 600 }}>
            <a href="#overview" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}>OVERVIEW</a>
            <a href="#architecture" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}>ARCHITECTURE</a>
            <a href="#pillars" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}>8 PILLARS</a>
            <a href="#council" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}>AI COUNCIL</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              id="cta-login-btn"
              href="/login"
              style={{
                padding: '10px 20px',
                backgroundColor: '#1E3A5F',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: '"DM Mono", monospace',
                letterSpacing: '0.5px',
                border: '1px solid #0F172A',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.08)',
                transition: 'all 0.15s ease'
              }}
            >
              ACCESS TERMINAL →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="overview" style={{
        padding: '100px 48px 80px 48px',
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        backgroundImage: 'radial-gradient(circle at 50% 0%, #1E293B 0%, #0F172A 70%)',
        borderBottom: '1px solid #1E293B'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '20px',
              fontSize: '11px',
              fontFamily: '"DM Mono", monospace',
              color: '#C8F135',
              marginBottom: '24px',
              letterSpacing: '0.5px'
            }}>
              <span>✦</span> INSTITUTIONAL AUTONOMOUS INTELLIGENCE ENGINE
            </div>

            <h1 style={{
              fontSize: '48px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
              color: '#FFFFFF',
              marginBottom: '20px'
            }}>
              Deterministic Macro Synthesis &amp; Risk-Gated Execution
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#94A3B8',
              lineHeight: '1.6',
              marginBottom: '36px',
              maxWidth: '620px'
            }}>
              Meridian unifies 8 multi-asset intelligence pillars — cross-referencing real-time prices, Treasury fiscal flows, US Congressional trades, and FCA disclosed shorts with a tri-model AI Council (Claude, GPT-4o, Grok) and a fail-closed HMAC RiskGate.
            </p>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Link
                id="hero-launch-btn"
                href="/login"
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#C8F135',
                  color: '#0F172A',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  fontFamily: '"DM Mono", monospace',
                  letterSpacing: '0.5px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ENTER TERMINAL DESK →
              </Link>
              <Link
                href="/login"
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: '"DM Mono", monospace',
                  letterSpacing: '0.5px',
                  border: '1px solid #334155'
                }}
              >
                SYSTEM ARCHITECTURE SPEC
              </Link>
            </div>
          </div>

          {/* Hero Telemetry Card */}
          <div style={{
            border: '1px solid #334155',
            backgroundColor: '#1E293B',
            padding: '24px',
            fontFamily: '"DM Mono", monospace',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px', fontSize: '11px', color: '#94A3B8' }}>
              <span>SYSTEM TELEMETRY</span>
              <span style={{ color: '#22C55E' }}>HEALTHY // 19 PACKAGES</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2B3A4E', paddingBottom: '10px' }}>
                <span style={{ color: '#94A3B8' }}>DATA ADAPTERS</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600 }}>16 CONNECTORS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2B3A4E', paddingBottom: '10px' }}>
                <span style={{ color: '#94A3B8' }}>AI COUNCIL MODEL SEATS</span>
                <span style={{ color: '#C8F135', fontWeight: 600 }}>CLAUDE · GPT-4O · GROK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2B3A4E', paddingBottom: '10px' }}>
                <span style={{ color: '#94A3B8' }}>RISK GATE PROTOCOL</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600 }}>HMAC-SHA256 SIGNED</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2B3A4E', paddingBottom: '10px' }}>
                <span style={{ color: '#94A3B8' }}>BROKER INTEGRATION</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600 }}>OANDA v20 REST (PRACTICE)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>TIER 4 EXECUTION GATE</span>
                <span style={{ color: '#EF4444', fontWeight: 700 }}>OBSERVE MODE (DISABLED)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '36px 48px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
          {[
            { metric: '8 PILLARS', label: 'Cross-Asset Telemetry', sub: 'Macro, Spot, Futures, Shorts, SEC' },
            { metric: '3 MODEL SEATS', label: 'Tri-Model AI Council', sub: 'Claude + GPT-4o + Grok Consensus' },
            { metric: '4 TIERS', label: 'Deterministic Escalation', sub: 'Watch → Research → Prepare → Execute' },
            { metric: '0 MOCK FALLBACKS', label: 'Strict Provenance Engine', sub: 'No hardcoded data or fake ages' },
          ].map((m, idx) => (
            <div key={idx} style={{ padding: '16px', borderRight: idx < 3 ? '1px solid #E2E8F0' : 'none' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E3A5F', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
                {m.metric}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4-Tier Pipeline Section */}
      <section id="architecture" style={{ padding: '80px 48px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', fontFamily: '"DM Mono", monospace', letterSpacing: '1.5px', marginBottom: '12px' }}>
            SYSTEM PIPELINE &amp; 4-TIER MODEL
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginBottom: '48px', letterSpacing: '-0.8px' }}>
            Autonomous Intelligence Pipeline
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              {
                tier: 'TIER 1 — WATCH',
                badge: 'INGESTION',
                title: 'Continuous Observation',
                desc: 'Monitors raw data streams across macroeconomic releases, Treasury fiscal reports, EIA inventory stock draws, and disclosed UK FCA net short positions.'
              },
              {
                tier: 'TIER 2 — RESEARCH',
                badge: 'SYNTHESIS',
                title: 'Council Deep Synthesis',
                desc: 'Multi-LLM consensus (Claude, GPT-4o, Grok) cross-references anomalies against historical cycles, SEC Form 4 insider trades, and government contract awards.'
              },
              {
                tier: 'TIER 3 — PREPARE',
                badge: 'FALSIFICATION',
                title: 'Thesis Falsification Check',
                desc: 'Drafts explicit OrderIntent parameters. Validates stop loss targets and verifies that mandatory falsification criteria are intact before staging.'
              },
              {
                tier: 'TIER 4 — EXECUTE',
                badge: 'SAFETY GATE',
                title: 'RiskGate & Broker Route',
                desc: 'Generates cryptographically signed ApprovalToken. Passes security checks and routes execution payload to Oanda v20 REST endpoints.'
              }
            ].map((t, i) => (
              <div key={i} style={{
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s ease'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', fontFamily: '"DM Mono", monospace' }}>
                      {t.tier}
                    </span>
                    <span style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: '#E2E8F0', color: '#475569', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>
                      {t.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '17px', color: '#0F172A', fontWeight: 700, marginBottom: '12px' }}>
                    {t.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                    {t.desc}
                  </p>
                </div>
                <div style={{ marginTop: '28px', fontSize: '11px', fontWeight: 700, color: '#166534', fontFamily: '"DM Mono", monospace', letterSpacing: '0.5px' }}>
                  STATUS: ENFORCED
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8-Pillar Coverage Section */}
      <section id="pillars" style={{ padding: '80px 48px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', fontFamily: '"DM Mono", monospace', letterSpacing: '1.5px', marginBottom: '12px' }}>
            INTELLIGENCE COVERAGE MATRIX
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginBottom: '40px', letterSpacing: '-0.8px' }}>
            The 8 Pillars of Cross-Asset Context
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {[
              { num: 'PILLAR I', name: 'THE WORLD', detail: 'Global macro indicators, FRED fed funds rate, US public debt, EIA crude oil inventories.' },
              { num: 'PILLAR II', name: 'THE MARKETS', detail: 'Real-time multi-asset spot breadth (GBP/USD, EUR/USD, WTI), CFTC COT, FCA UK net short registers.' },
              { num: 'PILLAR III', name: 'THE HORIZON', detail: 'Forward event calendar linking SEC EDGAR S-1 IPO filings, central bank rate decisions, prediction odds.' },
              { num: 'PILLAR IV', name: 'THE UNDERCURRENT', detail: 'Alternative data joins: Congressional stock trading cross-referenced with USAspending federal contract awards.' },
              { num: 'PILLAR V', name: 'ALTERNATIVES', detail: 'Kalshi, Polymarket, and Manifold event contract probabilities and alternative asset valuation curves.' },
              { num: 'PILLAR VI', name: 'ACTIVE THESES', detail: 'Investment conviction & mandatory falsification engine. Every position possesses explicit invalidation rules.' },
              { num: 'PILLAR VII', name: 'AI COUNCIL', detail: 'Tri-model synthesis engine producing structured macro consensus reports and scenario probability distributions.' },
              { num: 'PILLAR VIII', name: 'AUTOMATION & RISK', detail: 'Deterministic 4-tier escalation model, RiskGate HMAC token signing, and Oanda broker execution.' },
            ].map((p, i) => (
              <div key={i} style={{
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                padding: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px'
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#1E3A5F',
                  fontFamily: '"DM Mono", monospace',
                  letterSpacing: '1px',
                  paddingTop: '2px'
                }}>
                  {p.num}
                </span>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#0F172A', fontWeight: 700, margin: '0 0 6px 0' }}>{p.name}</h3>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>{p.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #E2E8F0',
        padding: '40px 48px',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#64748B',
          fontFamily: '"DM Mono", monospace'
        }}>
          <div>MERIDIAN INVESTMENT CENTRE &nbsp;•&nbsp; INSTITUTIONAL SYSTEM</div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/login" style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 700 }}>LOGIN TO TERMINAL</Link>
            <Link href="/meridian" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>MERIDIAN HOME</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
