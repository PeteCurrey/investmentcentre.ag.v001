import { describe, it, expect } from 'vitest';
import { EdgeEngine, EdgeOpportunity } from './index';
import { Pillar, Observation, toScaledInteger } from '@meridian/core';

describe('packages/edge (Cross-Asset Opportunity Engine)', () => {
  const engine = new EdgeEngine();

  const dummyObs: Observation = {
    id: 'obs_twelve_gbp',
    source_id: 'twelve_data',
    entity_id: null,
    pillar: Pillar.MARKETS,
    metric: 'price.spot.gbp_usd',
    value_numeric: toScaledInteger(13145n),
    value_scale: 4,
    value_text: '1.3145',
    unit: 'USD',
    source_timestamp: new Date().toISOString(),
    captured_at: new Date().toISOString(),
    staleness_seconds: 5,
    confidence: 100,
    licence_class: 'COMMERCIAL_THIRD_PARTY',
    redistributable: false,
    raw_ref: 'r2://ref'
  };

  it('rejects opportunity creation when no observation citations are attached', () => {
    const res = engine.createOpportunity({
      instrument: 'GBP/USD',
      assetClass: 'FX',
      direction: 'BUY',
      convictionScore: 85,
      sizingRecommendedPct: 1.0,
      entryPrice: toScaledInteger(13145n),
      stopLossPrice: toScaledInteger(13000n),
      attachedObservations: [], // Invalid!
      adversarySurvived: true,
      correlationGroup: 'USD_SHORT'
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toMatch(/must be backed by at least 1 verified observation/);
    }
  });

  it('filters out opportunities that failed The Adversary attack pass', () => {
    const opp1Res = engine.createOpportunity({
      instrument: 'GBP/USD',
      assetClass: 'FX',
      direction: 'BUY',
      convictionScore: 85,
      sizingRecommendedPct: 1.0,
      entryPrice: toScaledInteger(13145n),
      stopLossPrice: toScaledInteger(13000n),
      attachedObservations: [dummyObs],
      adversarySurvived: true,
      correlationGroup: 'USD_SHORT'
    });

    const opp2Res = engine.createOpportunity({
      instrument: 'EUR/USD',
      assetClass: 'FX',
      direction: 'BUY',
      convictionScore: 70,
      sizingRecommendedPct: 0.5,
      entryPrice: toScaledInteger(10850n),
      stopLossPrice: toScaledInteger(10750n),
      attachedObservations: [dummyObs],
      adversarySurvived: false, // Failed Adversary pass!
      correlationGroup: 'USD_SHORT'
    });

    expect(opp1Res.success).toBe(true);
    expect(opp2Res.success).toBe(true);

    const allOpp = [(opp1Res as any).value, (opp2Res as any).value];
    const topTier = engine.filterAdversarySurvived(allOpp);

    expect(topTier.length).toBe(1);
    expect(topTier[0].instrument).toBe('GBP/USD');
  });

  it('calculates portfolio correlation exposure correctly across groups', () => {
    const opp1Res = engine.createOpportunity({
      instrument: 'GBP/USD',
      assetClass: 'FX',
      direction: 'BUY',
      convictionScore: 85,
      sizingRecommendedPct: 1.0,
      entryPrice: toScaledInteger(13145n),
      stopLossPrice: toScaledInteger(13000n),
      attachedObservations: [dummyObs],
      adversarySurvived: true,
      correlationGroup: 'USD_SHORT'
    });

    const opp2Res = engine.createOpportunity({
      instrument: 'WTI_CRUDE',
      assetClass: 'COMMODITIES',
      direction: 'BUY',
      convictionScore: 80,
      sizingRecommendedPct: 1.5,
      entryPrice: toScaledInteger(7840n),
      stopLossPrice: toScaledInteger(7500n),
      attachedObservations: [dummyObs],
      adversarySurvived: true,
      correlationGroup: 'ENERGY_LONG'
    });

    const allOpp = [(opp1Res as any).value, (opp2Res as any).value];
    const exposureMap = engine.calculateCorrelationExposure(allOpp);

    expect(exposureMap.get('USD_SHORT')).toBe(1.0);
    expect(exposureMap.get('ENERGY_LONG')).toBe(1.5);
  });
});
