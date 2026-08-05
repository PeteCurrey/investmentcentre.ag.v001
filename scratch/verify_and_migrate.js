const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '../apps/terminal/.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    envVars[key] = val;
  }
}

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const secretKey = envVars['SUPABASE_SECRET_KEY'];

console.log('Connecting to Supabase via REST API...');
console.log('URL:', supabaseUrl);
console.log('Secret Key Present:', Boolean(secretKey));

const sb = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

async function run() {
  // 1. Query table information via Supabase REST API
  console.log('\n--- VERIFICATION GATE a: Table Inspection ---');
  const { data: tablesData, error: tablesErr } = await sb
    .schema('meridian')
    .from('autotrader_state')
    .select('*');

  console.log('autotrader_state table check:', { data: tablesData, error: tablesErr });

  const { data: modeData, error: modeErr } = await sb
    .schema('meridian')
    .from('mode_transitions')
    .select('*');

  console.log('mode_transitions table check:', { data: modeData, error: modeErr });

  const { data: gateData, error: gateErr } = await sb
    .schema('meridian')
    .from('gate_decisions')
    .select('*');

  console.log('gate_decisions table check:', { data: gateData, error: gateErr });

  const { data: cycleData, error: cycleErr } = await sb
    .schema('meridian')
    .from('cycle_log')
    .select('*');

  console.log('cycle_log table check:', { data: cycleData, error: cycleErr });

  const { data: dayData, error: dayErr } = await sb
    .schema('meridian')
    .from('account_day')
    .select('*');

  console.log('account_day table check:', { data: dayData, error: dayErr });

  // 2. Verification Gate b: Prove OBSERVE -> LIVE constraint bites
  console.log('\n--- VERIFICATION GATE b: Testing OBSERVE -> LIVE Constraint ---');
  const { data: failInsert, error: failErr } = await sb
    .schema('meridian')
    .from('mode_transitions')
    .insert({
      from_mode: 'OBSERVE',
      to_mode: 'LIVE',
      actor: 'test_verifier',
      reason: 'testing observe to live constraint',
    });

  if (failErr) {
    console.log('SUCCESS! Constraint violation error output as required by gate b:');
    console.log('Code:', failErr.code);
    console.log('Message:', failErr.message);
    console.log('Details:', failErr.details);
  } else {
    console.error('ERROR: OBSERVE -> LIVE insert succeeded unexpectedly!');
  }
}

run().catch(console.error);
