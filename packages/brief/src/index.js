"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BriefEngine = void 0;
const core_1 = require("@meridian/core");
const council_1 = require("@meridian/council");
class BriefEngine {
    /**
     * Generates the Daily Executive Brief.
     * MANDATORY: Verifies that every claim in the synthesis carries explicit observation citations.
     */
    generateBrief(input) {
        const validObsIds = new Set();
        for (const opp of input.topEdgeOpportunities) {
            for (const obs of opp.attachedObservations) {
                validObsIds.add(obs.id);
            }
        }
        const citationResult = council_1.CitationVerifier.verify(input.councilSynthesisClaims, validObsIds);
        if (!citationResult.passed && citationResult.uncitedClaims.length > 0) {
            return (0, core_1.err)(new Error(`MERIDIAN Brief Integrity Error: Generated brief contains ${citationResult.uncitedClaims.length} uncited factual claim(s): "${citationResult.uncitedClaims[0]}". Uncited claims are prohibited.`));
        }
        const now = new Date().toISOString();
        return (0, core_1.ok)({
            id: `brf_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            topEdgeOpportunities: input.topEdgeOpportunities,
            thesisPressureAlerts: input.thesisPressureAlerts,
            horizonEvents: input.horizonEvents,
            councilSynthesisClaims: input.councilSynthesisClaims,
            citationVerificationPassed: true,
            generatedAt: now
        });
    }
}
exports.BriefEngine = BriefEngine;
//# sourceMappingURL=index.js.map