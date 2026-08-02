import { Observation, Result, ok, err, ScaledInteger } from '@meridian/core';

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
export function createThesis(input: CreateThesisInput): Result<Thesis> {
  if (!input.falsificationCriteria || input.falsificationCriteria.length === 0) {
    return err(new Error(
      'MERIDIAN Core Rule Violation: A thesis must possess explicit, measurable falsification criteria. ' +
      'Unfalsifiable theses are prohibited.'
    ));
  }

  const now = new Date().toISOString();
  return ok({
    id: `ths_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    instrumentOrEntityId: input.instrumentOrEntityId,
    title: input.title,
    rationale: input.rationale,
    falsificationCriteria: input.falsificationCriteria,
    status: 'INTACT',
    breachedCriteriaIds: [],
    createdAt: now,
    updatedAt: now
  });
}

export interface ThesisEvaluationResult {
  thesisId: string;
  status: ThesisStatus;
  breachedCriteria: FalsificationCriterion[];
  evaluatedAt: string;
}

export function evaluateThesis(thesis: Thesis, observations: Observation[]): ThesisEvaluationResult {
  const breached: FalsificationCriterion[] = [];

  for (const criterion of thesis.falsificationCriteria) {
    const matchingObs = observations.filter(o => o.metric.toLowerCase() === criterion.metric.toLowerCase());
    
    for (const obs of matchingObs) {
      let isBreached = false;

      if (criterion.thresholdNumeric !== undefined && obs.value_numeric !== null) {
        if (criterion.operator === 'GREATER_THAN' && obs.value_numeric > criterion.thresholdNumeric) {
          isBreached = true;
        } else if (criterion.operator === 'LESS_THAN' && obs.value_numeric < criterion.thresholdNumeric) {
          isBreached = true;
        } else if (criterion.operator === 'EQUALS' && obs.value_numeric === criterion.thresholdNumeric) {
          isBreached = true;
        }
      } else if (criterion.thresholdText !== undefined && obs.value_text !== null) {
        if (criterion.operator === 'CONTAINS' && obs.value_text.toLowerCase().includes(criterion.thresholdText.toLowerCase())) {
          isBreached = true;
        } else if (criterion.operator === 'EQUALS' && obs.value_text.toLowerCase() === criterion.thresholdText.toLowerCase()) {
          isBreached = true;
        }
      }

      if (isBreached && !breached.some(b => b.id === criterion.id)) {
        breached.push(criterion);
      }
    }
  }

  let newStatus: ThesisStatus = 'INTACT';
  if (breached.length === thesis.falsificationCriteria.length) {
    newStatus = 'INVALIDATED';
  } else if (breached.length > 0) {
    newStatus = 'PRESSURE_WARNING';
  }

  return {
    thesisId: thesis.id,
    status: newStatus,
    breachedCriteria: breached,
    evaluatedAt: new Date().toISOString()
  };
}

// ==========================================
// SALIENCE ENGINE (EXPLICIT WEIGHT RANKER)
// ==========================================

export interface SalienceScore {
  score: number; // 0 - 100
  components: {
    thesisMatchWeight: number; // 0 or 40
    invalidationWeight: number; // 0 or 30
    contradictionWeight: number; // 0 or 20
    accelerationWeight: number; // 0 or 10
  };
  breakdownReason: string;
}

export interface SalienceCandidate {
  observation: Observation;
  isContradiction?: boolean;
  isAccelerating?: boolean;
}

export class SalienceRanker {
  private activeTheses: Thesis[] = [];

  constructor(theses: Thesis[] = []) {
    this.activeTheses = theses;
  }

  public calculateSalience(candidate: SalienceCandidate): SalienceScore {
    const { observation, isContradiction = false, isAccelerating = false } = candidate;

    let thesisMatchWeight = 0;
    let invalidationWeight = 0;
    let contradictionWeight = isContradiction ? 20 : 0;
    let accelerationWeight = isAccelerating ? 10 : 0;

    const reasons: string[] = [];

    // 1. Check if observation matches active portfolio thesis
    const matchingThesis = this.activeTheses.find(t => 
      t.falsificationCriteria.some(c => c.metric.toLowerCase() === observation.metric.toLowerCase())
    );

    if (matchingThesis) {
      thesisMatchWeight = 40;
      reasons.push(`Matches active thesis '${matchingThesis.title}' (+40)`);

      // Evaluate if this observation causes thesis pressure or invalidation
      const evalRes = evaluateThesis(matchingThesis, [observation]);
      if (evalRes.status === 'INVALIDATED') {
        invalidationWeight = 30;
        reasons.push(`Triggers complete thesis invalidation (+30)`);
      } else if (evalRes.status === 'PRESSURE_WARNING') {
        invalidationWeight = 20;
        reasons.push(`Triggers thesis pressure warning (+20)`);
      }
    }

    if (isContradiction) {
      reasons.push(`Cross-source data contradiction (+20)`);
    }

    if (isAccelerating) {
      reasons.push(`Metric velocity accelerating (+10)`);
    }

    const totalScore = Math.min(100, thesisMatchWeight + invalidationWeight + contradictionWeight + accelerationWeight);

    return {
      score: totalScore,
      components: {
        thesisMatchWeight,
        invalidationWeight,
        contradictionWeight,
        accelerationWeight
      },
      breakdownReason: reasons.length > 0 ? reasons.join('; ') : 'Baseline metric observation (+0)'
    };
  }

  public rankCandidates(candidates: SalienceCandidate[]): (SalienceCandidate & { salience: SalienceScore })[] {
    return candidates
      .map(c => ({
        ...c,
        salience: this.calculateSalience(c)
      }))
      .sort((a, b) => b.salience.score - a.salience.score);
  }
}
