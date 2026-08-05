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
const sb = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

async function run() {
  // Verification Gate e & f: Read state and gate decisions after running run-cycle route
  console.log('--- VERIFICATION GATE e: Checking mode in autotrader_state ---');
  const { data: stateData, error: stateErr } = await sb
    .schema('meridian')
    .from('autotrader_state')
    .select('*')
    .eq('id', 'singleton')
    .single();

  console.log('autotrader_state singleton row:', JSON.stringify(stateData, null, 2));

  console.log('\n--- VERIFICATION GATE f: SELECT from meridian.gate_decisions ---');
  const { data: gateData, error: gateErr } = await sb
    .schema('meridian')
    .from('gate_decisions')
    .select('*')
    .order('evaluated_at', { ascending: false })
    .limit(10);

  console.log('gate_decisions rows:', JSON.stringify(gateData, null, 2));
}

run().catch(console.error);
