import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

const STATE_PATH = path.join(process.cwd(), 'autotrader_state.json');

interface AutotraderState {
  enabled: boolean;
  lastToggled: string;
  cycleCount: number;
  lastSignal: string | null;
  lastInstrument: string | null;
  lastDirection: string | null;
  lastPrice: string | null;
}

async function readAutotraderState(): Promise<AutotraderState> {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf-8'));
  } catch {
    return {
      enabled: false,
      lastToggled: new Date().toISOString(),
      cycleCount: 0,
      lastSignal: null,
      lastInstrument: null,
      lastDirection: null,
      lastPrice: null
    };
  }
}

async function writeAutotraderState(updates: Partial<AutotraderState>): Promise<AutotraderState> {
  const current = await readAutotraderState();
  const next: AutotraderState = { ...current, ...updates, lastToggled: new Date().toISOString() };
  await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2)).catch(() => {});
  return next;
}

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get('console_session')?.value !== 'active_session') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const state = await readAutotraderState();
  return NextResponse.json({ success: true, ...state });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('console_session')?.value !== 'active_session') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const body = await request.json() as { enabled: boolean };
  const next = await writeAutotraderState({ enabled: body.enabled });
  return NextResponse.json({ success: true, ...next });
}
