import { describe, it, expect } from 'vitest';
import { BriefEngine } from './index';
import { EdgeOpportunity } from '@meridian/edge';
import { Pillar, toScaledInteger } from '@meridian/core';

describe('packages/brief (Executive Daily Brief Engine)', () => {
  const engine = new BriefEngine();

  const dummyOpportunity: EdgeOpportunity = {
    id: 'edge_1',
    instrument: 'GBP/USD',
    assetClass: 'FX',
    direction: 'BUY',
    convictionScore: 85,
    sizingRecommendedPct: 1.0,
    entryPrice: toScaledInteger(13145n),
    stopLossPrice: toScaledInteger(13000n),
    attachedObservations: [
      {
        id: 'obs_fred_101',
        source_id: 'fred',
        entity_id: null,
        pillar: Pillar.WORLD,
        metric: 'macro.fred.fedfunds',
        value_numeric: toScaledInteger(525n),
        value_scale: 2,
        value_text: '5.25',
        unit: '%',
        source_timestamp: new Date().toISOString(),
        captured_at: new Date().toISOString(),
        staleness_seconds: 10,
        confidence: 100,
        licence_class: 'REDISTRIBUTABLE_PUBLIC',
        redistributable: true,
        raw_ref: 'r2://ref'
      }
    ],
    adversarySurvived: true,
    correlationGroup: 'USD_SHORT',
    createdAt: new Date().toISOString()
  };

  it('rejects brief generation when uncited factual claims exist', () => {
    const res = engine.generateBrief({
      topEdgeOpportunities: [dummyOpportunity],
      thesisPressureAlerts: [],
      horizonEvents: [],
      councilSynthesisClaims: [
        'Federal Reserve maintains interest rates at 5.25%' // Missing citation!
      ]
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toMatch(/Uncited claims are prohibited/);
    }
  });

  it('generates executive brief when all claims carry verified citations', () => {
    const res = engine.generateBrief({
      topEdgeOpportunities: [dummyOpportunity],
      thesisPressureAlerts: [],
      horizonEvents: [],
      councilSynthesisClaims: [
        'Federal Reserve maintains interest rates at 5.25% [obs_fred_101]' // Cited!
      ]
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.citationVerificationPassed).toBe(true);
      expect(res.value.topEdgeOpportunities.length).toBe(1);
    }
  });
});
