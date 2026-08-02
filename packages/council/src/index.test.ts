import { describe, it, expect } from 'vitest';
import { CouncilOrchestrator, CitationVerifier, AdversaryEngine } from './index';
import { Pillar, Observation, toScaledInteger } from '@meridian/core';

describe('packages/council (AI Council Synthesis & The Adversary)', () => {
  it('detects model API keys presence', () => {
    const orchestrator = new CouncilOrchestrator();
    const status = orchestrator.getModelStatus();
    expect(status).toHaveProperty('anthropic_claude');
    expect(status).toHaveProperty('openai_gpt');
    expect(status).toHaveProperty('xai_grok');
  });

  it('verifies explicit observation citations in generated claims and rejects uncited text', () => {
    const validObsIds = new Set(['obs_fred_101', 'obs_twelve_202']);

    const validClaims = [
      'Federal Reserve maintained rates at 5.25% [obs_fred_101]',
      'GBP/USD spot price traded at 1.3145 [obs_twelve_202]'
    ];

    const resValid = CitationVerifier.verify(validClaims, validObsIds);
    expect(resValid.passed).toBe(true);
    expect(resValid.validCitations.length).toBe(2);

    const invalidClaims = [
      'Gold spot is expected to rise to 2500 USD' // Uncited!
    ];

    const resInvalid = CitationVerifier.verify(invalidClaims, validObsIds);
    expect(resInvalid.passed).toBe(false);
    expect(resInvalid.uncitedClaims.length).toBe(1);
  });

  it('runs The Adversary attack pass on candidate theses and reports survival status', () => {
    const freshObs: Observation[] = [
      {
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
        staleness_seconds: 300, // Fresh
        confidence: 100,
        licence_class: 'REDISTRIBUTABLE_PUBLIC',
        redistributable: true,
        raw_ref: 'r2://ref'
      }
    ];

    const attackFresh = AdversaryEngine.attack('Long GBP/USD', freshObs);
    expect(attackFresh.survived).toBe(true);
    expect(attackFresh.severity).toBe('MINOR');

    const staleObs: Observation[] = [
      {
        ...freshObs[0],
        staleness_seconds: 100000 // > 24h stale!
      }
    ];

    const attackStale = AdversaryEngine.attack('Long GBP/USD', staleObs);
    expect(attackStale.survived).toBe(false);
    expect(attackStale.attackVector).toMatch(/Stale Observation/);
  });

  it('runs council evaluation cleanly and produces structured opinions and Adversary results', async () => {
    process.env.ANTHROPIC_API_KEY = 'test_anthropic';
    process.env.OPENAI_API_KEY = 'test_openai';
    process.env.XAI_API_KEY = 'test_xai';

    const orchestrator = new CouncilOrchestrator();
    const result = await orchestrator.evaluate({
      instrument: 'GBP/USD',
      pillarContext: 'MARKETS',
      observationsSnapshot: [{ id: 'obs_fred_1' }],
      deltasSnapshot: [],
      thesesSnapshot: []
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.opinions.length).toBe(3);
      expect(result.value.adversaryResult).toBeDefined();
      expect(result.value.adversaryResult.thesisTitle).toMatch(/Long GBP\/USD/);
    }
  });
});
