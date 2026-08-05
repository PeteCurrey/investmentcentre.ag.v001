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
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL!');

  console.log('Exposing meridian schema in PostgREST config...');
  await client.query("ALTER ROLE authenticator SET pgrst.db_schemas = 'public, meridian';");
  await client.query("NOTIFY pgrst, 'reload config';");
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log('PostgREST config reload notified!');

  await client.end();
}

run().catch(console.error);
