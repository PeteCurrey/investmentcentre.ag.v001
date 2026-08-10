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
  const connectionString = process.env.SUPABASE_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('====================================================');
  console.log('1. CURRENT STATE IN DB');
  console.log('====================================================');
  const stateRes = await client.query(`SELECT * FROM meridian.autotrader_state WHERE id = 'singleton'`);
  console.log(JSON.stringify(stateRes.rows[0], null, 2));

  console.log('\n====================================================');
  console.log('2. CYCLE_LOG COUNT BY ACTION IN LAST 6 HOURS');
  console.log('====================================================');
  const actionCountRes = await client.query(`
    SELECT action, count(*), max(created_at) as latest
    FROM meridian.cycle_log
    WHERE created_at >= (now() - interval '6 hours')
    GROUP BY action;
  `);
  console.table(actionCountRes.rows);

  console.log('\n====================================================');
  console.log('3. LATEST 20 CYCLE_LOG ROWS');
  console.log('====================================================');
  const latestCyclesRes = await client.query(`
    SELECT cycle_id, instrument, action, reason, created_at
    FROM meridian.cycle_log
    ORDER BY created_at DESC
    LIMIT 20;
  `);
  console.table(latestCyclesRes.rows);

  console.log('\n====================================================');
  console.log('4. GATE DECISIONS IN LAST 6 HOURS');
  console.log('====================================================');
  const gateRes = await client.query(`
    SELECT cycle_id, instrument, decision, reason_code, reason_detail, created_at
    FROM meridian.gate_decisions
    WHERE created_at >= (now() - interval '6 hours')
    ORDER BY created_at DESC
    LIMIT 20;
  `);
  console.table(gateRes.rows);

  await client.end();
}

main().catch(err => console.error(err));
