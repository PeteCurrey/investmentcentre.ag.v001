'use client';

import React from 'react';
import Link from 'next/link';

export default function TechnicalArchitecturePage() {
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
          <Link href="/landing" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '2px', color: '#0F172A', textDecoration: 'none' }}>
            MERIDIAN // TERMINAL
          </Link>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span style={{ fontSize: '10px', color: '#1E3A5F', letterSpacing: '1px' }}>
            TECHNICAL SPECIFICATION &amp; SECURITY ARCHITECTURE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px' }}>
          <Link href="/trade" style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 600 }}>
            TRADE DESK
          </Link>
          <Link href="/landing" style={{ color: '#64748B', textDecoration: 'none' }}>
            OVERVIEW
          </Link>
          <Link href="/" style={{
            padding: '6px 16px',
            backgroundColor: '#1E3A5F',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
            letterSpacing: '1px',
            border: '1px solid #1E3A5F'
          }}>
            ENTER CONSOLE →
          </Link>
        </div>
      </header>

      {/* Header Title */}
      <div style={{ padding: '60px 32px 40px 32px', maxWidth: '1200px', margin: '0 auto', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '10px', color: '#1E3A5F', letterSpacing: '2px', marginBottom: '12px', fontFamily: '"DM Mono", monospace' }}>
          [SYSTEM SPECIFICATION &amp; SECURITY PROTOCOLS]
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '16px' }}>
          Deterministic Risk Gating &amp; Execution Architecture
        </h1>
        <p style={{ fontSize: '13px', color: '#475569', maxWidth: '750px' }}>
          Detailed technical breakdown of Meridian's cryptographic token signing, multi-model consensus verification, staleness protection, and Oanda v20 broker boundary safety limits.
        </p>
      </div>

      {/* Main Spec Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 32px 80px 32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Section 1: Security & Risk Gate */}
        <div style={{ border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '28px' }}>
          <div style={{ fontSize: '10px', color: '#1E3A5F', letterSpacing: '1px', marginBottom: '8px', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>
            01 // CRYPTOGRAPHIC RISK GATE &amp; HMAC SIGNING
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
            ApprovalToken &amp; Cryptographic Intent Security
          </h2>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '20px', lineHeight: '1.7' }}>
            Orders submitted by Meridian cannot be executed directly by the broker adapter without a cryptographically verified <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace' }}>ApprovalToken</code>. The <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace' }}>RiskGate</code> signs the OrderIntent using HMAC-SHA256 with a secret key (<code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace' }}>RISK_HMAC_SECRET</code>). The token binds the exact account, instrument, and 60-second expiration window to prevent unapproved order tampering.
          </p>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px', fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#334155' }}>
            <div style={{ color: '#94A3B8', marginBottom: '4px' }}>// RISK GATE VERIFICATION PSEUDOCODE</div>
            <div><span style={{ color: '#1E3A5F', fontWeight: 700 }}>const</span> isApproved = RiskGate.<span style={{ color: '#0369A1' }}>verifyToken</span>(token, intent);</div>
            <div><span style={{ color: '#1E3A5F', fontWeight: 700 }}>if</span> (!isApproved) <span style={{ color: '#1E3A5F', fontWeight: 700 }}>return</span> err(<span style={{ color: '#15803D' }}>'Security Exception: Unapproved or forged ApprovalToken'</span>);</div>
          </div>
        </div>

        {/* Section 2: AI Council Synthesis Engine */}
        <div style={{ border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '28px' }}>
          <div style={{ fontSize: '10px', color: '#1E3A5F', letterSpacing: '1px', marginBottom: '8px', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>
            02 // AI COUNCIL MULTI-MODEL SYNTHESIS
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
            Tri-Model Consensus &amp; Probability Distributions
          </h2>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '20px', lineHeight: '1.7' }}>
            The AI Council runs parallel inference across claude-sonnet-4-6, OpenAI GPT-4o, and xAI grok-2-latest. Each model independently evaluates incoming metric deltas against active macroeconomic theses and contributes an agreeScore that is averaged into the council's overallAgreementScore.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { model: 'CLAUDE-SONNET-4-6', role: 'Macro Analysis & Thesis Invalidation', status: 'ACTIVE' },
              { model: 'GPT-4O', role: 'Cross-Source Entity Resolution & SEC Joins', status: 'ACTIVE' },
              { model: 'GROK-2-LATEST', role: 'Real-Time News & Sentiment Velocity', status: 'ACTIVE' }
            ].map((m, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: '#0F172A', fontWeight: 700, marginBottom: '4px', fontFamily: '"DM Mono", monospace' }}>{m.model}</div>
                <div style={{ fontSize: '10px', color: '#475569', marginBottom: '12px' }}>{m.role}</div>
                <div style={{ fontSize: '9px', color: '#1E3A5F', letterSpacing: '1px', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>{m.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Oanda v20 Broker Safeguards */}
        <div style={{ border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '28px' }}>
          <div style={{ fontSize: '10px', color: '#1E3A5F', letterSpacing: '1px', marginBottom: '8px', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>
            03 // OANDA v20 EXECUTION SAFEGUARDS
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
            Dual-Lock Environment Guards &amp; Simulated Fallbacks
          </h2>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '20px', lineHeight: '1.7' }}>
            The Oanda adapter requires dual configuration confirmation before routing orders to live production accounts. If <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace' }}>OANDA_ENVIRONMENT=live</code> is configured, the system enforces that <code style={{ color: '#1E3A5F', fontFamily: '"DM Mono", monospace' }}>TIER_4_ENABLED=true</code> is set in environment parameters. Without this dual lock, live execution is blocked at runtime.
          </p>
        </div>

      </div>

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
        <div>MERIDIAN INVESTMENT CENTRE // TECHNICAL SPECIFICATION</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/landing" style={{ color: '#64748B', textDecoration: 'none' }}>OVERVIEW</Link>
          <Link href="/" style={{ color: '#64748B', textDecoration: 'none' }}>CONSOLE</Link>
        </div>
      </footer>
    </div>
  );
}
