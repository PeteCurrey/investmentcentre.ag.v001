/**
 * packages/core/src/lock.ts
 *
 * Advisory cycle lock backed by meridian.execution_lock.
 *
 * A single row (key = 'cycle') gates concurrent run-cycle invocations.
 * Lock TTL is 90 seconds — longer than any expected cycle. If a process
 * crashes without releasing, the next invocation clears the expired row.
 *
 * acquireCycleLock:
 *   - Clears any expired row for 'cycle'.
 *   - Attempts to INSERT a new row. Returns true on success.
 *   - Returns false if a non-expired row already exists (conflict).
 *
 * releaseCycleLock:
 *   - DELETEs the row WHERE key = 'cycle' AND locked_by = cycleId.
 *   - Noop if the row has already been auto-expired and overwritten.
 */

import { getSupabaseClient } from './db';
import { createLogger } from './logger';

const log = createLogger('lock');

const LOCK_KEY = 'cycle';
const LOCK_TTL_SECONDS = 90;

export async function acquireCycleLock(cycleId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000).toISOString();

  // 1. Delete any expired row so the INSERT can succeed
  try {
    await supabase
      .from('execution_lock')
      .delete()
      .eq('key', LOCK_KEY)
      .lt('expires_at', now.toISOString());
  } catch (e: unknown) {
    log.error('acquireCycleLock: failed to clear expired lock', { err: String(e) });
    // Non-fatal — the INSERT will fail below if a live row exists
  }

  // 2. Attempt to insert our row
  const { error } = await supabase
    .from('execution_lock')
    .insert({ key: LOCK_KEY, locked_by: cycleId, expires_at: expiresAt });

  if (error) {
    // Unique constraint violation means another cycle holds the lock
    log.warn('acquireCycleLock: lock already held', { cycleId, error: error.message });
    return false;
  }

  log.info('acquireCycleLock: acquired', { cycleId, expiresAt });
  return true;
}

export async function releaseCycleLock(cycleId: string): Promise<void> {
  const supabase = getSupabaseClient();
  try {
    await supabase
      .from('execution_lock')
      .delete()
      .eq('key', LOCK_KEY)
      .eq('locked_by', cycleId);
    log.info('releaseCycleLock: released', { cycleId });
  } catch (e: unknown) {
    // Log but don't throw — the lock will expire in 90s regardless
    log.error('releaseCycleLock: failed to release', { cycleId, err: String(e) });
  }
}
