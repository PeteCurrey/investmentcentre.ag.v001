const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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
console.log('Connecting to Supabase Postgres to apply login rate limit migration...');

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected!');

  const sqlPath = path.join(__dirname, '../infra/supabase/migrations/20260805000002_login_rate_limit.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await client.query(sql);
  console.log('Applied migration SQL!');

  await client.query('GRANT ALL ON ALL TABLES IN SCHEMA meridian TO anon, authenticated, service_role;');
  await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA meridian TO anon, authenticated, service_role;');

  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'meridian'
      AND table_name = 'login_attempts';
  `);
  console.log('Table created:', JSON.stringify(tablesRes.rows, null, 2));

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
