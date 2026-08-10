const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'terminal', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('=== LATEST CYCLE LOGS (LAST 15) ===');
  const logs = await client.query(`
    SELECT id, cycle_id, instrument, action, reason, created_at
    FROM meridian.cycle_log
    ORDER BY created_at DESC
    LIMIT 15;
  `);
  console.table(logs.rows);

  console.log('=== LATEST GATE DECISIONS (LAST 10) ===');
  const decisions = await client.query(`
    SELECT id, instrument, direction, units, approved, reason_code, evaluated_at
    FROM meridian.gate_decisions
    ORDER BY evaluated_at DESC
    LIMIT 10;
  `);
  console.table(decisions.rows);

  await client.end();
}

main().catch(err => console.error(err));
