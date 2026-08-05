import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  readAutotraderConfig,
  writeAutotraderConfig,
  AutotraderConfig,
  RiskProfileConfig,
} from '@meridian/core';
import { requestTransition, AutotraderMode } from '@meridian/core';

// ─── Types ─────────────────────────────────────────────────────────────────────
// Re-exported so the UI can import from a single location.
export type { AutotraderMode, AutotraderConfig, RiskProfileConfig };

async function auth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('console_session')?.value === 'active_session';
}

// ─── GET /api/autotrader ───────────────────────────────────────────────────────
export async function GET() {
  if (!(await auth())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const config = await readAutotraderConfig();

  if (!config) {
    return NextResponse.json(
      {
        success: false,
        error:
          'CONFIG_READ_FAILURE: Unable to read autotrader state from database. The engine is in OBSERVE mode by default.',
      },
      { status: 503 }
    );
  }

  // Auto-stop: if the stop schedule has passed, transition to OBSERVE.
  if (
    config.mode !== 'OBSERVE' &&
    config.autoStopAt &&
    new Date() >= new Date(config.autoStopAt)
  ) {
    const transitionResult = await requestTransition(
      config.mode,
      'OBSERVE',
      'system:auto-stop',
      `Auto-stop schedule reached at ${config.autoStopAt}`
    );
    if (transitionResult.ok) {
      const updated = await writeAutotraderConfig({
        autoStopAt: null,
        autoStopLabel: null,
        updatedBy: 'system:auto-stop',
      });
      return NextResponse.json({ success: true, ...(updated ?? config) });
    }
  }

  return NextResponse.json({ success: true, ...config });
}

// ─── POST /api/autotrader ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  if (!(await auth())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json() as {
    // Mode transition — if present, takes priority over all other fields.
    requestTransition?: {
      from: AutotraderMode;
      to: AutotraderMode;
      reason: string;
    };
    // Config updates
    selectedInstruments?: string[];
    lotUnits?: number;
    autoStopAt?: string | null;
    autoStopLabel?: string | null;
    riskProfile?: Partial<RiskProfileConfig>;
  };

  // Handle a mode transition request.
  if (body.requestTransition) {
    const { from, to, reason } = body.requestTransition;
    const cookieStore = await cookies();
    // The actor is always 'user' — there is a single human operator.
    const actor = cookieStore.get('console_session')?.value === 'active_session'
      ? 'user'
      : 'unknown';

    const result = await requestTransition(from, to, actor, reason);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const updated = await readAutotraderConfig();
    return NextResponse.json({ success: true, ...(updated ?? {}) });
  }

  // Handle config-only update (no mode change).
  const updated = await writeAutotraderConfig({
    ...(body.selectedInstruments !== undefined && {
      selectedInstruments: body.selectedInstruments,
    }),
    ...(body.lotUnits !== undefined && { lotUnits: body.lotUnits }),
    ...(body.autoStopAt !== undefined && { autoStopAt: body.autoStopAt }),
    ...(body.autoStopLabel !== undefined && { autoStopLabel: body.autoStopLabel }),
    ...(body.riskProfile !== undefined && { riskProfile: body.riskProfile }),
    updatedBy: 'user',
  });

  if (!updated) {
    return NextResponse.json(
      { success: false, error: 'CONFIG_WRITE_FAILURE: Failed to persist config.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, ...updated });
}
