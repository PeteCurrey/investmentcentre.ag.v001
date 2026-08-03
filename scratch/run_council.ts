import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
  console.log('[env] Loaded .env.local');
} catch { console.warn('[env] No .env.local found'); }

import { CouncilOrchestrator } from '../packages/council/src/index';

async function main() {
  const now = new Date().toISOString();
  const observations = [
    { id: 'obs_fred_fedfunds_001', source_id: 'fred', pillar: 'WORLD', metric: 'macro.fred.fedfunds', value_text: '5.25', value_scale: 2, unit: '%', staleness_seconds: 86000, confidence: 100, captured_at: now, source_timestamp: now, licence_class: 'REDISTRIBUTABLE_PUBLIC', redistributable: true, raw_ref: 'r2://fred/fedfunds/2026-08-03' },
    { id: 'obs_twelve_data_gbpusd_001', source_id: 'twelve_data', pillar: 'MARKETS', metric: 'markets.twelve_data.price.GBP_USD', value_text: '1.2847', value_scale: 4, unit: 'USD', staleness_seconds: 300, confidence: 99, captured_at: now, source_timestamp: now, licence_class: 'COMMERCIAL_THIRD_PARTY', redistributable: false, raw_ref: 'r2://twelve_data/gbpusd/2026-08-03' },
    { id: 'obs_kalshi_fed_cut_001', source_id: 'kalshi', pillar: 'ALTERNATIVES', metric: 'alternatives.kalshi.fed_cut_sept_2026', value_text: '0.42', value_scale: 2, unit: 'probability', staleness_seconds: 120, confidence: 95, captured_at: now, source_timestamp: now, licence_class: 'REDISTRIBUTABLE_PUBLIC', redistributable: true, raw_ref: 'r2://kalshi/fed_cut_sept/2026-08-03' },
    { id: 'obs_cftc_cot_gbp_001', source_id: 'cftc_cot', pillar: 'MARKETS', metric: 'markets.cftc_cot.gbp_net_speculative', value_text: '28450', value_scale: 0, unit: 'contracts', staleness_seconds: 200000, confidence: 98, captured_at: now, source_timestamp: now, licence_class: 'REDISTRIBUTABLE_PUBLIC', redistributable: true, raw_ref: 'r2://cftc_cot/gbp_net/2026-08-03' }
  ];

  const input = {
    instrument: 'GBP/USD',
    pillarContext: 'MARKETS',
    observationsSnapshot: observations,
    deltasSnapshot: [],
    thesesSnapshot: [{ id: 'thesis_001', text: 'GBP/USD to break 1.30 on BoE rate divergence from Fed', falsificationConditions: 'Fed cuts before BoE or UK CPI prints above 4.5%' }]
  };

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('MERIDIAN Council — Live Multi-Model Evaluation');
  console.log(`Instrument: ${input.instrument} | Observations: ${observations.length}`);
  console.log(`Obs IDs: ${observations.map((o: any) => o.id).join(', ')}`);
  console.log('══════════════════════════════════════════════════════════\n');

  const orchestrator = new CouncilOrchestrator();
  const status = orchestrator.getModelStatus();
  console.log('Model Status:', JSON.stringify(status, null, 2));
  const configured = Object.values(status).filter(Boolean).length;
  if (configured === 0) { console.error('\n[ERROR] No API keys found.\n'); process.exit(1); }
  console.log(`\n[Council] Running with ${configured}/3 providers...\n`);

  const start = Date.now();
  const result = await orchestrator.evaluate(input as any);
  const elapsed = Date.now() - start;
  if (!result.success) { console.error('[ERROR]', (result as any).error); process.exit(1); }
  const c = result.value;

  console.log(`══ CONSENSUS ══`);
  console.log(`Instrument:  ${c.instrument} | ${c.timestamp}`);
  console.log(`Elapsed:     ${elapsed}ms | Cached: ${c.cached}`);
  console.log(`Token Cost:  $${c.tokenSpendEstUsd}  ← from real API usage field`);
  console.log(`Agreement:   ${c.overallAgreementScore}/100 | Disagreement: ${c.hasDisagreement}\n`);

  for (const op of c.opinions) {
    console.log(`── ${op.role} (${op.modelName} / ${op.provider})`);
    console.log(`   Conviction:    ${op.conviction}/100`);
    console.log(`   Agree Score:   ${op.agreeScore}/100`);
    console.log(`   Citations:     ${op.citations.length > 0 ? op.citations.join(', ') : '(none)'}`);
    console.log(`   Invalidations: ${op.invalidations.slice(0, 2).join(' | ')}`);
    console.log(`   Summary:       ${op.summary.slice(0, 300)}`);
    console.log();
  }

  const validIds = new Set(observations.map((o: any) => o.id));
  console.log(`══ Citation Resolution ══`);
  for (const op of c.opinions) {
    const valid = op.citations.filter((x: string) => validIds.has(x));
    const invalid = op.citations.filter((x: string) => !validIds.has(x));
    console.log(`${op.role}: ${valid.length} valid citation(s)${invalid.length ? ` | ${invalid.length} INVALID: ${invalid.join(', ')}` : ''}`);
  }

  console.log(`\n══ Adversary Pass (real obs telemetry) ══`);
  const adv = c.adversaryResult;
  console.log(`Thesis:        ${adv.thesisTitle}`);
  console.log(`Attack Vector: ${adv.attackVector}`);
  console.log(`Flaw:          ${adv.flawIdentified}`);
  console.log(`Severity:      ${adv.severity} | Survived: ${adv.survived}`);
  console.log(`Counter-Args:  ${adv.counterArguments.join(' | ')}`);
  console.log(`Attacked At:   ${adv.attackedAt}`);
  console.log('\n══════════════════════════════════════════════════════════');
}

main().catch(console.error);

