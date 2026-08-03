import React from 'react';

export default function EdgePage() {
  // DEMO DATA NOTICE: No live engine output is connected to this page.
  // The MERIDIAN contradiction engine and adversary council pipeline exist
  // (see /architecture) but ranked trade tickets are not yet being written
  // to a store this page can read. The rows below are removed; they were
  // hardcoded seed data with fabricated conviction scores and citation IDs
  // that referenced no real stored observations.
  // When the engine begins emitting ranked opportunities, this page will
  // render them via the Observation query interface — not static arrays.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          CROSS-ASSET OPPORTUNITY &amp; POSITION STRUCTURE BOARD
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The Edge
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Ranked cross-asset trade tickets, position correlation grouping, risk gate invalidation levels, and Adversary survival badges.
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
          ⚠ DEMO — ENGINE OUTPUT NOT CONNECTED
        </div>
        <div style={{ color: '#78350F', lineHeight: '1.6' }}>
          No live ranked opportunities are available. The contradiction engine and adversary council pipeline are built (see <a href="/architecture" style={{ color: '#1C3A5E', textDecoration: 'underline' }}>/architecture</a>) but have not yet been wired to emit ranked trade tickets to this view. This panel will populate automatically once the engine begins publishing structured Observation records through the standard query interface.
        </div>
      </div>

      {/* Empty ranked opportunities board */}
      <div style={{ border: '1px solid #E4E4DF' }}>
        <div style={{
          backgroundColor: '#F7F7F5',
          padding: '12px 16px',
          fontSize: '12px',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 700,
          borderBottom: '1px solid #E4E4DF',
          color: '#1C3A5E'
        }}>
          RANKED OPPORTUNITIES (ADVERSARY SURVIVED)
        </div>
        <div style={{
          padding: '40px 16px',
          textAlign: 'center',
          fontFamily: '"DM Mono", monospace',
          fontSize: '12px',
          color: '#9CA3AF'
        }}>
          No opportunities ranked. Engine output required.
        </div>
      </div>
    </div>
  );
}
