"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalienceRanker = void 0;
exports.createThesis = createThesis;
exports.evaluateThesis = evaluateThesis;
const core_1 = require("@meridian/core");
/**
 * Creates a validated Thesis instance.
 * NON-NEGOTIABLE RULE: A thesis without at least 1 explicit falsification criterion MUST be rejected at the boundary.
 */
function createThesis(input) {
    if (!input.falsificationCriteria || input.falsificationCriteria.length === 0) {
        return (0, core_1.err)(new Error('MERIDIAN Core Rule Violation: A thesis must possess explicit, measurable falsification criteria. ' +
            'Unfalsifiable theses are prohibited.'));
    }
    const now = new Date().toISOString();
    return (0, core_1.ok)({
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
function evaluateThesis(thesis, observations) {
    const breached = [];
    for (const criterion of thesis.falsificationCriteria) {
        const matchingObs = observations.filter(o => o.metric.toLowerCase() === criterion.metric.toLowerCase());
        for (const obs of matchingObs) {
            let isBreached = false;
            if (criterion.thresholdNumeric !== undefined && obs.value_numeric !== null) {
                if (criterion.operator === 'GREATER_THAN' && obs.value_numeric > criterion.thresholdNumeric) {
                    isBreached = true;
                }
                else if (criterion.operator === 'LESS_THAN' && obs.value_numeric < criterion.thresholdNumeric) {
                    isBreached = true;
                }
                else if (criterion.operator === 'EQUALS' && obs.value_numeric === criterion.thresholdNumeric) {
                    isBreached = true;
                }
            }
            else if (criterion.thresholdText !== undefined && obs.value_text !== null) {
                if (criterion.operator === 'CONTAINS' && obs.value_text.toLowerCase().includes(criterion.thresholdText.toLowerCase())) {
                    isBreached = true;
                }
                else if (criterion.operator === 'EQUALS' && obs.value_text.toLowerCase() === criterion.thresholdText.toLowerCase()) {
                    isBreached = true;
                }
            }
            if (isBreached && !breached.some(b => b.id === criterion.id)) {
                breached.push(criterion);
            }
        }
    }
    let newStatus = 'INTACT';
    if (breached.length === thesis.falsificationCriteria.length) {
        newStatus = 'INVALIDATED';
    }
    else if (breached.length > 0) {
        newStatus = 'PRESSURE_WARNING';
    }
    return {
        thesisId: thesis.id,
        status: newStatus,
        breachedCriteria: breached,
        evaluatedAt: new Date().toISOString()
    };
}
class SalienceRanker {
    activeTheses = [];
    constructor(theses = []) {
        this.activeTheses = theses;
    }
    calculateSalience(candidate) {
        const { observation, isContradiction = false, isAccelerating = false } = candidate;
        let thesisMatchWeight = 0;
        let invalidationWeight = 0;
        let contradictionWeight = isContradiction ? 20 : 0;
        let accelerationWeight = isAccelerating ? 10 : 0;
        const reasons = [];
        // 1. Check if observation matches active portfolio thesis
        const matchingThesis = this.activeTheses.find(t => t.falsificationCriteria.some(c => c.metric.toLowerCase() === observation.metric.toLowerCase()));
        if (matchingThesis) {
            thesisMatchWeight = 40;
            reasons.push(`Matches active thesis '${matchingThesis.title}' (+40)`);
            // Evaluate if this observation causes thesis pressure or invalidation
            const evalRes = evaluateThesis(matchingThesis, [observation]);
            if (evalRes.status === 'INVALIDATED') {
                invalidationWeight = 30;
                reasons.push(`Triggers complete thesis invalidation (+30)`);
            }
            else if (evalRes.status === 'PRESSURE_WARNING') {
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
    rankCandidates(candidates) {
        return candidates
            .map(c => ({
            ...c,
            salience: this.calculateSalience(c)
        }))
            .sort((a, b) => b.salience.score - a.salience.score);
    }
}
exports.SalienceRanker = SalienceRanker;
//# sourceMappingURL=index.js.map