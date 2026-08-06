-- MERIDIAN Security Hardening Migration
-- 1. Revoke all permissions on meridian schema from anon and authenticated roles.
--    Server-side operations execute exclusively via service_role.
-- 2. Enforce mode integrity on autotrader_state at the database level via a BEFORE UPDATE trigger.

-- ── 1. Revoke privileges from anon and authenticated ──────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA meridian FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA meridian FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA meridian FROM anon, authenticated;
REVOKE ALL ON SCHEMA meridian FROM anon, authenticated;

-- ── 2. Revoke default privileges for future objects in meridian ──────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- ── 3. Explicitly grant USAGE and ALL PRIVILEGES to service_role and postgres ──
GRANT USAGE ON SCHEMA meridian TO service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA meridian TO service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA meridian TO service_role, postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA meridian TO service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT ALL ON TABLES TO service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT ALL ON SEQUENCES TO service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT ALL ON FUNCTIONS TO service_role, postgres;

-- ── 4. Enforce mode integrity trigger on autotrader_state ─────────────────────
-- Prohibits direct UPDATE of mode='LIVE' unless:
--   a) The transition is legal (OBSERVE -> LIVE is forbidden!), AND
--   b) A matching mode_transitions row exists for the transition requested within the last 10 seconds.

CREATE OR REPLACE FUNCTION meridian.enforce_autotrader_state_mode_transition()
RETURNS TRIGGER AS $$
DECLARE
  transition_exists boolean;
BEGIN
  IF NEW.mode IS DISTINCT FROM OLD.mode THEN
    -- Direct transition from OBSERVE to LIVE is strictly forbidden
    IF OLD.mode = 'OBSERVE' AND NEW.mode = 'LIVE' THEN
      RAISE EXCEPTION 'Direct transition from OBSERVE to LIVE is prohibited at the database level.';
    END IF;

    -- Verify that a corresponding mode_transitions log row was recorded within the last 10 seconds
    SELECT EXISTS (
      SELECT 1 FROM meridian.mode_transitions
      WHERE from_mode = OLD.mode
        AND to_mode = NEW.mode
        AND requested_at >= (now() - interval '10 seconds')
    ) INTO transition_exists;

    IF NOT transition_exists THEN
      RAISE EXCEPTION 'Cannot update mode from % to %: no corresponding meridian.mode_transitions row recorded within the last 10 seconds.', OLD.mode, NEW.mode;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_autotrader_state_mode_enforce ON meridian.autotrader_state;
CREATE TRIGGER trg_autotrader_state_mode_enforce
  BEFORE UPDATE ON meridian.autotrader_state
  FOR EACH ROW
  EXECUTE FUNCTION meridian.enforce_autotrader_state_mode_transition();
