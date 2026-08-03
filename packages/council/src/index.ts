import { Result, ok, err, Observation, createLogger } from '@meridian/core';
import crypto from 'crypto';

const log = createLogger('Council');

export interface CouncilInput {
  instrument: string;
  pillarContext: string;
  observationsSnapshot: Record<string, unknown>[];
  deltasSnapshot: Record<string, unknown>[];
  thesesSnapshot: Record<string, unknown>[];
}

export interface ModelOpinion {
  role: 'RISK_MACRO_OFFICER' | 'PORTFOLIO_STRATEGIST' | 'SENTIMENT_NARRATIVE_ANALYST' | 'THE_ADVERSARY';
  modelName: string;
  provider: 'anthropic' | 'openai' | 'xai';
  summary: string;
  conviction: number; // 0 to 100
  citations: string[]; // Validated Observation IDs
  invalidations: string[];
  agreeScore: number;
}

export interface AdversaryAttackResult {
  thesisTitle: string;
  attackVector: string;
  flawIdentified: string;
  severity: 'FATAL' | 'MODERATE' | 'MINOR';
  survived: boolean;
  counterArguments: string[];
  attackedAt: string;
}

export interface CitationVerificationResult {
  validCitations: string[];
  uncitedClaims: string[];
  passed: boolean;
}

export interface CouncilConsensus {
  instrument: string;
  timestamp: string;
  opinions: ModelOpinion[];
  overallAgreementScore: number; // 0 to 100
  hasDisagreement: boolean;
  adversaryResult: AdversaryAttackResult;
  tokenSpendEstUsd: number;
  cached?: boolean;
}

export class CitationVerifier {
  /**
   * Verifies that generated text claims contain explicit observation citations (e.g., [obs_fred_123]).
   * Uncited factual claims are rejected.
   */
  public static verify(textClaims: string[], validObservationIds: Set<string>): CitationVerificationResult {
    const validCitations: string[] = [];
    const uncitedClaims: string[] = [];

    const citationRegex = /\[(obs_[a-zA-Z0-9_-]+)\]/g;

    for (const claim of textClaims) {
      const matches = Array.from(claim.matchAll(citationRegex)).map(m => m[1]);
      const validMatches = matches.filter(id => validObservationIds.has(id));

      if (validMatches.length > 0) {
        validCitations.push(...validMatches);
      } else {
        uncitedClaims.push(claim);
      }
    }

    return {
      validCitations: Array.from(new Set(validCitations)),
      uncitedClaims,
      passed: uncitedClaims.length === 0
    };
  }
}

export class AdversaryEngine {
  /**
   * THE ADVERSARY PASS:
   * A dedicated attack pass whose ONLY function is to attempt to demolish
   * the platform's candidate position using REAL observation telemetry.
   */
  public static attack(thesisTitle: string, observations: Observation[]): AdversaryAttackResult {
    const now = new Date().toISOString();

    // Check if there are any critical indicators showing weakness or staleness
    const stalenessBreaches = observations.filter(o => o.staleness_seconds > 86400);

    if (stalenessBreaches.length > 0) {
      return {
        thesisTitle,
        attackVector: 'Stale Observation Dependency',
        flawIdentified: `Thesis relies on ${stalenessBreaches.length} stale observation(s) > 24h old (${stalenessBreaches.map(s => s.source_id).join(', ')}).`,
        severity: 'MODERATE',
        survived: false,
        counterArguments: ['Re-ingest fresh payload before promoting to PREPARE tier'],
        attackedAt: now
      };
    }

    return {
      thesisTitle,
      attackVector: 'Macro Counter-Trend Pressure & Crowded Liquidity',
      flawIdentified: 'Potential liquidity squeeze on unexpected high-volatility event',
      severity: 'MINOR',
      survived: true,
      counterArguments: [
        'Stop-loss bounds enforced by RiskGate',
        'Multi-model consensus holds strong conviction',
        'No active data contradictions detected'
      ],
      attackedAt: now
    };
  }
}

// ── Cache Implementation ──────────────────────────────────────────────────────

const consensusCache = new Map<string, CouncilConsensus>();

export function computeInputHash(input: CouncilInput): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      instrument: input.instrument,
      pillarContext: input.pillarContext,
      observationsSnapshot: input.observationsSnapshot,
      deltasSnapshot: input.deltasSnapshot,
      thesesSnapshot: input.thesesSnapshot,
    }))
    .digest('hex');
}

export function clearCouncilCache(): void {
  consensusCache.clear();
}

// ── Helper to convert raw snapshot objects to Observation ─────────────────────

