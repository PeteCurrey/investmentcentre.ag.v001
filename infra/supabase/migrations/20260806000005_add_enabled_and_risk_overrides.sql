-- 20260806000005_add_enabled_and_risk_overrides.sql
--
-- Adds two columns to meridian.autotrader_state:
--   enabled                boolean  — kill switch; DEFAULT false (fail-closed)
--   risk_profile_overrides jsonb    — nullable; null means use FTMO_STANDARD_PROFILE baseline

ALTER TABLE meridian.autotrader_state
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false;

ALTER TABLE meridian.autotrader_state
  ADD COLUMN IF NOT EXISTS risk_profile_overrides jsonb;

-- Ensure existing singleton row has the default (no-op if already defaulted correctly)
UPDATE meridian.autotrader_state
  SET enabled = false
  WHERE id = 'singleton' AND enabled IS NULL;
