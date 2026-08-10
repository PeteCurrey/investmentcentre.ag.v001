/**
 * scratch/add_xau_crosses.js
 * One-time script to add XAU/GBP, XAU/EUR, XAU/CAD, XAU/AUD to selected_instruments
 * in meridian.autotrader_state.
 */
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

  // Read current selected instruments
  const current = await client.query(`
    SELECT selected_instruments FROM meridian.autotrader_state LIMIT 1;
  `);
  const existing = current.rows[0]?.selected_instruments ?? [];
  console.log('Current selected_instruments:', existing);

  const toAdd = ['XAU/GBP', 'XAU/EUR', 'XAU/CAD', 'XAU/AUD'];
  const merged = [...new Set([...existing, ...toAdd])];
  console.log('Updated selected_instruments:', merged);

  await client.query(`
    UPDATE meridian.autotrader_state
    SET selected_instruments = $1, updated_at = now(), updated_by = 'system:add_xau_crosses'
    WHERE id = (SELECT id FROM meridian.autotrader_state LIMIT 1);
  `, [merged]);

  console.log('✅ Done. Verifying...');
  const verify = await client.query(`SELECT selected_instruments FROM meridian.autotrader_state LIMIT 1;`);
  console.log('Confirmed:', verify.rows[0].selected_instruments);

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
