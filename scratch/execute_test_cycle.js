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

const { runCycle } = require('../apps/terminal/src/app/api/autotrader/run-cycle/cycle');

async function main() {
  console.log('=== RUNNING SINGLE AUTOTRADER CYCLE ===');
  const result = await runCycle(`manual-test-${Date.now()}`);
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(err => console.error(err));
