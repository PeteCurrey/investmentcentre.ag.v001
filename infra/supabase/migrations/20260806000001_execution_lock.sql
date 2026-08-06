-- Phase 10: Execution lock table (corrected migration)
-- Prevents concurrent cycle runs from racing.
-- A single row keyed on 'cycle' acts as a distributed advisory lock.
-- If the holding cycle crashes, the lock auto-expires after 90 seconds.
--
-- HISTORY: The execution_lock table was originally created manually via the
-- Supabase Dashboard, which enables RLS by default. With no RLS policies
-- defined, the anon client's INSERT was silently blocked (Postgres 42501),
-- causing acquireCycleLock() to return false and every cycle to log
-- CYCLE_IN_FLIGHT. This corrected migration disables RLS.

CREATE TABLE IF NOT EXISTS meridian.execution_lock (
  key        text        PRIMARY KEY DEFAULT 'cycle',
  locked_at  timestamptz NOT NULL DEFAULT now(),
  locked_by  text        NOT NULL,  -- cycle_id that holds the lock
  expires_at timestamptz NOT NULL   -- auto-expiry so a crashed cycle cannot deadlock
);

-- RLS must be disabled — the table was created via Dashboard which enables RLS
-- by default. With zero policies, RLS blocks all anon/authenticated inserts.
-- The service-role key (used by lock.ts) bypasses RLS regardless, but anon
-- access must work for tooling/inspection. Disable RLS entirely.
ALTER TABLE meridian.execution_lock DISABLE ROW LEVEL SECURITY;

-- Grant the application roles access
GRANT SELECT, INSERT, DELETE ON meridian.execution_lock TO authenticated;
GRANT SELECT, INSERT, DELETE ON meridian.execution_lock TO anon;
