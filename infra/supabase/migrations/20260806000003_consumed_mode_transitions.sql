-- MERIDIAN Migration: Consumed Mode Transitions & Single-Use Enforcement
-- Date: 2026-08-06

-- ─── consumed_mode_transitions — single-use tracking ──────────────────────────
-- Prevents a single mode_transitions row from being re-used by multiple autotrader_state updates
-- within the 10-second window.
CREATE TABLE IF NOT EXISTS meridian.consumed_mode_transitions (
  transition_id bigint      PRIMARY KEY REFERENCES meridian.mode_transitions(id),
  consumed_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Enforce single-use mode transition trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION meridian.enforce_autotrader_state_mode_transition()
RETURNS TRIGGER AS $$
DECLARE
  target_transition_id bigint;
BEGIN
  IF NEW.mode IS DISTINCT FROM OLD.mode THEN
    -- Direct transition from OBSERVE to LIVE is strictly forbidden
    IF OLD.mode = 'OBSERVE' AND NEW.mode = 'LIVE' THEN
      RAISE EXCEPTION 'Direct transition from OBSERVE to LIVE is prohibited at the database level.';
    END IF;

    -- Find an unconsumed mode_transitions log row recorded within the last 10 seconds
    SELECT mt.id INTO target_transition_id
    FROM meridian.mode_transitions mt
    LEFT JOIN meridian.consumed_mode_transitions cmt ON cmt.transition_id = mt.id
    WHERE mt.from_mode = OLD.mode
      AND mt.to_mode = NEW.mode
      AND mt.requested_at >= (now() - interval '10 seconds')
      AND cmt.transition_id IS NULL
    ORDER BY mt.requested_at DESC
    LIMIT 1;

    IF target_transition_id IS NULL THEN
      RAISE EXCEPTION 'Cannot update mode from % to %: no unconsumed meridian.mode_transitions row recorded within the last 10 seconds.', OLD.mode, NEW.mode;
    END IF;

    -- Mark the transition as consumed
    INSERT INTO meridian.consumed_mode_transitions (transition_id)
    VALUES (target_transition_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_autotrader_state_mode_enforce ON meridian.autotrader_state;
CREATE TRIGGER trg_autotrader_state_mode_enforce
  BEFORE UPDATE ON meridian.autotrader_state
  FOR EACH ROW
  EXECUTE FUNCTION meridian.enforce_autotrader_state_mode_transition();
