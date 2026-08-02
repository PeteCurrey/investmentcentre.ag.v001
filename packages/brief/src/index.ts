import { Result, ok, err } from '@meridian/core';
import { EdgeOpportunity } from '@meridian/edge';
import { CitationVerifier } from '@meridian/council';

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

export class BriefEngine {
  /**
   * Generates the Daily Executive Brief.
   * MANDATORY: Verifies that every claim in the synthesis carries explicit observation citations.
   */
  public generateBrief(input: ExecutiveBriefInput): Result<ExecutiveBrief> {
    const validObsIds = new Set<string>();

    for (const opp of input.topEdgeOpportunities) {
      for (const obs of opp.attachedObservations) {
        validObsIds.add(obs.id);
      }
    }

    const citationResult = CitationVerifier.verify(input.councilSynthesisClaims, validObsIds);

    if (!citationResult.passed && citationResult.uncitedClaims.length > 0) {
      return err(new Error(
        `MERIDIAN Brief Integrity Error: Generated brief contains ${citationResult.uncitedClaims.length} uncited factual claim(s): "${citationResult.uncitedClaims[0]}". Uncited claims are prohibited.`
      ));
    }

    const now = new Date().toISOString();
    return ok({
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
