import fs from 'fs';
import path from 'path';

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
if (process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

import { randomUUID } from 'crypto';

async function main() {
  const { runCycle } = await import('../apps/terminal/src/app/api/autotrader/run-cycle/cycle');
  console.log('=== RUNNING SINGLE AUTOTRADER CYCLE ===');
  const result = await runCycle(randomUUID());
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(err => console.error(err));
