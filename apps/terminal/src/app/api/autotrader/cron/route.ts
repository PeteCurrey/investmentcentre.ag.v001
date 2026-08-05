/**
 * GET /api/autotrader/cron
 *
 * Vercel Cron endpoint — fires every minute as defined in vercel.json.
 * Vercel injects an "Authorization: Bearer <CRON_SECRET>" header automatically.
 * This handler verifies that secret, then delegates to the core run-cycle logic.
 *
 * This endpoint is NOT protected by session cookie. It is protected by the
 * CRON_SECRET env var. Never expose CRON_SECRET publicly.
 *
 * The UI (trade/page.tsx) must NOT call this endpoint. It is for Vercel cron only.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // ── 1. Authenticate cron secret ───────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on this server.' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // Constant-time comparison to prevent timing attacks
  let valid = false;
  try {
    const expected = Buffer.from(cronSecret);
    const provided = Buffer.from(providedToken);
    valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // ── 2. Delegate to run-cycle via internal server-side call ────────────────
  // We call the run-cycle route using the CRON_SECRET as a special internal marker
  // rather than re-implementing cycle logic here, keeping a single execution path.
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`;

    const res = await fetch(`${baseUrl}/api/autotrader/run-cycle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Cron-internal auth header — run-cycle checks this to bypass session requirement
        'x-cron-secret': cronSecret,
      },
    });

    const data = await res.json();
    return NextResponse.json({ cronInvoked: true, cycleResult: data }, { status: res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Cron cycle invocation failed: ${msg}` }, { status: 502 });
  }
}
