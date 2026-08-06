/**
 * POST /api/autotrader/mode-transition
 *
 * Guarded API endpoint for autotrader mode state machine transitions.
 *
 * Security Controls:
 *   1. Session Auth: requireSession() authentication.
 *   2. Parameter Validation: requires non-empty `from`, `to`, and `reason` strings.
 *   3. OBSERVE->LIVE Block: Explicitly rejects OBSERVE->LIVE at the API layer before calling requestTransition.
 *   4. Legal Set Check: Enforces legal transition graph (OBSERVE↔PAPER, PAPER↔LIVE, LIVE→OBSERVE).
 *   5. DB Audit Logging: Appends to meridian.mode_transitions before updating meridian.autotrader_state.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/auth';
import { requestTransition, readAutotraderConfig, AutotraderMode } from '@meridian/core';

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

  let body: { from?: string; to?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'INVALID_JSON: Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { from, to, reason } = body;

  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return NextResponse.json(
      { success: false, error: 'INVALID_PARAMS: "from" and "to" parameters are required.' },
      { status: 400 }
    );
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'REASON_REQUIRED: A non-empty reason string is required for mode transitions.' },
      { status: 400 }
    );
  }

  const fromMode = from.toUpperCase() as AutotraderMode;
  const toMode = to.toUpperCase() as AutotraderMode;

  const validModes: AutotraderMode[] = ['OBSERVE', 'PAPER', 'LIVE'];
  if (!validModes.includes(fromMode) || !validModes.includes(toMode)) {
    return NextResponse.json(
      { success: false, error: `INVALID_MODE: Modes must be one of [${validModes.join(', ')}].` },
      { status: 400 }
    );
  }

  // API-LAYER GUARD: Reject OBSERVE -> LIVE explicitly before DB evaluation
  if (fromMode === 'OBSERVE' && toMode === 'LIVE') {
    return NextResponse.json(
      {
        success: false,
        error: 'OBSERVE_TO_LIVE_FORBIDDEN: Direct transition from OBSERVE to LIVE is strictly prohibited. Transition via PAPER mode first.',
      },
      { status: 400 }
    );
  }

  const actor = sessionPayload.sub || 'user';
  const result = await requestTransition(fromMode, toMode, actor, reason.trim());

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error || 'TRANSITION_FAILED: Database transition rejected.' },
      { status: 400 }
    );
  }

  const updatedConfig = await readAutotraderConfig();

  return NextResponse.json({
    success: true,
    mode: updatedConfig?.mode ?? toMode,
    config: updatedConfig,
  });
}
