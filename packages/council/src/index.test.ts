import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CouncilOrchestrator, CitationVerifier, AdversaryEngine, clearCouncilCache, computeInputHash } from './index';
import { Pillar, Observation, toScaledInteger } from '@meridian/core';

describe('packages/council (AI Council Synthesis & The Adversary)', () => {
  const origAnthropic = process.env.ANTHROPIC_API_KEY;
  const origOpenAI = process.env.OPENAI_API_KEY;
  const origXAI = process.env.XAI_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.XAI_API_KEY;
    clearCouncilCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (origAnthropic) process.env.ANTHROPIC_API_KEY = origAnthropic; else delete process.env.ANTHROPIC_API_KEY;
    if (origOpenAI) process.env.OPENAI_API_KEY = origOpenAI; else delete process.env.OPENAI_API_KEY;
    if (origXAI) process.env.XAI_API_KEY = origXAI; else delete process.env.XAI_API_KEY;
    clearCouncilCache();
    vi.restoreAllMocks();
  });

  it('detects model API keys presence accurately', () => {
    const orchestrator = new CouncilOrchestrator();
    const status = orchestrator.getModelStatus();
    expect(status).toEqual({
      anthropic_claude: false,
      openai_gpt: false,
      xai_grok: false
    });
  });

  it('reports empty opinions when no provider API keys are configured (no || true stub)', async () => {
    const orchestrator = new CouncilOrchestrator();
    const res = await orchestrator.evaluate({
      instrument: 'GBP/USD',
      pillarContext: 'MARKETS',
      observationsSnapshot: [{ id: 'obs_1', staleness_seconds: 100 }],
      deltasSnapshot: [],
      thesesSnapshot: []
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.opinions).toEqual([]); // Zero opinions when unconfigured
      expect(res.value.overallAgreementScore).toBe(0);
      expect(res.value.adversaryResult).toBeDefined();
    }
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

  it('runs The Adversary attack pass on real candidate observation telemetry', () => {
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

  it('caches Council evaluation against sha256 input hash and returns cached result on identical inputs', async () => {
    process.env.ANTHROPIC_API_KEY = 'test_anthropic_key';

    let fetchCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      fetchCount++;
      return {
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({
            summary: 'Macro stance on GBP/USD solid [obs_fred_1]',
            conviction: 88,
            invalidations: ['Fed rate hike'],
            agreeScore: 92
          }) }],
          usage: { input_tokens: 500, output_tokens: 100 }
        })
      };
    }));

    const orchestrator = new CouncilOrchestrator();
    const input = {
      instrument: 'GBP/USD',
      pillarContext: 'MARKETS',
      observationsSnapshot: [{ id: 'obs_fred_1', staleness_seconds: 50 }],
      deltasSnapshot: [],
      thesesSnapshot: []
    };

    // First evaluation: hits mock fetch API
    const res1 = await orchestrator.evaluate(input);
    expect(res1.success).toBe(true);
    expect(fetchCount).toBe(1);
    if (res1.success) {
      expect(res1.value.cached).toBe(false);
      expect(res1.value.opinions[0].modelName).toBe('claude-sonnet-4-6');
      expect(res1.value.opinions[0].citations).toEqual(['obs_fred_1']);
      // Token cost: (500 * 0.000003) + (100 * 0.000015) = 0.0015 + 0.0015 = 0.003
      expect(res1.value.tokenSpendEstUsd).toBe(0.003);
    }

    // Second evaluation with identical inputs: hits cache
    const res2 = await orchestrator.evaluate(input);
    expect(res2.success).toBe(true);
    expect(fetchCount).toBe(1); // No new fetch call made!
    if (res2.success) {
      expect(res2.value.cached).toBe(true);
    }
  });

  it('computes exact token cost from multi-model usage telemetry', async () => {
    process.env.ANTHROPIC_API_KEY = 'test_anthropic';
    process.env.OPENAI_API_KEY = 'test_openai';

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('anthropic.com')) {
        return {
          ok: true,
          json: async () => ({
            content: [{ text: JSON.stringify({ summary: 'Claude opinion [obs_1]', conviction: 85, invalidations: [], agreeScore: 90 }) }],
            usage: { input_tokens: 1000, output_tokens: 200 } // (1000*0.000003) + (200*0.000015) = 0.003 + 0.003 = 0.006
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ summary: 'OpenAI opinion [obs_1]', conviction: 80, invalidations: [], agreeScore: 85 }) } }],
          usage: { prompt_tokens: 1000, completion_tokens: 200 } // (1000*0.0000025) + (200*0.000010) = 0.0025 + 0.002 = 0.0045
        })
      };
    }));

    const orchestrator = new CouncilOrchestrator();
    const res = await orchestrator.evaluate({
      instrument: 'EUR/USD',
      pillarContext: 'MARKETS',
      observationsSnapshot: [{ id: 'obs_1', staleness_seconds: 10 }],
      deltasSnapshot: [],
      thesesSnapshot: []
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.opinions.length).toBe(2);
      // Total cost: 0.006 + 0.0045 = 0.0105
      expect(res.value.tokenSpendEstUsd).toBe(0.0105);
    }
  });
});
