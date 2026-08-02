import { describe, it, expect } from 'vitest';
import { createThesis, evaluateThesis, FalsificationCriterion, SalienceRanker } from './index';
import { Pillar, Observation, toScaledInteger } from '@meridian/core';

describe('packages/salience (Theses & Mandatory Falsification Engine)', () => {
  const validCriterion: FalsificationCriterion = {
    id: 'crit_1',
    metric: 'macro.fred.fedfunds',
    operator: 'GREATER_THAN',
    thresholdNumeric: 550n, // 5.50% (scale 2)
    description: 'Fed hikes interest rate above 5.50%'
  };

  it('rejects creation of unfalsifiable thesis without criteria', () => {
    const res = createThesis({
      instrumentOrEntityId: 'GBP_USD',
      title: 'Long GBP/USD Macro Play',
      rationale: 'UK rate cuts delayed while US inflation drops',
      falsificationCriteria: [] // Invalid!
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toMatch(/Unfalsifiable theses are prohibited/);
    }
  });

  it('creates valid thesis when falsification criteria are present', () => {
    const res = createThesis({
      instrumentOrEntityId: 'GBP_USD',
      title: 'Long GBP/USD Macro Play',
      rationale: 'UK rate cuts delayed while US inflation drops',
      falsificationCriteria: [validCriterion]
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.status).toBe('INTACT');
      expect(res.value.falsificationCriteria.length).toBe(1);
    }
  });

  it('detects thesis pressure warning and invalidation when criteria breach threshold', () => {
    const thesisRes = createThesis({
      instrumentOrEntityId: 'GBP_USD',
      title: 'Long GBP/USD Macro Play',
      rationale: 'UK rate cuts delayed while US inflation drops',
      falsificationCriteria: [validCriterion]
    });

    expect(thesisRes.success).toBe(true);
    const thesis = (thesisRes as any).value;

    // Observation 1: Fed funds at 5.25% (No breach)
    const safeObs: Observation = {
      id: 'obs_1',
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
      raw_ref: 'r2://ref1'
    };

    const evalSafe = evaluateThesis(thesis, [safeObs]);
    expect(evalSafe.status).toBe('INTACT');
    expect(evalSafe.breachedCriteria.length).toBe(0);

    // Observation 2: Fed funds spikes to 5.75% (Breaches 5.50% threshold)
    const breachObs: Observation = {
      ...safeObs,
      id: 'obs_2',
      value_numeric: toScaledInteger(575n),
      value_text: '5.75'
    };

    const evalBreach = evaluateThesis(thesis, [breachObs]);
    expect(evalBreach.status).toBe('INVALIDATED');
    expect(evalBreach.breachedCriteria.length).toBe(1);
  });

  it('ranks candidates using deterministic explicit weights (Thesis Match + Invalidation + Contradiction)', () => {
    const thesisRes = createThesis({
      instrumentOrEntityId: 'GBP_USD',
      title: 'Long GBP/USD Macro Play',
      rationale: 'UK rate cuts delayed while US inflation drops',
      falsificationCriteria: [validCriterion]
    });

    const thesis = (thesisRes as any).value;
    const ranker = new SalienceRanker([thesis]);

    const obsNormal: Observation = {
      id: 'obs_norm',
      source_id: 'twelve_data',
      entity_id: null,
      pillar: Pillar.MARKETS,
      metric: 'price.spot.eur_usd',
      value_numeric: toScaledInteger(10850n),
      value_scale: 4,
      value_text: '1.0850',
      unit: 'USD',
      source_timestamp: new Date().toISOString(),
      captured_at: new Date().toISOString(),
      staleness_seconds: 5,
      confidence: 100,
      licence_class: 'COMMERCIAL_THIRD_PARTY',
      redistributable: false,
      raw_ref: 'r2://ref_eur'
    };

    const obsThesisBreach: Observation = {
      id: 'obs_breach',
      source_id: 'fred',
      entity_id: null,
      pillar: Pillar.WORLD,
      metric: 'macro.fred.fedfunds',
      value_numeric: toScaledInteger(575n), // 5.75% breach
      value_scale: 2,
      value_text: '5.75',
      unit: '%',
      source_timestamp: new Date().toISOString(),
      captured_at: new Date().toISOString(),
      staleness_seconds: 10,
      confidence: 100,
      licence_class: 'REDISTRIBUTABLE_PUBLIC',
      redistributable: true,
      raw_ref: 'r2://ref_fed'
    };

    const ranked = ranker.rankCandidates([
      { observation: obsNormal },
      { observation: obsThesisBreach, isContradiction: true }
    ]);

    expect(ranked[0].observation.id).toBe('obs_breach');
    expect(ranked[0].salience.score).toBe(90); // 40 (thesis match) + 30 (invalidation) + 20 (contradiction)
    expect(ranked[1].salience.score).toBe(0); // baseline
  });
});

