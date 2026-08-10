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

  console.log('=== gate_decisions columns ===');
  const gd = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'meridian' AND table_name = 'gate_decisions'
    ORDER BY ordinal_position;
  `);
  console.table(gd.rows);

  console.log('\n=== risk_profile_changes columns ===');
  const rpc = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'meridian' AND table_name = 'risk_profile_changes'
    ORDER BY ordinal_position;
  `);
  console.table(rpc.rows);

  await client.end();
}

main().catch(err => console.error(err));
