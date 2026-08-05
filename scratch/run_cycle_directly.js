const path = require('path');
const fs = require('fs');

// 1. Load env vars manually
const envPath = path.join(__dirname, '../apps/terminal/.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    process.env[key] = val;
  }
}

// 2. Intercept next/headers in require cache
require('next/headers');
const nextHeadersPath = require.resolve('next/headers');
require.cache[nextHeadersPath].exports.cookies = async () => ({
  get: (name) => (name === 'console_session' ? { value: 'active_session' } : undefined),
});

// 3. Register ts-node / tsx if importing .ts directly, or compile packages/core and route
const { POST } = require('../apps/terminal/src/app/api/autotrader/run-cycle/route.ts');
const { Client } = require('pg');

async function run() {
  console.log('Executing POST() from run-cycle/route.ts...');
  const res = await POST();
  const json = await res.json();

  console.log('\n======================================================');
  console.log('VERIFICATION GATE e: Response of POST /api/autotrader/run-cycle');
  console.log('======================================================');
  console.log(JSON.stringify(json, null, 2));

  console.log('\n======================================================');
  console.log('VERIFICATION GATE f: SELECT from meridian.gate_decisions');
  console.log('======================================================');
  const client = new Client({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const gateRes = await client.query('SELECT id, order_intent_id, instrument, direction, units, entry_price, approved, reason_code, evaluated_at FROM meridian.gate_decisions ORDER BY id DESC LIMIT 5;');
  console.log('Rows written to gate_decisions:');
  console.log(JSON.stringify(gateRes.rows, null, 2));

  const cycleRes = await client.query('SELECT id, cycle_id, instrument, action, reason, created_at FROM meridian.cycle_log ORDER BY id DESC LIMIT 5;');
  console.log('\nRows written to cycle_log:');
  console.log(JSON.stringify(cycleRes.rows, null, 2));

  await client.end();
}

run().catch(console.error);
