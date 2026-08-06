/**
 * GET /api/autotrader/health
 *
 * Returns the time since the last successful cycle and the last cycle summary.
 * Used by the console layout health indicator visible on every console page.
 *
 * "Successful" means the cycle completed evaluation (even if all instruments
 * were SKIPPED or NEUTRAL) — i.e. its last cycle_log row is NOT action=FAILED.
 *
 * A 7-hour gap between "last successful" and now means something is broken,
 * not that "there were no signals today".
 */

import { NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/auth';
import { readCycleHealth } from '@meridian/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const health = await readCycleHealth();

  const now = Date.now();
  const lastSuccessMs = health.lastSuccessfulAt ? new Date(health.lastSuccessfulAt).getTime() : null;
  const lastCycleMs = health.lastCycleAt ? new Date(health.lastCycleAt).getTime() : null;

  const secondsSinceSuccess = lastSuccessMs !== null ? Math.floor((now - lastSuccessMs) / 1000) : null;
  const secondsSinceLastCycle = lastCycleMs !== null ? Math.floor((now - lastCycleMs) / 1000) : null;

  // Stale thresholds: warn after 3 minutes (3 missed cycles), critical after 10 minutes
  const status =
    secondsSinceSuccess === null ? 'UNKNOWN' :
    secondsSinceSuccess > 600 ? 'CRITICAL' :
    secondsSinceSuccess > 180 ? 'STALE' :
    health.lastCycleFailed ? 'FAILED' :
    'OK';

  return NextResponse.json({
    success: true,
    status,
    lastSuccessfulAt: health.lastSuccessfulAt,
    lastCycleAt: health.lastCycleAt,
    lastAction: health.lastAction,
    lastReason: health.lastReason,
    lastCycleFailed: health.lastCycleFailed,
    secondsSinceSuccess,
    secondsSinceLastCycle,
  });
}
