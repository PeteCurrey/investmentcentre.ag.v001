import { Result } from '@meridian/core';
import { EdgeOpportunity } from '@meridian/edge';
export interface ExecutiveBriefInput {
    topEdgeOpportunities: EdgeOpportunity[];
    thesisPressureAlerts: string[];
    horizonEvents: string[];
    councilSynthesisClaims: string[];
}
export interface ExecutiveBrief {
    id: string;
    date: string;
    topEdgeOpportunities: EdgeOpportunity[];
    thesisPressureAlerts: string[];
    horizonEvents: string[];
    councilSynthesisClaims: string[];
    citationVerificationPassed: boolean;
    generatedAt: string;
}
export declare class BriefEngine {
    /**
     * Generates the Daily Executive Brief.
     * MANDATORY: Verifies that every claim in the synthesis carries explicit observation citations.
     */
    generateBrief(input: ExecutiveBriefInput): Result<ExecutiveBrief>;
}
//# sourceMappingURL=index.d.ts.map