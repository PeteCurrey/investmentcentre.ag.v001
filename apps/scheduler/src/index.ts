import { createLogger, readAutotraderConfig } from '@meridian/core';
import { runCycle } from '../../../apps/terminal/src/app/api/autotrader/run-cycle/cycle';
import fs from 'fs';
import path from 'path';

const log = createLogger('Scheduler');

// ── Env loader ───────────────────────────────────────────────────────────────

function loadEnv() {
  const rootEnvPath = path.join(__dirname, '../../../.env.local');
  if (fs.existsSync(rootEnvPath)) {
    const content = fs.readFileSync(rootEnvPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (key && val && !process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();
log.info('MERIDIAN Autonomous Trading Scheduler initialized (Postgres Engine Bridge)');

async function runAutonomousCycle() {
  try {
    const config = await readAutotraderConfig();
    if (!config || !config.enabled) {
      log.info('Autonomous engine is PAUSED or disabled in database — skipping cycle');
      return;
    }

    log.info('Running autonomous autotrader cycle via core engine...');
    const result = await runCycle();
    log.info('Cycle execution completed', { success: result.success, mode: result.mode, reason: result.reason });
  } catch (e: any) {
    log.error('Scheduler cycle error', { error: e.message || String(e) });
  }
}

// ── Scheduler loop ────────────────────────────────────────────────────────────

runAutonomousCycle();
setInterval(() => { runAutonomousCycle(); }, 60000);

