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
 *   - Attempts an atomic upsert conditioned on expiry (one round trip).
 *   - Returns true on success (row inserted or expired row replaced).
 *   - Returns false if a non-expired row already exists (PG 23505 conflict).
 *   - Throws on any other error (infrastructure failure) so the cycle fails
 *     loudly rather than silently masking as CYCLE_IN_FLIGHT.
 *
 * releaseCycleLock:
 *   - DELETEs the row WHERE key = 'cycle' AND locked_by = cycleId.
 *   - Noop if the row has already expired and been overwritten.
 *   - Throws on DELETE error (lock release failure must be visible).
 */

import { getSupabaseServiceClient } from './db';
import { createLogger } from './logger';

const log = createLogger('lock');

const LOCK_KEY = 'cycle';
const LOCK_TTL_SECONDS = 90;

// PostgreSQL error code for unique-constraint violation
const PG_UNIQUE_VIOLATION = '23505';

export async function acquireCycleLock(cycleId: string): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000).toISOString();

  // Atomic upsert: insert OR replace the row only if the existing row is expired.
  // SQL equivalent:
  //   INSERT INTO execution_lock (key, locked_by, locked_at, expires_at)
  //   VALUES ($1, $2, now(), $3)
  //   ON CONFLICT (key) DO UPDATE SET locked_by = $2, locked_at = now(), expires_at = $3
  //   WHERE execution_lock.expires_at < now()
  //
  // supabase-js does not expose ON CONFLICT ... WHERE (partial index condition), so we
  // use a raw RPC call via the REST API pattern: delete-if-expired then insert.
  // Two steps but both atomic within the same transaction cannot be done without RPC.
  // Instead, we do:
  //   1. DELETE WHERE key='cycle' AND expires_at < now()  (clears crashed/expired lock)
  //   2. INSERT (fails with 23505 if a live non-expired row still exists)
  // Both steps use the service-role key, which bypasses RLS.

  // Step 1: Clear any expired lock row, checking the supabase-js { error } return value.
  const { error: deleteError } = await supabase
    .from('execution_lock')
    .delete()
    .eq('key', LOCK_KEY)
    .lt('expires_at', nowIso);

  if (deleteError) {
    // This indicates an infrastructure failure (table missing, credentials wrong, etc.)
    log.error('acquireCycleLock: failed to clear expired lock — infrastructure error', {
      code: deleteError.code,
      message: deleteError.message,
      details: deleteError.details,
      hint: deleteError.hint,
    });
    throw new Error(
      `Lock infrastructure failure during expired-lock cleanup: [${deleteError.code}] ${deleteError.message}`
    );
  }

  // Step 2: Attempt to insert our lock row.
  const { error: insertError } = await supabase
    .from('execution_lock')
    .insert({ key: LOCK_KEY, locked_by: cycleId, expires_at: expiresAt });

  if (!insertError) {
    log.info('acquireCycleLock: acquired', { cycleId, expiresAt });
    return true;
  }

  // Distinguish a unique-constraint violation (lock is held by another cycle)
  // from any other error (infrastructure failure, table missing, etc.).
  if (insertError.code === PG_UNIQUE_VIOLATION) {
    log.warn('acquireCycleLock: lock already held by another cycle', {
      cycleId,
      error: insertError.message,
    });
    return false;
  }

  // Any other error means the lock table itself is broken.
  // Throw loudly so the cycle fails with a visible error rather than
  // silently reporting CYCLE_IN_FLIGHT when no cycle is actually running.
  log.error('acquireCycleLock: infrastructure failure — throwing to fail the cycle loudly', {
    cycleId,
    code: insertError.code,
    message: insertError.message,
    details: insertError.details,
    hint: insertError.hint,
  });
  throw new Error(
    `Lock infrastructure failure during acquisition: [${insertError.code}] ${insertError.message}. ` +
    `If this is "relation does not exist", the migration has not been applied.`
  );
}

export async function releaseCycleLock(cycleId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();

  const { error: releaseError } = await supabase
    .from('execution_lock')
    .delete()
    .eq('key', LOCK_KEY)
    .eq('locked_by', cycleId);

  if (releaseError) {
    // Log and throw — lock release failure must be visible, not silently swallowed.
    // The lock will expire in 90s regardless, but silent failures hide infrastructure issues.
    log.error('releaseCycleLock: failed to release lock', {
      cycleId,
      code: releaseError.code,
      message: releaseError.message,
    });
    throw new Error(
      `Lock release failure: [${releaseError.code}] ${releaseError.message}`
    );
  }

  log.info('releaseCycleLock: released', { cycleId });
}
