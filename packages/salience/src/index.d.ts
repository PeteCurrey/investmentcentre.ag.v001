import { Observation, Result, ScaledInteger } from '@meridian/core';
export type ComparisonOperator = 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'CONTAINS' | 'BREACH';
export interface FalsificationCriterion {
    id: string;
    metric: string;
    operator: ComparisonOperator;
    thresholdNumeric?: bigint;
    thresholdText?: string;
    description: string;
}
export type ThesisStatus = 'INTACT' | 'PRESSURE_WARNING' | 'INVALIDATED';
export interface Thesis {
    id: string;
    instrumentOrEntityId: string;
    title: string;
    rationale: string;
    falsificationCriteria: FalsificationCriterion[];
    status: ThesisStatus;
    breachedCriteriaIds: string[];
    createdAt: string;
    updatedAt: string;
}
export interface WatchlistItem {
    id: string;
    symbol: string;
    name: string;
    pillar: string;
    thesis: Thesis;
    targetEntryPrice?: ScaledInteger;
    addedAt: string;
}
export interface StandingPosition {
    id: string;
    symbol: string;
    units: ScaledInteger;
    averageEntryPrice: ScaledInteger;
    currentPrice: ScaledInteger;
    unrealizedPnl: ScaledInteger;
    thesis: Thesis;
    openedAt: string;
}
export interface CreateThesisInput {
    instrumentOrEntityId: string;
    title: string;
    rationale: string;
    falsificationCriteria: FalsificationCriterion[];
}
/**
 * Creates a validated Thesis instance.
 * NON-NEGOTIABLE RULE: A thesis without at least 1 explicit falsification criterion MUST be rejected at the boundary.
 */
export declare function createThesis(input: CreateThesisInput): Result<Thesis>;
export interface ThesisEvaluationResult {
    thesisId: string;
    status: ThesisStatus;
    breachedCriteria: FalsificationCriterion[];
    evaluatedAt: string;
}
export declare function evaluateThesis(thesis: Thesis, observations: Observation[]): ThesisEvaluationResult;
export interface SalienceScore {
    score: number;
    components: {
        thesisMatchWeight: number;
        invalidationWeight: number;
        contradictionWeight: number;
        accelerationWeight: number;
    };
    breakdownReason: string;
}
export interface SalienceCandidate {
    observation: Observation;
    isContradiction?: boolean;
    isAccelerating?: boolean;
}
export declare class SalienceRanker {
    private activeTheses;
    constructor(theses?: Thesis[]);
    calculateSalience(candidate: SalienceCandidate): SalienceScore;
    rankCandidates(candidates: SalienceCandidate[]): (SalienceCandidate & {
        salience: SalienceScore;
    })[];
}
//# sourceMappingURL=index.d.ts.map