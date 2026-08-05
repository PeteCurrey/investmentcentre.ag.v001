const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

const dbUrl = envVars['SUPABASE_URL'];
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();

  console.log('--- VERIFICATION GATE a: 5 New Tables in Meridian Schema ---');
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'meridian'
    ORDER BY table_name;
  `);
  console.log(JSON.stringify(tables.rows, null, 2));

  console.log('\n--- VERIFICATION GATE a: Constraints in Meridian Schema ---');
  const constraints = await client.query(`
    SELECT r.relname AS table_name, c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS constraint_definition
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'meridian'
    ORDER BY r.relname, c.conname;
  `);
  console.log(JSON.stringify(constraints.rows, null, 2));

  console.log('\n--- VERIFICATION GATE b: OBSERVE -> LIVE Constraint Violation Error ---');
  try {
    await client.query(`
      INSERT INTO meridian.mode_transitions (from_mode, to_mode, actor, reason)
      VALUES ('OBSERVE', 'LIVE', 'test_actor', 'test_observe_to_live');
    `);
  } catch (err) {
    console.log('CONSTRAINT VIOLATION ERROR VERBATIM:');
    console.log(err.message);
  }

  console.log('\n--- VERIFICATION GATE e & f: autotrader_state and gate_decisions ---');
  const stateRes = await client.query('SELECT * FROM meridian.autotrader_state;');
  console.log('autotrader_state row:', JSON.stringify(stateRes.rows, null, 2));

  const gateRes = await client.query('SELECT * FROM meridian.gate_decisions ORDER BY id DESC LIMIT 5;');
  console.log('gate_decisions rows:', JSON.stringify(gateRes.rows, null, 2));

  await client.end();
}

run().catch(console.error);
