import { Observation, Result, ok, err, ScaledInteger, Price, createPrice, toScaledInteger } from '@meridian/core';
import { RiskGate, RiskProfile, AccountRiskState, OrderIntent, ApprovalToken, FTMO_STANDARD_PROFILE } from '@meridian/risk';
import { EdgeOpportunity } from '@meridian/edge';
import { BrokerAdapter, BrokerOrder } from '@meridian/execute';

export type AutomationTier = '1_WATCH' | '2_RESEARCH' | '3_PREPARE' | '4_EXECUTE';

export interface AutomationRule {
  id: string;
  name: string;
  triggerMetric: string;
  tier: AutomationTier;
  enabled: boolean;
  targetInstrument: string;
  direction: 'BUY' | 'SELL';
  entryPrice: Price;
  stopLossPrice: Price;
  takeProfitPrice?: Price;
}

export interface WatchAlert {
  ruleId: string;
  observationId: string;
  message: string;
  alertedAt: string;
}

export interface ResearchDossier {
  ruleId: string;
  triggerObservation: Observation;
  gatheredObservations: Observation[];
  citations: string[];
  compiledAt: string;
}

export interface PreparedTicket {
  ruleId: string;
  orderIntent: OrderIntent;
  opportunity: EdgeOpportunity;
  preparedAt: string;
}

export class AutomationEngine {
  private enableTier4Execution: boolean = false; // Tier 4 EXECUTE ships config-disabled by default

  constructor(enableTier4Execution = false) {
    this.enableTier4Execution = enableTier4Execution;
  }

  public setTier4Enabled(enabled: boolean): void {
    this.enableTier4Execution = enabled;
  }

  public isTier4Enabled(): boolean {
    return this.enableTier4Execution;
  }

  public processWatch(rule: AutomationRule, obs: Observation): WatchAlert {
    return {
      ruleId: rule.id,
      observationId: obs.id,
      message: `[TIER 1 WATCH ALERT] Rule '${rule.name}' triggered on ${obs.metric} value ${obs.value_text || obs.value_numeric}`,
      alertedAt: new Date().toISOString()
    };
  }

  public processResearch(rule: AutomationRule, obs: Observation, relatedObs: Observation[]): ResearchDossier {
    const citations = [obs.id, ...relatedObs.map(o => o.id)];
    return {
      ruleId: rule.id,
      triggerObservation: obs,
      gatheredObservations: [obs, ...relatedObs],
      citations,
      compiledAt: new Date().toISOString()
    };
  }

  public processPrepare(rule: AutomationRule, obs: Observation): PreparedTicket {
    const now = new Date().toISOString();
    const intent: OrderIntent = {
      id: `intent_${Date.now()}`,
      accountId: 'acc_meridian_primary',
      instrument: rule.targetInstrument,
      direction: rule.direction,
      units: 10000n as ScaledInteger,
      entryPrice: rule.entryPrice,
      stopLossPrice: rule.stopLossPrice,
      takeProfitPrice: rule.takeProfitPrice,
      requestedAt: now
    };

    const opportunity: EdgeOpportunity = {
      id: `edge_${Date.now()}`,
      instrument: rule.targetInstrument,
      assetClass: 'FX',
      direction: rule.direction,
      convictionScore: 85,
      sizingRecommendedPct: 1.0,
      entryPrice: rule.entryPrice.price,
      stopLossPrice: rule.stopLossPrice.price,
      takeProfitPrice: rule.takeProfitPrice?.price,
      attachedObservations: [obs],
      adversarySurvived: true,
      correlationGroup: 'USD_SHORT_EXPOSURE',
      createdAt: now
    };

    return {
      ruleId: rule.id,
      orderIntent: intent,
      opportunity,
      preparedAt: now
    };
  }

  public async processExecute(
    ticket: PreparedTicket,
    profile: RiskProfile = FTMO_STANDARD_PROFILE,
    accountState: AccountRiskState,
    broker: BrokerAdapter
  ): Promise<Result<BrokerOrder>> {
    // SECURITY GUARD 1: Config-disabled check
    if (!this.enableTier4Execution) {
      return err(new Error(
        'MERIDIAN Automation Protection: Tier 4 (EXECUTE) is config-disabled. ' +
        'Automated live order dispatch requires deliberate human enable configuration.'
      ));
    }

    // SECURITY GUARD 2: Must evaluate through RiskGate
    const decision = RiskGate.evaluate(ticket.orderIntent, profile, accountState);
    if (!decision.approved || !decision.token) {
      return err(new Error(`RiskGate Rejected Order Execution: ${decision.reasonCode}`));
    }

    // SECURITY GUARD 3: Pass ApprovalToken to BrokerAdapter boundary
    return await broker.submitOrder(ticket.orderIntent, decision.token);
  }
}
