#!/usr/bin/env node
/**
 * scripts/apply-migrations.js
 *
 * Applies all SQL migration files in infra/supabase/migrations/ to the
 * production Supabase database in chronological order (filename-sorted).
 *
 * Uses SUPABASE_URL from .env.local (must be a postgresql:// connection string).
 *
 * Each migration file is applied in a transaction. If a migration fails,
 * the script exits non-zero and reports which file failed.
 *
 * Idempotency: IF NOT EXISTS guards in migration files prevent re-application
 * from causing errors. The script always attempts all files.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually load .env.local without requiring the dotenv package
const envPath = path.join(__dirname, '..', '.env.local');
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
  if (!connectionString || !connectionString.startsWith('postgresql://')) {
    console.error('ERROR: SUPABASE_URL must be a postgresql:// connection string in .env.local');
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, '..', 'infra', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // lexicographic = chronological given the timestamp prefix

  console.log(`Found ${files.length} migration file(s):`);
  files.forEach(f => console.log(`  - ${f}`));

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('\nConnected to database.\n');

  let applied = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file}...`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`  ✓ Applied.`);
      applied++;
    } catch (err) {
      await client.query('ROLLBACK');
      const msg = err.message || String(err);
      // IF NOT EXISTS makes most migrations idempotent — "already exists" is not an error
      if (msg.includes('already exists')) {
        console.log(`  ↳ Skipped (object already exists — migration was previously applied).`);
        skipped++;
      } else {
        console.error(`  ✗ FAILED: ${msg}`);
        errors.push({ file, error: msg });
      }
    }
  }

  await client.end();

  console.log(`\nSummary: ${applied} applied, ${skipped} skipped (already applied), ${errors.length} failed.`);
  if (errors.length > 0) {
    console.error('Failures:');
    errors.forEach(e => console.error(`  ${e.file}: ${e.error}`));
    process.exit(1);
  }
  console.log('All migrations applied successfully.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
