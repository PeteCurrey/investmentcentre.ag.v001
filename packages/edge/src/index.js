"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeEngine = void 0;
const core_1 = require("@meridian/core");
class EdgeEngine {
    /**
     * Constructs a structured EdgeOpportunity.
     * NON-NEGOTIABLE: Every opportunity MUST carry at least 1 attached observation citation.
     */
    createOpportunity(input) {
        if (!input.attachedObservations || input.attachedObservations.length === 0) {
            return (0, core_1.err)(new Error('MERIDIAN Core Rule Violation: Edge opportunity must be backed by at least 1 verified observation citation.'));
        }
        const now = new Date().toISOString();
        return (0, core_1.ok)({
            id: `edge_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            ...input,
            createdAt: now
        });
    }
    /**
     * Filters out opportunities that failed The Adversary pass.
     * An Edge item cannot reach top-tier ranking without surviving The Adversary attack.
     */
    filterAdversarySurvived(opportunities) {
        return opportunities.filter(o => o.adversarySurvived);
    }
    /**
     * Computes aggregate risk exposure per correlation group to prevent over-concentration.
     */
    calculateCorrelationExposure(opportunities) {
        const exposure = new Map();
        for (const opp of opportunities) {
            const current = exposure.get(opp.correlationGroup) || 0;
            exposure.set(opp.correlationGroup, Math.round((current + opp.sizingRecommendedPct) * 100) / 100);
        }
        return exposure;
    }
}
exports.EdgeEngine = EdgeEngine;
//# sourceMappingURL=index.js.map