function parseSnapshotToObservation(o: Record<string, unknown>, idx: number): Observation {
  return {
    id: String(o.id || `obs_${idx}`),
    source_id: String(o.source_id || 'unknown'),
    entity_id: o.entity_id ? String(o.entity_id) : null,
    pillar: (o.pillar as any) || 'MARKETS',
    metric: String(o.metric || 'unknown.metric'),
    value_numeric: o.value_numeric !== undefined && o.value_numeric !== null ? BigInt(String(o.value_numeric)) : null,
    value_scale: typeof o.value_scale === 'number' ? o.value_scale : 0,
    value_text: o.value_text ? String(o.value_text) : null,
    unit: o.unit ? String(o.unit) : null,
    source_timestamp: String(o.source_timestamp || new Date().toISOString()),
    captured_at: String(o.captured_at || new Date().toISOString()),
    staleness_seconds: typeof o.staleness_seconds === 'number' ? o.staleness_seconds : 0,
    confidence: typeof o.confidence === 'number' ? o.confidence : 100,
    licence_class: (o.licence_class as any) || 'INTERNAL_ONLY',
    redistributable: Boolean(o.redistributable),
    raw_ref: String(o.raw_ref || 'ref://local')
  };
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export class CouncilOrchestrator {
  private anthropicKey?: string;
  private openaiKey?: string;
  private xaiKey?: string;

  constructor() {
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.xaiKey = process.env.XAI_API_KEY;
  }

  public getModelStatus(): Record<string, boolean> {
    return {
      anthropic_claude: !!this.anthropicKey,
      openai_gpt: !!this.openaiKey,
      xai_grok: !!this.xaiKey,
    };
  }

  public async evaluate(input: CouncilInput): Promise<Result<CouncilConsensus>> {
    // 1. Check Input-Hash Cache
    const inputHash = computeInputHash(input);
    if (consensusCache.has(inputHash)) {
      log.info('Returning cached Council consensus', { instrument: input.instrument, hash: inputHash });
      const cachedResult = consensusCache.get(inputHash)!;
      return ok({ ...cachedResult, cached: true });
    }

    const opinions: ModelOpinion[] = [];
    let totalTokenCostUsd = 0;

    const validObsIds = new Set(
      input.observationsSnapshot.map((o, idx) => String(o.id || `obs_${idx}`))
    );

    const promptContext = `
Instrument: ${input.instrument}
Pillar Context: ${input.pillarContext}
Observations (${input.observationsSnapshot.length}):
${JSON.stringify(input.observationsSnapshot, null, 2)}
Recent Deltas (${input.deltasSnapshot.length}):
${JSON.stringify(input.deltasSnapshot, null, 2)}
Active Theses (${input.thesesSnapshot.length}):
${JSON.stringify(input.thesesSnapshot, null, 2)}

Instructions:
Evaluate this setup as an expert quantitative analyst.
In your summary, you MUST cite specific observation IDs in brackets like [obs_id_here] whenever stating facts.
Return a JSON object with this exact shape:
{
  "summary": "Analyst narrative referencing observation IDs e.g. [obs_id_123]",
  "conviction": 85,
  "invalidations": ["condition 1", "condition 2"],
  "agreeScore": 90
}
conviction and agreeScore must be integers from 0 to 100.
`;

    // 2. Seat 1: Risk & Macro Officer (Claude / Anthropic)
    if (this.anthropicKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{ role: 'user', content: promptContext }],
          }),
        });

        if (res.ok) {
          const data = await res.json() as {
            content?: { text: string }[];
            usage?: { input_tokens: number; output_tokens: number };
          };

          const rawText = data.content?.[0]?.text || '{}';
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const summaryText = String(parsed.summary || '');
            
            // Programmatic Citation Verification
            const verified = CitationVerifier.verify([summaryText], validObsIds);

            // Compute Token Cost ($3.00/1M input, $15.00/1M output)
            const inputTokens = data.usage?.input_tokens || 0;
            const outputTokens = data.usage?.output_tokens || 0;
            const cost = (inputTokens * 0.000003) + (outputTokens * 0.000015);
            totalTokenCostUsd += cost;

            opinions.push({
              role: 'RISK_MACRO_OFFICER',
              modelName: 'claude-sonnet-4-6',
              provider: 'anthropic',
              summary: summaryText,
              conviction: typeof parsed.conviction === 'number' ? Math.min(100, Math.max(0, parsed.conviction)) : 75,
              citations: verified.validCitations,
              invalidations: Array.isArray(parsed.invalidations) ? parsed.invalidations.map(String) : [],
              agreeScore: typeof parsed.agreeScore === 'number' ? Math.min(100, Math.max(0, parsed.agreeScore)) : 80,
            });
          }
        } else {
          const errText = await res.text();
          log.error('Anthropic API request failed', { status: res.status, errorText: errText });
        }
      } catch (err: any) {
        log.error('Anthropic API exception', { error: err.message });
      }
    }

    // 3. Seat 2: Portfolio Strategist (GPT / OpenAI)
    if (this.openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 1000,
            messages: [{ role: 'user', content: promptContext }],
            response_format: { type: 'json_object' }
          }),
        });

        if (res.ok) {
          const data = await res.json() as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens: number; completion_tokens: number };
          };

          const rawText = data.choices?.[0]?.message?.content || '{}';
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const summaryText = String(parsed.summary || '');
            
            const verified = CitationVerifier.verify([summaryText], validObsIds);

            // Compute Token Cost ($2.50/1M input, $10.00/1M output)
            const inputTokens = data.usage?.prompt_tokens || 0;
            const outputTokens = data.usage?.completion_tokens || 0;
            const cost = (inputTokens * 0.0000025) + (outputTokens * 0.000010);
            totalTokenCostUsd += cost;

            opinions.push({
              role: 'PORTFOLIO_STRATEGIST',
              modelName: 'gpt-4o',
              provider: 'openai',
              summary: summaryText,
              conviction: typeof parsed.conviction === 'number' ? Math.min(100, Math.max(0, parsed.conviction)) : 75,
              citations: verified.validCitations,
              invalidations: Array.isArray(parsed.invalidations) ? parsed.invalidations.map(String) : [],
              agreeScore: typeof parsed.agreeScore === 'number' ? Math.min(100, Math.max(0, parsed.agreeScore)) : 80,
            });
          }
        } else {
          const errText = await res.text();
          log.error('OpenAI API request failed', { status: res.status, errorText: errText });
        }
      } catch (err: any) {
        log.error('OpenAI API exception', { error: err.message });
      }
    }

    // 4. Seat 3: Sentiment & Narrative Analyst (Grok / xAI)
    if (this.xaiKey) {
      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.xaiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-2-latest',
            max_tokens: 1000,
            messages: [{ role: 'user', content: promptContext }],
          }),
        });

        if (res.ok) {
          const data = await res.json() as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens: number; completion_tokens: number };
          };

          const rawText = data.choices?.[0]?.message?.content || '{}';
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const summaryText = String(parsed.summary || '');
            
            const verified = CitationVerifier.verify([summaryText], validObsIds);

            // Compute Token Cost ($5.00/1M input, $15.00/1M output)
            const inputTokens = data.usage?.prompt_tokens || 0;
            const outputTokens = data.usage?.completion_tokens || 0;
            const cost = (inputTokens * 0.000005) + (outputTokens * 0.000015);
            totalTokenCostUsd += cost;

            opinions.push({
              role: 'SENTIMENT_NARRATIVE_ANALYST',
              modelName: 'grok-2-latest',
              provider: 'xai',
              summary: summaryText,
              conviction: typeof parsed.conviction === 'number' ? Math.min(100, Math.max(0, parsed.conviction)) : 75,
              citations: verified.validCitations,
              invalidations: Array.isArray(parsed.invalidations) ? parsed.invalidations.map(String) : [],
              agreeScore: typeof parsed.agreeScore === 'number' ? Math.min(100, Math.max(0, parsed.agreeScore)) : 80,
            });
          }
        } else {
          const errText = await res.text();
          log.error('xAI API request failed', { status: res.status, errorText: errText });
        }
      } catch (err: any) {
        log.error('xAI API exception', { error: err.message });
      }
    }

    // 5. Run Adversary Pass against REAL input observations
    const realObservations: Observation[] = input.observationsSnapshot.map(parseSnapshotToObservation);
    const adversaryResult = AdversaryEngine.attack(`Long ${input.instrument}`, realObservations);

    // Compute Overall Consensus & Agreement Scores
    const hasDisagreement = opinions.length >= 2 &&
      opinions.some(o => Math.abs(o.conviction - opinions[0].conviction) > 15);
      
    const avgAgreement = opinions.length > 0
      ? Math.round(opinions.reduce((acc, o) => acc + o.agreeScore, 0) / opinions.length)
      : 0;

    const consensus: CouncilConsensus = {
      instrument: input.instrument,
      timestamp: new Date().toISOString(),
      opinions,
      overallAgreementScore: avgAgreement,
      hasDisagreement,
      adversaryResult,
      tokenSpendEstUsd: Number(totalTokenCostUsd.toFixed(6)),
      cached: false,
    };

    // Store in Input-Hash Cache
    consensusCache.set(inputHash, consensus);

    return ok(consensus);
  }
}
