/**
 * POST /api/autotrader/run-cycle
 *
 * Session-authenticated manual cycle invocation.
 * The cycle body is in ./cycle.ts so it can also be called by
 * /api/autotrader/cron without an internal HTTP self-fetch.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/auth';
import { runCycle } from './cycle';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const result = await runCycle();

    if (!result.success && result.reason === 'CYCLE_IN_FLIGHT') {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 503,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? msg) : msg;
    // cycle.ts top-level catch already wrote the cycle_log FAILED row and
    // logged to structured output. This is a belt-and-suspenders fallback.
    return NextResponse.json(
      { success: false, error: msg, stack },
      { status: 500 }
    );
  }
}
