import React from 'react';

export default function CouncilPage() {
  // DEMO DATA NOTICE: All content below was a fabricated static array.
  // The 85%/80%/75% conviction scores, model summaries, Adversary pass result,
  // and citation IDs (obs_fred_fedfunds, obs_twelve_gbpusd, obs_kalshi_fedaug26)
  // referenced no real stored Observations and were not produced by any model call.
  // The real Council infrastructure (CouncilOrchestrator, three-model pipeline,
  // SHA-256 cache, Adversary engine) is built — see /architecture — but it is not
  // yet connected to this view. API provider credits must be confirmed topped-up
  // before any live run. This page will populate from real CouncilResult records
  // once that wiring is complete.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          MULTI-MODEL ARTIFICIAL INTELLIGENCE COUNCIL &amp; ADVERSARY ENGINE
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          AI Council &amp; The Adversary
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Continuous 3-model synthesis (Claude, GPT-4o, Grok) with disagreement preservation and mandatory Adversary demolition passes.
        </p>
      </div>

      {/* DEMO notice */}
      <div style={{
        border: '1px solid #FCD34D',
        backgroundColor: '#FFFBEB',
        padding: '16px 20px',
        fontFamily: '"DM Mono", monospace',
        fontSize: '12px',
      }}>
        <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.05em' }}>
          ⚠ DEMO — COUNCIL NOT CONNECTED / PROVIDER CREDITS UNCONFIRMED
        </div>
        <div style={{ color: '#78350F', lineHeight: '1.6' }}>
          No live council evaluation has been run. The orchestrator, three-model pipeline, SHA-256 input-hash cache, and Adversary engine are built (see <a href="/architecture" style={{ color: '#1C3A5E', textDecoration: 'underline' }}>/architecture</a>) but are not yet wired to this view. Before any live run, API provider credits (Anthropic, OpenAI, xAI) must be explicitly confirmed — key presence alone is not sufficient.
        </div>
      </div>

      {/* Model status cards — showing actual key-check state, not fabricated ONLINE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { role: 'RISK & MACRO OFFICER', model: 'claude-sonnet-4-6', envKey: 'ANTHROPIC_API_KEY' },
          { role: 'PORTFOLIO STRATEGIST', model: 'gpt-4o', envKey: 'OPENAI_API_KEY' },
          { role: 'SENTIMENT & NARRATIVE ANALYST', model: 'grok-2-latest', envKey: 'XAI_API_KEY' },
        ].map((m, i) => (
          <div key={i} style={{ border: '1px solid #E4E4DF', padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E' }}>
                {m.role}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#92400E',
                backgroundColor: '#FEF3C7',
                padding: '2px 6px',
                border: '1px solid #FCD34D'
              }}>
                UNVERIFIED
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#14181B', marginBottom: '4px' }}>
              {m.model}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
              Requires: {m.envKey}
            </div>
          </div>
        ))}
      </div>

      {/* Empty council output area */}
      <div style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#FFFFFF' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E', borderBottom: '1px solid #E4E4DF', paddingBottom: '8px', marginBottom: '16px' }}>
          [COUNCIL OPINIONS &amp; CITATION VERIFICATION]
        </h2>
        <div style={{ padding: '32px', textAlign: 'center', fontFamily: '"DM Mono", monospace', fontSize: '12px', color: '#9CA3AF' }}>
          No council output available. Live run required.
        </div>
      </div>

      {/* Empty adversary panel */}
      <div style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#F7F7F5' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#6B7280', borderBottom: '1px solid #E4E4DF', paddingBottom: '8px', marginBottom: '16px' }}>
          [THE ADVERSARY PASS] DEMOLITION ATTACK LOG
        </h2>
        <div style={{ padding: '32px', textAlign: 'center', fontFamily: '"DM Mono", monospace', fontSize: '12px', color: '#9CA3AF' }}>
          No adversary evaluation available. Council output required first.
        </div>
      </div>
    </div>
  );
}
