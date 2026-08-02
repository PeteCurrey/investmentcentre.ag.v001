import { Result, Observation } from '@meridian/core';
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
    conviction: number;
    citations: string[];
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
    overallAgreementScore: number;
    hasDisagreement: boolean;
    adversaryResult: AdversaryAttackResult;
    tokenSpendEstUsd: number;
}
export declare class CitationVerifier {
    /**
     * Verifies that generated text claims contain explicit observation citations (e.g., [obs_fred_123]).
     * Uncited factual claims are rejected.
     */
    static verify(textClaims: string[], validObservationIds: Set<string>): CitationVerificationResult;
}
export declare class AdversaryEngine {
    /**
     * THE ADVERSARY PASS:
     * A dedicated scheduled attack pass whose ONLY function is to attempt to demolish
     * the platform's highest-conviction Edge positions.
     */
    static attack(thesisTitle: string, observations: Observation[]): AdversaryAttackResult;
}
export declare class CouncilOrchestrator {
    private anthropicKey?;
    private openaiKey?;
    private xaiKey?;
    constructor();
    getModelStatus(): Record<string, boolean>;
    evaluate(input: CouncilInput): Promise<Result<CouncilConsensus>>;
}
//# sourceMappingURL=index.d.ts.map