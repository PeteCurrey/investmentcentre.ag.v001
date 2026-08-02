"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TechnicalArchitecturePage;
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
function TechnicalArchitecturePage() {
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
          <link_1.default href="/landing" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '2px', color: '#F8FAFC', textDecoration: 'none' }}>
            MERIDIAN // TERMINAL
          </link_1.default>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ fontSize: '10px', color: '#C8F135', letterSpacing: '1px' }}>
            TECHNICAL SPECIFICATION & SECURITY ARCHITECTURE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px' }}>
          <link_1.default href="/trade" style={{ color: '#C8F135', textDecoration: 'none', fontWeight: 600 }}>
            TRADE DESK
          </link_1.default>
          <link_1.default href="/landing" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            OVERVIEW
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

      {/* Header Title */}
      <div style={{ padding: '60px 32px 40px 32px', maxWidth: '1200px', margin: '0 auto', borderBottom: '1px solid #1E293B' }}>
        <div style={{ fontSize: '10px', color: '#C8F135', letterSpacing: '2px', marginBottom: '12px' }}>
          [SYSTEM SPECIFICATION & SECURITY PROTOCOLS]
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 400, color: '#F8FAFC', letterSpacing: '-0.5px', marginBottom: '16px' }}>
          Deterministic Risk Gating & Execution Architecture
        </h1>
        <p style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '750px' }}>
          Detailed technical breakdown of Meridian's cryptographic token signing, multi-model consensus verification, staleness protection, and Oanda v20 broker boundary safety limits.
        </p>
      </div>

      {/* Main Spec Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 32px 80px 32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Section 1: Security & Risk Gate */}
        <div style={{ border: '1px solid #1E293B', backgroundColor: '#0F172A', padding: '28px' }}>
          <div style={{ fontSize: '10px', color: '#38BDF8', letterSpacing: '1px', marginBottom: '8px' }}>
            01 // CRYPTOGRAPHIC RISK GATE & HMAC SIGNING
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 400, color: '#F8FAFC', marginBottom: '16px' }}>
            ApprovalToken & Nonce Anti-Replay Security
          </h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px', lineHeight: '1.7' }}>
            Orders submitted by Meridian cannot be executed directly by the broker adapter without a cryptographically verified <code style={{ color: '#C8F135' }}>ApprovalToken</code>. The <code style={{ color: '#C8F135' }}>RiskGate</code> signs the OrderIntent using HMAC-SHA256 with a secret key (<code style={{ color: '#C8F135' }}>RISK_HMAC_SECRET</code>). The token embeds a unique timestamp and nonce to prevent replay attacks and unapproved order tampering.
          </p>

          <div style={{ backgroundColor: '#0A0D12', border: '1px solid #1E293B', padding: '16px', fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#CBD5E1' }}>
            <div style={{ color: '#64748B', marginBottom: '4px' }}> // RISK GATE VERIFICATION PSEUDOCODE</div>
    // RISK GATE VERIFICATION PSEUDOCODE</div>
            <div><span style={{ color: '#F43F5E' }}>const</span> isApproved = RiskGate.<span style={{ color: '#38BDF8' }}>verifyToken</span>(token, intent);</div>
            <div><span style={{ color: '#F43F5E' }}>if</span> (!isApproved) <span style={{ color: '#F43F5E' }}>return</span> err(<span style={{ color: '#FACC15' }}>'Security Exception: Unapproved or forged ApprovalToken'</span>);</div>
          </div>
        </div>

        {/* Section 2: AI Council Synthesis Engine */}
        <div style={{ border: '1px solid #1E293B', backgroundColor: '#0F172A', padding: '28px' }}>
          <div style={{ fontSize: '10px', color: '#FACC15', letterSpacing: '1px', marginBottom: '8px' }}>
            02 // AI COUNCIL MULTI-MODEL SYNTHESIS
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 400, color: '#F8FAFC', marginBottom: '16px' }}>
            Tri-Model Consensus & Probability Distributions
          </h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px', lineHeight: '1.7' }}>
            The AI Council runs parallel inference across Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o, and xAI Grok-2. Each model independently evaluates incoming metric deltas against active macroeconomic theses. An observation only escalates to Tier 3 (Prepare) if consensus agreement exceeds 85%.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
            { model: 'CLAUDE 3.5 SONNET', role: 'Macro Analysis & Thesis Invalidation', status: 'ONLINE (140ms)' },
            { model: 'GPT-4O', role: 'Cross-Source Entity Resolution & SEC Joins', status: 'ONLINE (180ms)' },
            { model: 'GROK-2', role: 'Real-Time News & Sentiment Velocity', status: 'ONLINE (110ms)' }
        ].map((m, i) => (<div key={i} style={{ border: '1px solid #1E293B', backgroundColor: '#0A0D12', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: '#F8FAFC', fontWeight: 500, marginBottom: '4px' }}>{m.model}</div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '12px' }}>{m.role}</div>
                <div style={{ fontSize: '9px', color: '#C8F135', letterSpacing: '1px' }}>{m.status}</div>
              </div>))}
          </div>
        </div>

        {/* Section 3: Oanda v20 Broker Safeguards */}
        <div style={{ border: '1px solid #1E293B', backgroundColor: '#0F172A', padding: '28px' }}>
          <div style={{ fontSize: '10px', color: '#C8F135', letterSpacing: '1px', marginBottom: '8px' }}>
            03 // OANDA v20 EXECUTION SAFEGUARDS
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 400, color: '#F8FAFC', marginBottom: '16px' }}>
            Dual-Lock Environment Guards & Simulated Fallbacks
          </h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px', lineHeight: '1.7' }}>
            The Oanda adapter requires dual configuration confirmation before routing orders to live production accounts. If <code style={{ color: '#C8F135' }}>OANDA_ENVIRONMENT=live</code> is configured, the system enforces that <code style={{ color: '#C8F135' }}>TIER_4_ENABLED=true</code> is set in environment parameters. Without this dual lock, live execution is blocked at runtime.
          </p>
        </div>

      </div>

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
        <div>MERIDIAN INVESTMENT CENTRE // TECHNICAL SPECIFICATION</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <link_1.default href="/landing" style={{ color: '#94A3B8', textDecoration: 'none' }}>OVERVIEW</link_1.default>
          <link_1.default href="/" style={{ color: '#94A3B8', textDecoration: 'none' }}>CONSOLE</link_1.default>
        </div>
      </footer>
    </div>);
}
//# sourceMappingURL=page.js.map