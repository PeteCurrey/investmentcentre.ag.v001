'use client';

import React from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Architecture', href: '/architecture' },
  { label: 'Automation', href: '/automation' },
  { label: 'Trade Desk', href: '/trade' },
];

export default function PublicHomePage() {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      lineHeight: '1.6'
    }}>
      {/* Top Header Navigation */}
      <header style={{
        borderBottom: '1px solid #E2E8F0',
        padding: '0 48px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2px', color: '#0F172A' }}>MERIDIAN</span>
          <span style={{ fontSize: '13px', fontWeight: 400, letterSpacing: '1px', color: '#64748B' }}>TERMINAL</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '13px' }}>
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>
              {l.label}
            </Link>
          ))}
          <Link href="/login" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
          <Link href="/login" style={{
            padding: '8px 18px',
            backgroundColor: '#1E3A5F',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
            border: '1px solid #1E3A5F'
          }}>
            Request Access
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '96px 48px 64px 48px',
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
        {/* Status Badge Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: '#F1F5F9',
          border: '1px solid #E2E8F0',
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          color: '#64748B',
          letterSpacing: '0.5px',
          marginBottom: '32px',
          textTransform: 'uppercase'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            display: 'inline-block'
          }} />
          LIVE INTELLIGENCE FEED &nbsp;•&nbsp; 18 INSTRUMENTS ACTIVE
        </div>

        <h1 style={{
          fontSize: '44px',
          fontWeight: 700,
          color: '#0F172A',
          letterSpacing: '-1.2px',
          lineHeight: '1.15',
          maxWidth: '760px',
          marginBottom: '24px'
        }}>
          Market intelligence for institutional participants.
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#475569',
          maxWidth: '600px',
          marginBottom: '40px',
          lineHeight: '1.65'
        }}>
          Multi-source signal scoring and AI consensus analysis across Forex, Indices, Commodities and Crypto. Built for professional traders, proprietary desks, and sophisticated investors who require precision over noise.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '80px' }}>
          <Link href="/login" style={{
            padding: '12px 26px',
            backgroundColor: '#1E3A5F',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            border: '1px solid #1E3A5F'
          }}>
            Log In & Launch Console
          </Link>
          <Link href="/architecture" style={{
            padding: '12px 26px',
            backgroundColor: '#FFFFFF',
            color: '#334155',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '14px',
            border: '1px solid #E2E8F0'
          }}>
            System Specification
          </Link>
        </div>

        {/* 4-Column Institutional Metric Grid */}
        <div style={{
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)'
        }}>
          {[
            { metric: '47', label: 'Instruments Monitored', sub: 'Forex, Indices, Commodities, Crypto' },
            { metric: '3', label: 'AI Models in Consensus', sub: 'Claude, GPT-4o, Grok-2' },
            { metric: '0 – 100', label: 'Conviction Score Range', sub: 'Deterministic Salience Pipeline' },
            { metric: 'A+ – D', label: 'Risk Grade Scale', sub: 'HMAC RiskToken Protected' }
          ].map((m, idx) => (
            <div key={idx} style={{
              padding: '28px 32px',
              borderRight: idx < 3 ? '1px solid #E2E8F0' : 'none'
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#0F172A',
                fontFamily: '"DM Mono", monospace',
                letterSpacing: '-0.5px',
                marginBottom: '8px'
              }}>
                {m.metric}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Architecture: 4-Tier Model */}
      <section style={{
        padding: '80px 48px',
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E3A5F', letterSpacing: '1.5px', marginBottom: '12px', textTransform: 'uppercase' }}>
            SYSTEM PIPELINE & 4-TIER ESCALATION MODEL
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginBottom: '48px', letterSpacing: '-0.5px' }}>
            End-to-End Autonomous Intelligence Flow
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { tier: 'TIER 1 — WATCH', title: 'Continuous Observation', desc: 'Monitors raw data streams across macroeconomic releases, Treasury fiscal reports, EIA inventory stock draws, and disclosed UK FCA net short positions.' },
              { tier: 'TIER 2 — RESEARCH', title: 'Council Deep Synthesis', desc: 'Multi-LLM consensus (Claude, GPT-4o, Grok) cross-references anomalies against historical cycles, SEC Form 4 insider trades, and government contract awards.' },
              { tier: 'TIER 3 — PREPARE', title: 'Thesis Falsification Check', desc: 'Drafts explicit OrderIntent parameters. Validates stop loss targets and verifies that mandatory falsification criteria are intact before staging.' },
              { tier: 'TIER 4 — EXECUTE', title: 'RiskGate & Broker Route', desc: 'Generates cryptographically signed ApprovalToken. Passes security checks and routes execution payload to Oanda v20 REST endpoints.' }
            ].map((t, i) => (
              <div key={i} style={{
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', letterSpacing: '1px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                    {t.tier}
                  </div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 600, marginBottom: '12px' }}>
                    {t.title}
                  </div>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                    {t.desc}
                  </p>
                </div>
                <div style={{ marginTop: '28px', fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.5px', fontFamily: '"DM Mono", monospace' }}>
                  STATUS: ENFORCED
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8-Pillar Coverage Matrix */}
      <section style={{ padding: '80px 48px', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E3A5F', letterSpacing: '1.5px', marginBottom: '12px', textTransform: 'uppercase' }}>
            INTELLIGENCE COVERAGE
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginBottom: '40px', letterSpacing: '-0.5px' }}>
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
                backgroundColor: '#F8FAFC',
                padding: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', fontFamily: '"DM Mono", monospace', letterSpacing: '1px', paddingTop: '2px', flexShrink: 0 }}>
                  {p.num}
                </span>
                <div>
                  <div style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600, marginBottom: '6px' }}>{p.name}</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{p.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E2E8F0', padding: '36px 48px', backgroundColor: '#FFFFFF' }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#64748B'
        }}>
          <div>MERIDIAN INVESTMENT CENTRE &nbsp;•&nbsp; INSTITUTIONAL SYSTEM</div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/brief" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>THE BRIEF</Link>
            <Link href="/trade" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>TRADE DESK</Link>
            <Link href="/automation" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>AUTOMATION</Link>
            <Link href="/architecture" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>SPECIFICATION</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
