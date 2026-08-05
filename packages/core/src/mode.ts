/**
 * packages/core/src/mode.ts
 *
 * OBSERVE / PAPER / LIVE state machine.
 *
 * Design rules (from CLAUDE.md §2):
 * - OBSERVE→LIVE is forbidden in code and enforced by a DB CHECK constraint.
 * - getMode() returns 'OBSERVE' on any failure. Fails closed, always.
 * - requestTransition() requires a non-empty reason string.
 * - Every transition is persisted to meridian.mode_transitions before the
 *   state row is updated, so the log is always at least as fresh as the state.
 */
import {
  AutotraderMode,
  readAutotraderConfig,
  writeAutotraderConfig,
  insertModeTransition,
} from './state';
import { createLogger } from './logger';

const log = createLogger('mode');

export type { AutotraderMode };

// Legal transition pairs — OBSERVE→LIVE is absent by design.
const LEGAL_TRANSITIONS: ReadonlyArray<readonly [AutotraderMode, AutotraderMode]> =
  [
    ['OBSERVE', 'PAPER'],
    ['PAPER', 'OBSERVE'],
    ['PAPER', 'LIVE'],
    ['LIVE', 'PAPER'],
    ['LIVE', 'OBSERVE'],
  ] as const;

export interface TransitionResult {
  ok: boolean;
  error?: string;
}

/**
 * Returns the current autotrader mode.
 * On ANY failure — network, missing row, parse error — returns 'OBSERVE'.
 * This is the crash-recovery / fail-closed guarantee.
 */
export async function getMode(): Promise<AutotraderMode> {
  try {
    const config = await readAutotraderConfig();
    return config?.mode ?? 'OBSERVE';
  } catch {
    log.error('getMode: read failed, returning OBSERVE (fail-closed)');
    return 'OBSERVE';
  }
}

/**
 * Requests a mode transition.
 *
 * Validates:
 *   1. reason is non-empty
 *   2. the transition is in the legal set
 *   3. the current mode in the database matches `from`
 *
 * On success, appends to mode_transitions then updates autotrader_state.mode.
 * Returns { ok: false, error } on any validation or persistence failure.
 */
export async function requestTransition(
  from: AutotraderMode,
  to: AutotraderMode,
  actor: string,
  reason: string
): Promise<TransitionResult> {
  if (!reason || reason.trim().length === 0) {
    return { ok: false, error: 'reason is mandatory and must be non-empty' };
  }

  const isLegal = LEGAL_TRANSITIONS.some(([f, t]) => f === from && t === to);
  if (!isLegal) {
    // Extra guard — the DB CHECK constraint is the primary enforcement for OBSERVE→LIVE.
    return {
      ok: false,
      error: `Transition ${from}→${to} is not permitted. Legal transitions: OBSERVE↔PAPER, PAPER↔LIVE, LIVE→OBSERVE.`,
    };
  }

  const current = await readAutotraderConfig();
  if (!current) {
    return {
      ok: false,
      error: 'Cannot read current mode from database — transition aborted.',
    };
  }

  if (current.mode !== from) {
    return {
      ok: false,
      error: `Current mode is ${current.mode}, not ${from}. Transition aborted to prevent split-brain.`,
    };
  }

  // Write the transition log row first. If this fails, we do not update state.
  const logged = await insertModeTransition({ fromMode: from, toMode: to, actor, reason });
  if (!logged) {
    return {
      ok: false,
      error: 'Failed to write mode_transitions row — state not updated.',
    };
  }

  // Update state.
  const updated = await writeAutotraderConfig({ mode: to, updatedBy: actor });
  if (!updated) {
    return {
      ok: false,
      error: 'mode_transitions row written but autotrader_state update failed — investigate immediately.',
    };
  }

  log.info('mode transition complete', { from, to, actor });
  return { ok: true };
}
