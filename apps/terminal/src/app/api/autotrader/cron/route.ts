/**
 * GET /api/autotrader/cron
 *
 * Vercel Cron endpoint — fires every minute as defined in vercel.json.
 * Vercel injects an "Authorization: Bearer <CRON_SECRET>" header automatically.
 * This handler verifies that secret, then calls runCycle() directly.
 *
 * IMPORTANT: This endpoint calls runCycle() directly (not via HTTP fetch).
 * A serverless function must not fetch itself: VERCEL_URL resolves to the
 * deployment URL and Vercel Deployment Protection blocks such self-calls.
 *
 * This endpoint is NOT protected by session cookie. It is protected by the
 * CRON_SECRET env var with constant-time comparison. Never expose CRON_SECRET.
 *
 * This endpoint is allowlisted in middleware.ts (no session required).
 * The UI must NOT call this endpoint — it is for Vercel cron only.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { runCycle } from '../run-cycle/cycle';

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

  // ── 2. Run cycle directly (no internal HTTP self-fetch) ───────────────────
  try {
    const result = await runCycle();
    return NextResponse.json({ cronInvoked: true, cycleResult: result }, {
      status: result.success ? 200 : (result.reason === 'CYCLE_IN_FLIGHT' ? 409 : 503),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Cron cycle failed: ${msg}` },
      { status: 500 }
    );
  }
}
