"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationEngine = void 0;
const core_1 = require("@meridian/core");
const risk_1 = require("@meridian/risk");
class AutomationEngine {
    enableTier4Execution = false; // Tier 4 EXECUTE ships config-disabled by default
    constructor(enableTier4Execution = false) {
        this.enableTier4Execution = enableTier4Execution;
    }
    setTier4Enabled(enabled) {
        this.enableTier4Execution = enabled;
    }
    isTier4Enabled() {
        return this.enableTier4Execution;
    }
    processWatch(rule, obs) {
        return {
            ruleId: rule.id,
            observationId: obs.id,
            message: `[TIER 1 WATCH ALERT] Rule '${rule.name}' triggered on ${obs.metric} value ${obs.value_text || obs.value_numeric}`,
            alertedAt: new Date().toISOString()
        };
    }
    processResearch(rule, obs, relatedObs) {
        const citations = [obs.id, ...relatedObs.map(o => o.id)];
        return {
            ruleId: rule.id,
            triggerObservation: obs,
            gatheredObservations: [obs, ...relatedObs],
            citations,
            compiledAt: new Date().toISOString()
        };
    }
    processPrepare(rule, obs) {
        const now = new Date().toISOString();
        const intent = {
            id: `intent_${Date.now()}`,
            accountId: 'acc_meridian_primary',
            instrument: rule.targetInstrument,
            direction: rule.direction,
            units: 10000n,
            entryPrice: rule.entryPrice,
            stopLossPrice: rule.stopLossPrice,
            takeProfitPrice: rule.takeProfitPrice,
            requestedAt: now
        };
        const opportunity = {
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
    async processExecute(ticket, profile = risk_1.FTMO_STANDARD_PROFILE, accountState, broker) {
        // SECURITY GUARD 1: Config-disabled check
        if (!this.enableTier4Execution) {
            return (0, core_1.err)(new Error('MERIDIAN Automation Protection: Tier 4 (EXECUTE) is config-disabled. ' +
                'Automated live order dispatch requires deliberate human enable configuration.'));
        }
        // SECURITY GUARD 2: Must evaluate through RiskGate
        const decision = risk_1.RiskGate.evaluate(ticket.orderIntent, profile, accountState);
        if (!decision.approved || !decision.token) {
            return (0, core_1.err)(new Error(`RiskGate Rejected Order Execution: ${decision.reasonCode}`));
        }
        // SECURITY GUARD 3: Pass ApprovalToken to BrokerAdapter boundary
        return await broker.submitOrder(ticket.orderIntent, decision.token);
    }
}
exports.AutomationEngine = AutomationEngine;
//# sourceMappingURL=index.js.map