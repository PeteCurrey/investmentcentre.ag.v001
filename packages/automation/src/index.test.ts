import { describe, it, expect } from 'vitest';
import { AutomationEngine, AutomationRule } from './index';
import { Pillar, Observation, toScaledInteger } from '@meridian/core';
import { PaperBroker } from '@meridian/execute';
import { AccountRiskState, FTMO_STANDARD_PROFILE } from '@meridian/risk';

describe('packages/automation (4-Tier Automation Engine)', () => {
  const dummyObs: Observation = {
    id: 'obs_trigger_1',
    source_id: 'fred',
    entity_id: null,
    pillar: Pillar.WORLD,
    metric: 'macro.fred.fedfunds',
    value_numeric: toScaledInteger(525n),
    value_scale: 2,
    value_text: '5.25',
    unit: '%',
    source_timestamp: new Date().toISOString(),
    captured_at: new Date().toISOString(),
    staleness_seconds: 10,
    confidence: 100,
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    raw_ref: 'r2://ref'
  };

  const watchRule: AutomationRule = {
    id: 'rule_watch_1',
    name: 'Fed Funds Threshold Watch',
    triggerMetric: 'macro.fred.fedfunds',
    tier: '1_WATCH',
    enabled: true,
    targetInstrument: 'GBP_USD',
    direction: 'BUY',
    stopLossPrice: toScaledInteger(13000n)
  };

  it('runs Tier 1 WATCH and generates alert', () => {
    const engine = new AutomationEngine(false);
    const alert = engine.processWatch(watchRule, dummyObs);
    expect(alert.ruleId).toBe(watchRule.id);
    expect(alert.message).toMatch(/TIER 1 WATCH ALERT/);
  });

  it('runs Tier 2 RESEARCH and compiles dossier with verified citations', () => {
    const engine = new AutomationEngine(false);
    const dossier = engine.processResearch(watchRule, dummyObs, []);
    expect(dossier.ruleId).toBe(watchRule.id);
    expect(dossier.citations).toContain('obs_trigger_1');
  });

  it('runs Tier 3 PREPARE and constructs trade ticket without sending to broker', () => {
    const engine = new AutomationEngine(false);
    const ticket = engine.processPrepare(watchRule, dummyObs);
    expect(ticket.ruleId).toBe(watchRule.id);
    expect(ticket.orderIntent.instrument).toBe('GBP_USD');
    expect(ticket.opportunity.attachedObservations.length).toBe(1);
  });

  it('rejects Tier 4 EXECUTE when config-disabled by default', async () => {
    const engine = new AutomationEngine(false); // Tier 4 disabled!
    const ticket = engine.processPrepare(watchRule, dummyObs);
    const broker = new PaperBroker();

    const state: AccountRiskState = {
      accountId: 'acc_meridian_primary',
      startingDailyBalance: toScaledInteger(10000000n),
      currentEquity: toScaledInteger(10000000n),
      highWaterMark: toScaledInteger(10000000n),
      openPositionCount: 0,
      realizedPnlToday: 0n as any,
      unrealizedPnl: 0n as any,
      isNewsBlackoutActive: false
    };

    const res = await engine.processExecute(ticket, FTMO_STANDARD_PROFILE, state, broker);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toMatch(/Tier 4 \(EXECUTE\) is config-disabled/);
    }
  });

  it('executes Tier 4 order through RiskGate when explicitly enabled', async () => {
    const engine = new AutomationEngine(true); // Tier 4 explicitly enabled!
    const ticket = engine.processPrepare(watchRule, dummyObs);
    const broker = new PaperBroker();

    const state: AccountRiskState = {
      accountId: 'acc_meridian_primary',
      startingDailyBalance: toScaledInteger(10000000n),
      currentEquity: toScaledInteger(10000000n),
      highWaterMark: toScaledInteger(10000000n),
      openPositionCount: 0,
      realizedPnlToday: 0n as any,
      unrealizedPnl: 0n as any,
      isNewsBlackoutActive: false
    };

    const res = await engine.processExecute(ticket, FTMO_STANDARD_PROFILE, state, broker);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.status).toBe('FILLED');
    }
  });
});
