'use client';

import React from 'react';
import Link from 'next/link';

export default function TechnicalArchitecturePage() {
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
          <Link href="/landing" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2px', color: '#0F172A', textDecoration: 'none' }}>MERIDIAN</Link>
          <span style={{ fontSize: '13px', fontWeight: 400, letterSpacing: '1px', color: '#64748B' }}>TERMINAL</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '13px' }}>
          <Link href="/landing" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>Overview</Link>
          <Link href="/trade" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>Trade Desk</Link>
          <Link href="/login" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          <Link href="/" style={{
            padding: '8px 18px',
            backgroundColor: '#1E3A5F',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
            border: '1px solid #1E3A5F'
          }}>
            Enter Console →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div style={{ padding: '64px 48px 48px 48px', maxWidth: '1280px', margin: '0 auto', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E3A5F', letterSpacing: '1.5px', marginBottom: '16px', textTransform: 'uppercase', fontFamily: '"DM Mono", monospace' }}>
          SYSTEM SPECIFICATION & SECURITY ARCHITECTURE
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.8px', marginBottom: '20px', lineHeight: '1.2' }}>
          Deterministic Risk Gating & Execution Architecture
        </h1>
        <p style={{ fontSize: '16px', color: '#475569', maxWidth: '760px', lineHeight: '1.65' }}>
          Detailed technical breakdown of Meridian's cryptographic token signing, multi-model consensus verification, staleness protection, and Oanda v20 broker boundary safety limits.
        </p>
      </div>

      {/* Main Spec Grid */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 48px 80px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Section 1: Security & Risk Gate */}
        <div style={{ border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', padding: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', letterSpacing: '1.5px', marginBottom: '12px', fontFamily: '"DM Mono", monospace' }}>
            01 // CRYPTOGRAPHIC RISK GATE & HMAC SIGNING
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', letterSpacing: '-0.3px' }}>
            ApprovalToken & Nonce Anti-Replay Security
          </h2>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.7', maxWidth: '820px' }}>
            Orders submitted by Meridian cannot be executed directly by the broker adapter without a cryptographically verified <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace', backgroundColor: '#F1F5F9', padding: '2px 6px' }}>ApprovalToken</code>. The <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace', backgroundColor: '#F1F5F9', padding: '2px 6px' }}>RiskGate</code> signs the OrderIntent using HMAC-SHA256 with a secret key (<code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace', backgroundColor: '#F1F5F9', padding: '2px 6px' }}>RISK_HMAC_SECRET</code>). The token embeds a unique timestamp and nonce to prevent replay attacks and unapproved order tampering.
          </p>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '20px', fontSize: '13px', fontFamily: '"DM Mono", monospace', color: '#334155' }}>
            <div style={{ color: '#94A3B8', marginBottom: '6px' }}>// RISK GATE VERIFICATION PSEUDOCODE</div>
            <div><span style={{ color: '#1E3A5F', fontWeight: 600 }}>const</span> isApproved = RiskGate.<span style={{ color: '#0369A1' }}>verifyToken</span>(token, intent);</div>
            <div><span style={{ color: '#1E3A5F', fontWeight: 600 }}>if</span> (!isApproved) <span style={{ color: '#1E3A5F', fontWeight: 600 }}>return</span> err(<span style={{ color: '#15803D' }}>'Security Exception: Unapproved or forged ApprovalToken'</span>);</div>
          </div>
        </div>

        {/* Section 2: AI Council Synthesis Engine */}
        <div style={{ border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', padding: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', letterSpacing: '1.5px', marginBottom: '12px', fontFamily: '"DM Mono", monospace' }}>
            02 // AI COUNCIL MULTI-MODEL SYNTHESIS
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', letterSpacing: '-0.3px' }}>
            Tri-Model Consensus & Probability Distributions
          </h2>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.7', maxWidth: '820px' }}>
            The AI Council runs parallel inference across Anthropic Claude Sonnet, OpenAI GPT-4o, and xAI Grok-2. Each model independently evaluates incoming metric deltas against active macroeconomic theses. An observation only escalates to Tier 3 (Prepare) if consensus agreement exceeds 85%.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { model: 'CLAUDE SONNET', role: 'Macro Analysis & Thesis Invalidation', status: 'ONLINE' },
              { model: 'GPT-4O', role: 'Cross-Source Entity Resolution & SEC Joins', status: 'ONLINE' },
              { model: 'GROK-2', role: 'Real-Time News & Sentiment Velocity', status: 'ONLINE' }
            ].map((m, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '20px' }}>
                <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 700, marginBottom: '6px', fontFamily: '"DM Mono", monospace' }}>{m.model}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' }}>{m.role}</div>
                <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 700, fontFamily: '"DM Mono", monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }} />
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Oanda v20 Broker Safeguards */}
        <div style={{ border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', padding: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A5F', letterSpacing: '1.5px', marginBottom: '12px', fontFamily: '"DM Mono", monospace' }}>
            03 // OANDA v20 EXECUTION SAFEGUARDS
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', letterSpacing: '-0.3px' }}>
            Dual-Lock Environment Guards & Simulated Fallbacks
          </h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', maxWidth: '820px' }}>
            The Oanda adapter requires dual configuration confirmation before routing orders to live production accounts. If <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace', backgroundColor: '#F1F5F9', padding: '2px 6px' }}>OANDA_ENVIRONMENT=live</code> is configured, the system enforces that <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace', backgroundColor: '#F1F5F9', padding: '2px 6px' }}>TIER_4_ENABLED=true</code> is set in environment parameters. Without this dual lock, live execution is blocked at runtime.
          </p>
        </div>
      </div>

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
          <div>MERIDIAN INVESTMENT CENTRE &nbsp;•&nbsp; TECHNICAL SPECIFICATION</div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/landing" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>OVERVIEW</Link>
            <Link href="/" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>CONSOLE</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
