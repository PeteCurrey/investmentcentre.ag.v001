import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

const STATE_PATH = path.join(process.cwd(), 'autotrader_state.json');

export interface CycleLogItem {
  id: string;
  timestamp: string;
  instrument: string;
  action: 'EXECUTED' | 'SKIPPED' | 'REJECTED' | 'ERROR';
  direction?: 'BUY' | 'SELL';
  units?: number;
  price?: string;
  reason: string;
  orderId?: string;
}

export interface AutotraderState {
  enabled: boolean;
  lastToggled: string;
  cycleCount: number;
  selectedInstruments: string[];
  lotUnits: number;
  lastSignal: string | null;
  lastInstrument: string | null;
  lastDirection: string | null;
  lastPrice: string | null;
  lastCycleAt: string | null;
  lastCycleLogs: CycleLogItem[];
  autoStopAt: string | null;
  autoStopLabel: string | null;
}

const DEFAULT_STATE: AutotraderState = {
  enabled: false,
  lastToggled: new Date().toISOString(),
  cycleCount: 0,
  selectedInstruments: ['GBP/USD', 'EUR/USD', 'XAU/USD'],
  lotUnits: 100,
  lastSignal: null,
  lastInstrument: null,
  lastDirection: null,
  lastPrice: null,
  lastCycleAt: null,
  lastCycleLogs: [],
  autoStopAt: null,
  autoStopLabel: null,
};

async function readAutotraderState(): Promise<AutotraderState> {
  try {
    const raw = JSON.parse(await fs.readFile(STATE_PATH, 'utf-8'));
    return { ...DEFAULT_STATE, ...raw };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeAutotraderState(updates: Partial<AutotraderState>): Promise<AutotraderState> {
  const current = await readAutotraderState();

  let effectiveEnabled = updates.enabled !== undefined ? updates.enabled : current.enabled;
  const stopAt = updates.autoStopAt !== undefined ? updates.autoStopAt : current.autoStopAt;
  if (effectiveEnabled && stopAt && new Date() >= new Date(stopAt)) {
    effectiveEnabled = false;
  }

  const next: AutotraderState = {
    ...current,
    ...updates,
    enabled: effectiveEnabled,
    lastToggled: new Date().toISOString(),
  };
  await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2)).catch(() => {});
  return next;
}

async function auth() {
  const cookieStore = await cookies();
  return cookieStore.get('console_session')?.value === 'active_session';
}

export async function GET() {
  if (!(await auth())) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let state = await readAutotraderState();

  if (state.enabled && state.autoStopAt && new Date() >= new Date(state.autoStopAt)) {
    state = await writeAutotraderState({ enabled: false });
  }

  return NextResponse.json({ success: true, ...state });
}

export async function POST(request: Request) {
  if (!(await auth())) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json() as {
    enabled?: boolean;
    selectedInstruments?: string[];
    lotUnits?: number;
    autoStopAt?: string | null;
    autoStopLabel?: string | null;
  };

  const next = await writeAutotraderState({
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.selectedInstruments !== undefined && { selectedInstruments: body.selectedInstruments }),
    ...(body.lotUnits !== undefined && { lotUnits: body.lotUnits }),
    ...(body.autoStopAt !== undefined && { autoStopAt: body.autoStopAt }),
    ...(body.autoStopLabel !== undefined && { autoStopLabel: body.autoStopLabel }),
  });

  return NextResponse.json({ success: true, ...next });
}
