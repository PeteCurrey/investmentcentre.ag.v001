'use client';

import React from 'react';
import Link from 'next/link';

export default function PublicLandingPage() {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '12px',
      lineHeight: '1.6'
    }}>
      {/* Top Header Navigation */}
      <header style={{
        borderBottom: '1px solid #E2E8F0',
        padding: '0 32px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '2px', color: '#0F172A' }}>
            MERIDIAN // TERMINAL
          </span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span style={{ fontSize: '10px', color: '#1E3A5F', letterSpacing: '1px' }}>
            AUTONOMOUS MACRO &amp; RISK ENGINE v2.4
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px' }}>
          <Link href="/trade" style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 600 }}>
            TRADE DESK
          </Link>
          <Link href="/architecture" style={{ color: '#64748B', textDecoration: 'none' }}>
            ARCHITECTURE
          </Link>
          <Link href="/automation" style={{ color: '#64748B', textDecoration: 'none' }}>
            AUTOMATION
          </Link>
          <Link href="/login" style={{
            padding: '6px 16px',
            backgroundColor: '#1E3A5F',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
            letterSpacing: '1px',
            border: '1px solid #1E3A5F'
          }}>
            LOG IN TO CONSOLE →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '80px 32px',
        maxWidth: '1200px',
        margin: '0 auto',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ fontSize: '11px', color: '#1E3A5F', letterSpacing: '2px', marginBottom: '16px' }}>
          [INSTITUTIONAL INTELLIGENCE &amp; DETERMINISTIC RISK ROUTING]
        </div>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 700,
          color: '#0F172A',
          letterSpacing: '-1px',
          lineHeight: '1.2',
          maxWidth: '800px',
          marginBottom: '24px'
        }}>
          Cross-Asset Macro Synthesis &amp; Falsification-Gated Execution
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#475569',
          maxWidth: '680px',
          marginBottom: '36px',
          lineHeight: '1.7'
        }}>
          Meridian continuously ingests macro feeds, central bank signals, SEC filings, and alternative dataset joins. Every market delta is evaluated against active investment theses, ranked by explicit salience scoring, and gated through cryptographic HMAC risk tokens before broker execution.
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/login" style={{
            padding: '12px 24px',
            backgroundColor: '#1E3A5F',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
            letterSpacing: '1px',
            border: '1px solid #1E3A5F'
          }}>
            LOG IN &amp; LAUNCH CONSOLE
          </Link>
          <Link href="/architecture" style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: '#0F172A',
            textDecoration: 'none',
            fontWeight: 400,
            letterSpacing: '1px',
            border: '1px solid #E2E8F0'
          }}>
            SYSTEM SPECIFICATION
          </Link>
        </div>
      </section>

      {/* Live Operational Metrics HUD */}
      <section style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
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
          ].map((m, i) => (
            <div key={i} style={{
              padding: '24px 32px',
              borderRight: i < 3 ? '1px solid #E2E8F0' : 'none'
            }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', letterSpacing: '1px', marginBottom: '8px', fontFamily: '"DM Mono", monospace' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 600, marginBottom: '4px', fontFamily: '"DM Mono", monospace' }}>
                {m.val}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', fontFamily: '"DM Mono", monospace' }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Architecture Matrix */}
      <section style={{ padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ fontSize: '11px', color: '#64748B', letterSpacing: '2px', marginBottom: '12px' }}>
          SYSTEM PIPELINE &amp; 4-TIER ESCALATION MODEL
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '48px' }}>
          End-to-End Autonomous Intelligence Flow
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            {
              tier: 'TIER 1 — WATCH',
              title: 'Continuous Observation',
              desc: 'Monitors raw data streams across macroeconomic releases, Treasury fiscal reports, EIA inventory stock draws, and disclosed UK FCA net short positions.'
            },
            {
              tier: 'TIER 2 — RESEARCH',
              title: 'Council Deep Synthesis',
              desc: 'Multi-LLM consensus (Claude, GPT-4o, Grok) cross-references anomalies against historical cycles, SEC Form 4 insider trades, and government contract awards.'
            },
            {
              tier: 'TIER 3 — PREPARE',
              title: 'Thesis Falsification Check',
              desc: 'Drafts explicit OrderIntent parameters. Validates stop loss targets and verifies that mandatory falsification criteria are intact before staging.'
            },
            {
              tier: 'TIER 4 — EXECUTE',
              title: 'RiskGate & Broker Route',
              desc: 'Generates cryptographically signed ApprovalToken. Passes security checks and routes execution payload to Oanda v20 REST endpoints.'
            }
          ].map((t, i) => (
            <div key={i} style={{
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  fontSize: '10px',
                  color: '#1E3A5F',
                  letterSpacing: '1px',
                  marginBottom: '12px',
                  borderBottom: '1px solid #E2E8F0',
                  paddingBottom: '6px',
                  fontWeight: 700
                }}>
                  {t.tier}
                </div>
                <div style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600, marginBottom: '12px' }}>
                  {t.title}
                </div>
                <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                  {t.desc}
                </p>
              </div>
              <div style={{ marginTop: '24px', fontSize: '10px', color: '#94A3B8', letterSpacing: '1px', fontFamily: '"DM Mono", monospace' }}>
                STATUS: ENFORCED
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8-Pillar Coverage Matrix */}
      <section style={{ borderTop: '1px solid #E2E8F0', padding: '80px 32px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', color: '#64748B', letterSpacing: '2px', marginBottom: '12px' }}>
            INTELLIGENCE COVERAGE
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '40px' }}>
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
            ].map((p, i) => (
              <div key={i} style={{
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <span style={{ fontSize: '10px', color: '#1E3A5F', letterSpacing: '1px', paddingTop: '2px', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>{p.num}</span>
                <div>
                  <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>{p.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #E2E8F0',
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
          <Link href="/brief" style={{ color: '#64748B', textDecoration: 'none' }}>THE BRIEF</Link>
          <Link href="/trade" style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 600 }}>TRADE DESK</Link>
          <Link href="/automation" style={{ color: '#64748B', textDecoration: 'none' }}>AUTOMATION</Link>
          <Link href="/architecture" style={{ color: '#64748B', textDecoration: 'none' }}>SPECIFICATION</Link>
        </div>
      </footer>
    </div>
  );
}
