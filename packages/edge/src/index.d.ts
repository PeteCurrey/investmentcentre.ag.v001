import { Observation, ScaledInteger, Result } from '@meridian/core';
export type AssetClass = 'FX' | 'INDICES' | 'COMMODITIES' | 'EQUITIES' | 'ALTERNATIVES';
export interface EdgeOpportunity {
    id: string;
    instrument: string;
    assetClass: AssetClass;
    direction: 'BUY' | 'SELL';
    convictionScore: number;
    sizingRecommendedPct: number;
    entryPrice: ScaledInteger;
    stopLossPrice: ScaledInteger;
    takeProfitPrice?: ScaledInteger;
    attachedObservations: Observation[];
    adversarySurvived: boolean;
    correlationGroup: string;
    createdAt: string;
}
export declare class EdgeEngine {
    /**
     * Constructs a structured EdgeOpportunity.
     * NON-NEGOTIABLE: Every opportunity MUST carry at least 1 attached observation citation.
     */
    createOpportunity(input: {
        instrument: string;
        assetClass: AssetClass;
        direction: 'BUY' | 'SELL';
        convictionScore: number;
        sizingRecommendedPct: number;
        entryPrice: ScaledInteger;
        stopLossPrice: ScaledInteger;
        takeProfitPrice?: ScaledInteger;
        attachedObservations: Observation[];
        adversarySurvived: boolean;
        correlationGroup: string;
    }): Result<EdgeOpportunity>;
    /**
     * Filters out opportunities that failed The Adversary pass.
     * An Edge item cannot reach top-tier ranking without surviving The Adversary attack.
     */
    filterAdversarySurvived(opportunities: EdgeOpportunity[]): EdgeOpportunity[];
    /**
     * Computes aggregate risk exposure per correlation group to prevent over-concentration.
     */
    calculateCorrelationExposure(opportunities: EdgeOpportunity[]): Map<string, number>;
}
//# sourceMappingURL=index.d.ts.map