-- MERIDIAN Login Rate Limit Migration
-- Date: 2026-08-05

CREATE TABLE IF NOT EXISTS meridian.login_attempts (
  id           bigserial   PRIMARY KEY,
  ip           text        NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success      boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS login_attempts_ip_time_idx ON meridian.login_attempts (ip, attempted_at DESC);
