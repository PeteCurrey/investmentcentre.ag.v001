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
import { AutotraderMode } from './state';
export type { AutotraderMode };
export interface TransitionResult {
    ok: boolean;
    error?: string;
}
/**
 * Returns the current autotrader mode.
 * On ANY failure — network, missing row, parse error — returns 'OBSERVE'.
 * This is the crash-recovery / fail-closed guarantee.
 */
export declare function getMode(): Promise<AutotraderMode>;
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
export declare function requestTransition(from: AutotraderMode, to: AutotraderMode, actor: string, reason: string): Promise<TransitionResult>;
//# sourceMappingURL=mode.d.ts.map