import { Observation, ScaledInteger, Result, ok, err } from '@meridian/core';

export type AssetClass = 'FX' | 'INDICES' | 'COMMODITIES' | 'EQUITIES' | 'ALTERNATIVES';

export interface EdgeOpportunity {
  id: string;
  instrument: string;
  assetClass: AssetClass;
  direction: 'BUY' | 'SELL';
  convictionScore: number; // 0 to 100
  sizingRecommendedPct: number; // e.g. 1.0 (1%)
  entryPrice: ScaledInteger;
  stopLossPrice: ScaledInteger;
  takeProfitPrice?: ScaledInteger;
  attachedObservations: Observation[];
  adversarySurvived: boolean;
  correlationGroup: string;
  createdAt: string;
}

export class EdgeEngine {
  /**
   * Constructs a structured EdgeOpportunity.
   * NON-NEGOTIABLE: Every opportunity MUST carry at least 1 attached observation citation.
   */
  public createOpportunity(input: {
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
  }): Result<EdgeOpportunity> {
    if (!input.attachedObservations || input.attachedObservations.length === 0) {
      return err(new Error('MERIDIAN Core Rule Violation: Edge opportunity must be backed by at least 1 verified observation citation.'));
    }

    const now = new Date().toISOString();
    return ok({
      id: `edge_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...input,
      createdAt: now
    });
  }

  /**
   * Filters out opportunities that failed The Adversary pass.
   * An Edge item cannot reach top-tier ranking without surviving The Adversary attack.
   */
  public filterAdversarySurvived(opportunities: EdgeOpportunity[]): EdgeOpportunity[] {
    return opportunities.filter(o => o.adversarySurvived);
  }

  /**
   * Computes aggregate risk exposure per correlation group to prevent over-concentration.
   */
  public calculateCorrelationExposure(opportunities: EdgeOpportunity[]): Map<string, number> {
    const exposure = new Map<string, number>();

    for (const opp of opportunities) {
      const current = exposure.get(opp.correlationGroup) || 0;
      exposure.set(opp.correlationGroup, Math.round((current + opp.sizingRecommendedPct) * 100) / 100);
    }

    return exposure;
  }
}
