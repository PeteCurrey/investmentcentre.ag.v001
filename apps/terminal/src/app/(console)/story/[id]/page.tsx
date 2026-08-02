'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { getStory, getRelatedStories } from '../../../../lib/stories';

const DIRECTION_CONFIG: Record<string, { bg: string; color: string; border: string; arrow: string }> = {
  BULLISH:  { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', arrow: '↑' },
  BEARISH:  { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', arrow: '↓' },
  NEUTRAL:  { bg: '#F7F7F5', color: '#6B7280', border: '#E4E4DF', arrow: '→' },
  VOLATILE: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D', arrow: '↕' },
};

const BIAS_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
  'BULLISH':    { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  'BEARISH':    { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  'NEUTRAL':    { bg: '#F7F7F5', color: '#6B7280', border: '#E4E4DF' },
  'HIGH ALERT': { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  'VOLATILE':   { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
};

const RISK_CONFIG: Record<string, { color: string; label: string }> = {
  LOW:      { color: '#166534', label: 'LOW RISK' },
  MEDIUM:   { color: '#92400E', label: 'MEDIUM RISK' },
  HIGH:     { color: '#991B1B', label: 'HIGH RISK' },
  CRITICAL: { color: '#7C3AED', label: '⚠ CRITICAL' },
};

const ASSET_CLASS_COLOURS: Record<string, string> = {
  FX:        '#1C3A5E',
  EQUITY:    '#166534',
  COMMODITY: '#92400E',
  RATES:     '#6B21A8',
  CREDIT:    '#0F766E',
  CRYPTO:    '#1D4ED8',
  INDEX:     '#374151',
};

export default function StoryPage() {
  const params = useParams();
  const id = params?.id as string;
  const story = getStory(id);
  if (!story) return notFound();

  const related = getRelatedStories(id);
  const biasStyle = BIAS_CONFIG[story.traderImpact.bias] ?? BIAS_CONFIG['NEUTRAL'];
  const riskStyle = RISK_CONFIG[story.traderImpact.riskLevel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#6B7280' }}>
        <Link href="/" style={{ color: '#1C3A5E', textDecoration: 'none', fontWeight: 700 }}>THE BRIEF</Link>
        <span>/</span>
        <span>{story.pillar}</span>
        <span>/</span>
        <span style={{ color: '#14181B' }}>{story.id.toUpperCase()}</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #1C3A5E', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#1C3A5E',
            color: '#FFFFFF',
            fontFamily: '"DM Mono", monospace',
            fontWeight: 700,
            fontSize: '10px',
            letterSpacing: '1px'
          }}>
            {story.pillar}
          </span>
          {story.salienceScore && (
            <span style={{
              padding: '2px 8px',
              backgroundColor: story.salienceScore >= 80 ? '#FEE2E2' : '#FEF3C7',
              color: story.salienceScore >= 80 ? '#991B1B' : '#92400E',
              fontFamily: '"DM Mono", monospace',
              fontWeight: 700,
              fontSize: '10px',
              border: '1px solid #E4E4DF'
            }}>
              SALIENCE {story.salienceScore}/100
            </span>
          )}
          <span style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
            {story.sourceLabel}
          </span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#14181B', letterSpacing: '-0.5px', lineHeight: 1.3, margin: 0 }}>
          {story.title}
        </h1>
        {story.metricLabel && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '11px', color: '#6B7280' }}>{story.metricLabel}:</span>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '20px', fontWeight: 700, color: '#1C3A5E' }}>{story.metricValue}</span>
          </div>
        )}
      </div>

      {/* Executive Summary */}
      <div style={{ backgroundColor: '#F7F7F5', border: '1px solid #E4E4DF', padding: '16px 20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, fontFamily: '"DM Mono", monospace', color: '#6B7280', marginBottom: '8px', letterSpacing: '1px' }}>
          EXECUTIVE SUMMARY
        </div>
        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#14181B', margin: 0, fontStyle: 'italic' }}>
          {story.summary}
        </p>
      </div>

      {/* Audio Executive Briefing Player */}
      <div style={{
        border: '1px solid #1C3A5E',
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        fontFamily: '"DM Mono", monospace'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#C8F135',
            color: '#090D16',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}>
            ▶
          </button>
          <div>
            <div style={{ fontSize: '11px', color: '#C8F135', letterSpacing: '0.5px' }}>
              AUDIO EXECUTIVE SYNTHESIS // AI COUNCIL BRIEF
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>
              Synthesized by Claude 3.5 & GPT-4o (1m 45s audio)
            </div>
          </div>
        </div>

        {/* Crisp Waveform visualizer */}
        <div style={{ flex: 1, maxWidth: '280px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          {[12, 18, 28, 14, 22, 32, 16, 24, 30, 20, 14, 26, 32, 18, 12, 24, 28, 16, 20, 14].map((h, idx) => (
            <div key={idx} style={{
              flex: 1,
              height: `${h}px`,
              backgroundColor: idx < 7 ? '#C8F135' : '#334155',
              transition: 'height 0.2s ease'
            }} />
          ))}
        </div>

        <span style={{ fontSize: '10px', color: '#94A3B8' }}>0:38 / 1:45</span>
      </div>

      {/* Trader Impact Banner */}
      <div style={{
        border: `2px solid ${biasStyle.border}`,
        backgroundColor: biasStyle.bg,
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: biasStyle.color, marginBottom: '6px', letterSpacing: '1px' }}>
              TRADER IMPACT ASSESSMENT
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: biasStyle.color, lineHeight: 1.4 }}>
              {story.traderImpact.headline}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <span style={{
              padding: '4px 12px',
              backgroundColor: biasStyle.color,
              color: '#FFFFFF',
              fontFamily: '"DM Mono", monospace',
              fontWeight: 700,
              fontSize: '12px',
            }}>
              {story.traderImpact.bias}
            </span>
            <span style={{
              fontSize: '11px',
              fontFamily: '"DM Mono", monospace',
              fontWeight: 700,
              color: riskStyle.color,
            }}>
              {riskStyle.label} · {story.traderImpact.timeframe}
            </span>
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {story.traderImpact.affectedTraderTypes.map(t => (
            <span key={t} style={{
              padding: '2px 8px',
              backgroundColor: '#FFFFFF',
              border: `1px solid ${biasStyle.border}`,
              fontFamily: '"DM Mono", monospace',
              fontSize: '10px',
              fontWeight: 600,
              color: biasStyle.color,
            }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Instruments Affected */}
      <div style={{ border: '1px solid #E4E4DF' }}>
        <div style={{
          backgroundColor: '#F7F7F5',
          padding: '12px 16px',
          fontSize: '11px',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 700,
          borderBottom: '1px solid #E4E4DF',
          color: '#1C3A5E',
          letterSpacing: '0.5px'
        }}>
          INSTRUMENTS LIKELY TO MOVE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {story.instruments.map((inst, idx) => {
            const dirStyle = DIRECTION_CONFIG[inst.direction] ?? DIRECTION_CONFIG['NEUTRAL'];
            const acColour = ASSET_CLASS_COLOURS[inst.assetClass] ?? '#374151';
            return (
              <div key={inst.ticker} style={{
                padding: '14px 16px',
                borderBottom: idx < story.instruments.length - 1 ? '1px solid #E4E4DF' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
              }}>
                {/* Direction arrow */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: dirStyle.bg,
                  border: `1px solid ${dirStyle.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: dirStyle.color,
                  flexShrink: 0,
                }}>
                  {dirStyle.arrow}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#14181B',
                    }}>
                      {inst.ticker}
                    </span>
                    <span style={{
                      padding: '1px 6px',
                      backgroundColor: acColour,
                      color: '#FFFFFF',
                      fontFamily: '"DM Mono", monospace',
                      fontSize: '9px',
                      fontWeight: 700,
                    }}>
                      {inst.assetClass}
                    </span>
                    <span style={{
                      padding: '1px 6px',
                      backgroundColor: dirStyle.bg,
                      color: dirStyle.color,
                      fontFamily: '"DM Mono", monospace',
                      fontSize: '10px',
                      fontWeight: 700,
                      border: `1px solid ${dirStyle.border}`,
                    }}>
                      {inst.direction}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>{inst.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                    {inst.reasoning}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Narrative */}
      <div style={{ border: '1px solid #E4E4DF' }}>
        <div style={{
          backgroundColor: '#F7F7F5',
          padding: '12px 16px',
          fontSize: '11px',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 700,
          borderBottom: '1px solid #E4E4DF',
          color: '#1C3A5E',
          letterSpacing: '0.5px'
        }}>
          FULL ANALYTICAL NARRATIVE
        </div>
        <div style={{ padding: '20px' }}>
          {story.narrative.split('\n\n').map((para, idx) => (
            <p key={idx} style={{
              fontSize: '13px',
              lineHeight: '1.75',
              color: '#14181B',
              marginBottom: '16px',
              marginTop: 0,
            }}>
              {para.trim()}
            </p>
          ))}
        </div>
      </div>

      {/* Key Facts */}
      <div style={{ border: '1px solid #E4E4DF' }}>
        <div style={{
          backgroundColor: '#F7F7F5',
          padding: '12px 16px',
          fontSize: '11px',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 700,
          borderBottom: '1px solid #E4E4DF',
          color: '#1C3A5E',
          letterSpacing: '0.5px'
        }}>
          KEY FACTS & DATA POINTS
        </div>
        <ul style={{ padding: '16px 20px 16px 36px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {story.keyFacts.map((fact, idx) => (
            <li key={idx} style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '12px',
              color: '#14181B',
              lineHeight: 1.5,
            }}>
              {fact}
            </li>
          ))}
        </ul>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {story.tags.map(tag => (
          <span key={tag} style={{
            padding: '2px 8px',
            backgroundColor: '#F7F7F5',
            border: '1px solid #E4E4DF',
            fontFamily: '"DM Mono", monospace',
            fontSize: '10px',
            color: '#6B7280',
          }}>
            #{tag}
          </span>
        ))}
      </div>

      {/* Related Stories */}
      {related.length > 0 && (
        <div style={{ border: '1px solid #E4E4DF' }}>
          <div style={{
            backgroundColor: '#F7F7F5',
            padding: '12px 16px',
            fontSize: '11px',
            fontFamily: '"DM Mono", monospace',
            fontWeight: 700,
            borderBottom: '1px solid #E4E4DF',
            color: '#1C3A5E',
          }}>
            RELATED INTELLIGENCE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {related.map((rel, idx) => {
              const relBias = BIAS_CONFIG[rel.traderImpact.bias] ?? BIAS_CONFIG['NEUTRAL'];
              return (
                <Link
                  key={rel.id}
                  href={`/story/${rel.id}`}
                  style={{
                    padding: '14px 16px',
                    borderBottom: idx < related.length - 1 ? '1px solid #E4E4DF' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textDecoration: 'none',
                    backgroundColor: '#FFFFFF',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={e => ((e.currentTarget as any).style.backgroundColor = '#F7F7F5')}
                  onMouseLeave={e => ((e.currentTarget as any).style.backgroundColor = '#FFFFFF')}
                >
                  <div>
                    <div style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#6B7280', marginBottom: '3px' }}>
                      {rel.pillar} · {rel.sourceLabel}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#14181B' }}>{rel.title}</div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: relBias.bg,
                    color: relBias.color,
                    fontFamily: '"DM Mono", monospace',
                    fontSize: '10px',
                    fontWeight: 700,
                    border: `1px solid ${relBias.border}`,
                    whiteSpace: 'nowrap',
                    marginLeft: '12px',
                  }}>
                    {rel.traderImpact.bias} →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Back link */}
      <div style={{ paddingBottom: '24px' }}>
        <Link href="/" style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          fontWeight: 700,
          color: '#1C3A5E',
          textDecoration: 'none',
          borderBottom: '1px solid #1C3A5E',
          paddingBottom: '1px',
        }}>
          ← RETURN TO THE BRIEF
        </Link>
      </div>
    </div>
  );
}
