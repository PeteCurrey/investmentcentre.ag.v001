/**
 * POST /api/autotrader/toggle-enabled
 *
 * Dedicated endpoint for toggling the algo trading kill switch (`enabled`).
 * Completely orthogonal to mode. Never requests mode transitions.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/auth';
import { writeAutotraderEnabled, readAutotraderConfig } from '@meridian/core';

export async function POST(request: Request) {
  let sessionPayload;
  try {
    sessionPayload = await requireSession();
  } catch {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED: Valid session authentication required.' },
      { status: 401 }
    );
  }

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'INVALID_JSON: Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'INVALID_PARAMS: "enabled" must be a boolean.' },
      { status: 400 }
    );
  }

  const actor = sessionPayload.sub || 'user';
  const ok = await writeAutotraderEnabled(body.enabled, actor);

  if (!ok) {
    return NextResponse.json(
      { success: false, error: 'TOGGLE_FAILED: Failed to update autotrader enabled state.' },
      { status: 500 }
    );
  }

  const config = await readAutotraderConfig();

  return NextResponse.json({
    success: true,
    enabled: config?.enabled ?? body.enabled,
    mode: config?.mode ?? 'OBSERVE',
    config,
  });
}
