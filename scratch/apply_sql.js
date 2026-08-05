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
console.log('Connecting directly to Supabase Postgres (port 5432)...');

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL!');

  // 1. Ensure meridian schema exists
  await client.query('CREATE SCHEMA IF NOT EXISTS meridian;');

  // 2. Read and apply migration SQL
  const sqlPath = path.join(__dirname, '../infra/supabase/migrations/20260805000001_autotrader_supabase_state.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration SQL...');
  await client.query(sql);
  console.log('Migration SQL applied successfully!');

  // 3. Expose meridian schema permissions
  console.log('Exposing meridian schema to PostgREST roles...');
  await client.query('GRANT USAGE ON SCHEMA meridian TO anon, authenticated, service_role;');
  await client.query('GRANT ALL ON ALL TABLES IN SCHEMA meridian TO anon, authenticated, service_role;');
  await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA meridian TO anon, authenticated, service_role;');
  await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT ALL ON TABLES TO anon, authenticated, service_role;');
  await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;');

  // 4. Verification Gate a: Query info schema for the five tables
  console.log('\n======================================================');
  console.log('VERIFICATION GATE a: Table & Constraint Inspection');
  console.log('======================================================');
  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'meridian'
      AND table_name IN ('autotrader_state', 'mode_transitions', 'gate_decisions', 'cycle_log', 'account_day')
    ORDER BY table_name;
  `);
  console.log('Tables in meridian schema:', JSON.stringify(tablesRes.rows, null, 2));

  const constraintsRes = await client.query(`
    SELECT r.relname AS table_name, c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS constraint_definition
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'meridian'
    ORDER BY r.relname, c.conname;
  `);
  console.log('Constraints in meridian schema:', JSON.stringify(constraintsRes.rows, null, 2));

  // 5. Verification Gate b: Prove OBSERVE -> LIVE constraint bites
  console.log('\n======================================================');
  console.log('VERIFICATION GATE b: Testing OBSERVE -> LIVE Constraint');
  console.log('======================================================');
  try {
    await client.query(`
      INSERT INTO meridian.mode_transitions (from_mode, to_mode, actor, reason)
      VALUES ('OBSERVE', 'LIVE', 'test_actor', 'test_observe_to_live');
    `);
    console.error('ERROR: Constraint failed to block OBSERVE -> LIVE!');
  } catch (err) {
    console.log('CONSTRAINT VIOLATION ERROR VERBATIM (VERIFICATION GATE b SUCCESS):');
    console.log(err.message);
  }

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
