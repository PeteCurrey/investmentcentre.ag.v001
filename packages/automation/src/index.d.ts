import { Observation, Result, Price } from '@meridian/core';
import { RiskProfile, AccountRiskState, OrderIntent } from '@meridian/risk';
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
export declare class AutomationEngine {
    private enableTier4Execution;
    constructor(enableTier4Execution?: boolean);
    setTier4Enabled(enabled: boolean): void;
    isTier4Enabled(): boolean;
    processWatch(rule: AutomationRule, obs: Observation): WatchAlert;
    processResearch(rule: AutomationRule, obs: Observation, relatedObs: Observation[]): ResearchDossier;
    processPrepare(rule: AutomationRule, obs: Observation): PreparedTicket;
    processExecute(ticket: PreparedTicket, profile: RiskProfile | undefined, accountState: AccountRiskState, broker: BrokerAdapter): Promise<Result<BrokerOrder>>;
}
//# sourceMappingURL=index.d.ts.map