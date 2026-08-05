-- Phase 10: Execution lock table
-- Prevents concurrent cycle runs from racing.
-- A single row keyed on 'cycle' acts as a distributed advisory lock.
-- If the holding cycle crashes, the lock auto-expires after 90 seconds.

CREATE TABLE IF NOT EXISTS meridian.execution_lock (
  key        text        PRIMARY KEY DEFAULT 'cycle',
  locked_at  timestamptz NOT NULL DEFAULT now(),
  locked_by  text        NOT NULL,  -- cycle_id that holds the lock
  expires_at timestamptz NOT NULL   -- auto-expiry so a crashed cycle cannot deadlock
);

-- Grant the application role access
GRANT SELECT, INSERT, DELETE ON meridian.execution_lock TO authenticated;
GRANT SELECT, INSERT, DELETE ON meridian.execution_lock TO anon;
