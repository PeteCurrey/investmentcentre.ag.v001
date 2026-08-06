import { NextResponse } from 'next/server';
import {
  readAutotraderConfig,
  writeAutotraderConfig,
  AutotraderConfig,
  RiskProfileConfig,
  requestTransition,
  AutotraderMode,
} from '@meridian/core';
import { OandaBrokerAdapter, getOandaApiKey } from '@meridian/execute';
import { requireSession } from '../../../lib/auth';
import { getInstrument } from '../../../lib/instruments';

const MAX_SELECTED_INSTRUMENTS = 10;

// ─── Types ─────────────────────────────────────────────────────────────────────
// Re-exported so the UI can import from a single location.
export type { AutotraderMode, AutotraderConfig, RiskProfileConfig };

// ─── GET /api/autotrader ───────────────────────────────────────────────────────
export async function GET() {
  try {
    await requireSession();
  } catch {
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
        enabled: false,
        updatedBy: 'system:auto-stop',
      });
      const finalConfig = updated ?? config;
      return NextResponse.json({ success: true, ...finalConfig });
    }
  }

  return NextResponse.json({ success: true, ...config });
}

// ─── POST /api/autotrader ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  let sessionPayload;
  try {
    sessionPayload = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = (await request.json()) as {
    // Mode transition — if present, takes priority over all other fields.
    requestTransition?: {
      from: AutotraderMode;
      to: AutotraderMode;
      reason: string;
    };
    // Config updates
    selectedInstruments?: string[];
    watchlist?: string[];
    lotUnits?: number;
    autoStopAt?: string | null;
    autoStopLabel?: string | null;
    riskProfile?: Partial<RiskProfileConfig>;
  };

  // Handle a mode transition request.
  if (body.requestTransition) {
    const { from, to, reason } = body.requestTransition;
    const actor = sessionPayload.sub || 'user';

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
  if (body.selectedInstruments !== undefined) {
    if (body.selectedInstruments.length > MAX_SELECTED_INSTRUMENTS) {
      return NextResponse.json(
        {
          success: false,
          error: `MAX_INSTRUMENTS_EXCEEDED: Maximum ${MAX_SELECTED_INSTRUMENTS} instruments can be selected for autotrader evaluation. Selected ${body.selectedInstruments.length}.`,
        },
        { status: 400 }
      );
    }

    // Rule 2: Explicit pipValue and digits check across universe
    const missingPipOrDigits = body.selectedInstruments.filter(sym => {
      const inst = getInstrument(sym);
      return !inst || !inst.pipValue || inst.pipValue <= 0 || inst.digits === undefined || inst.digits < 0;
    });

    if (missingPipOrDigits.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `INVALID_INSTRUMENTS: The following instruments lack explicit pipValue or digits definitions: [${missingPipOrDigits.join(', ')}].`,
        },
        { status: 400 }
      );
    }

    // Rule 1: Validate against broker's account instruments if credentials exist
    const apiKey = getOandaApiKey();
    const accountId = process.env.OANDA_ACCOUNT_ID;
    const env = (process.env.OANDA_ENVIRONMENT as 'practice' | 'live') || 'practice';

    if (apiKey && accountId) {
      const adapter = new OandaBrokerAdapter({ apiKey, accountId, environment: env });
      const instRes = await adapter.getAccountInstruments();
      if (instRes.success && instRes.value) {
        const accountInstruments = instRes.value;
        const nonBrokerTradeable = body.selectedInstruments.filter(sym => {
          const inst = getInstrument(sym);
          const oandaId = inst?.oandaId || sym.replace('/', '_');
          return !accountInstruments.has(oandaId);
        });

        if (nonBrokerTradeable.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `NOT_BROKER_TRADEABLE: The following instruments are not offered for trading on this OANDA account: [${nonBrokerTradeable.join(', ')}].`,
            },
            { status: 400 }
          );
        }
      }
    } else {
      // Fallback check against static universe flag if OANDA credentials not set
      const invalidList = body.selectedInstruments.filter(sym => {
        const inst = getInstrument(sym);
        return !inst || !inst.oandaTradeable;
      });
      if (invalidList.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `INVALID_INSTRUMENTS: The following instruments are not tradeable for automated execution: [${invalidList.join(', ')}].`,
          },
          { status: 400 }
        );
      }
    }
  }

  const updated = await writeAutotraderConfig({
    ...(body.selectedInstruments !== undefined && {
      selectedInstruments: body.selectedInstruments,
    }),
    ...(body.watchlist !== undefined && {
      watchlist: body.watchlist,
    }),
    ...(body.lotUnits !== undefined && { lotUnits: body.lotUnits }),
    ...(body.autoStopAt !== undefined && { autoStopAt: body.autoStopAt }),
    ...(body.autoStopLabel !== undefined && { autoStopLabel: body.autoStopLabel }),
    ...(body.riskProfile !== undefined && { riskProfile: body.riskProfile }),
    updatedBy: sessionPayload.sub || 'user',
  });

  if (!updated) {
    return NextResponse.json(
      { success: false, error: 'CONFIG_WRITE_FAILURE: Failed to persist config.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, ...updated });
}
