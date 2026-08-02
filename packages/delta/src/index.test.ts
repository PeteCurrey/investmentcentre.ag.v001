import { describe, it, expect } from 'vitest';
import { DeltaEngine } from './index';
import { Pillar, Observation, toScaledInteger } from '@meridian/core';

describe('packages/delta (Contradiction & Change Detection Engine)', () => {
  const engine = new DeltaEngine();

  it('detects a first-class CONTRADICTION object when two sources diverge > 2%', () => {
    const obsA: Observation = {
      id: 'obs_fintel_1',
      source_id: 'fintel',
      entity_id: 'ent_acme',
      pillar: Pillar.MARKETS,
      metric: 'short_interest.pct_float',
      value_numeric: toScaledInteger(1550n), // 15.50% (scale 2)
      value_scale: 2,
      value_text: '15.50%',
      unit: '%',
      source_timestamp: new Date().toISOString(),
      captured_at: new Date().toISOString(),
      staleness_seconds: 100,
      confidence: 90,
      licence_class: 'COMMERCIAL_THIRD_PARTY',
      redistributable: false,
      raw_ref: 'r2://fintel'
    };

    const obsB: Observation = {
      id: 'obs_ortex_1',
      source_id: 'ortex',
      entity_id: 'ent_acme',
      pillar: Pillar.MARKETS,
      metric: 'short_interest.pct_float',
      value_numeric: toScaledInteger(1820n), // 18.20% (scale 2)
      value_scale: 2,
      value_text: '18.20%',
      unit: '%',
      source_timestamp: new Date().toISOString(),
      captured_at: new Date().toISOString(),
      staleness_seconds: 100,
      confidence: 90,
      licence_class: 'COMMERCIAL_THIRD_PARTY',
      redistributable: false,
      raw_ref: 'r2://ortex'
    };

    const contradictions = engine.detectContradictions([obsA, obsB]);
    expect(contradictions.length).toBe(1);
    expect(contradictions[0].sourceIdA).toBe('fintel');
    expect(contradictions[0].sourceIdB).toBe('ortex');
    expect(contradictions[0].divergencePct).toBeGreaterThan(2.0);
  });

  it('detects ANOMALY delta when value changes > 20%', () => {
    const pastObs: Observation = {
      id: 'obs_past',
      source_id: 'fred',
      entity_id: null,
      pillar: Pillar.WORLD,
      metric: 'macro.fred.cpi',
      value_numeric: toScaledInteger(100n),
      value_scale: 0,
      value_text: '100',
      unit: 'index',
      source_timestamp: new Date().toISOString(),
      captured_at: new Date().toISOString(),
      staleness_seconds: 86400,
      confidence: 100,
      licence_class: 'REDISTRIBUTABLE_PUBLIC',
      redistributable: true,
      raw_ref: 'r2://ref'
    };

    const newObs: Observation = {
      ...pastObs,
      id: 'obs_new',
      value_numeric: toScaledInteger(130n), // +30% spike
      value_text: '130'
    };

    const delta = engine.detectChanges(pastObs, newObs);
    expect(delta).not.toBeNull();
    expect(delta?.type).toBe('ANOMALY');
    expect(delta?.changeMagnitude).toBe(30);
  });
});
