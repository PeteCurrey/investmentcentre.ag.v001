-- MERIDIAN Autotrader Supabase State Migration
-- Phase: Replace filesystem state with Supabase + implement OBSERVE/PAPER/LIVE state machine
-- Date: 2026-08-05

-- ─── Enum ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE meridian.autotrader_mode AS ENUM ('OBSERVE', 'PAPER', 'LIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── autotrader_state — singleton config row ──────────────────────────────────
-- Enforced single-row via CHECK (id = 'singleton').
CREATE TABLE IF NOT EXISTS meridian.autotrader_state (
  id                text        NOT NULL DEFAULT 'singleton'
                                CONSTRAINT autotrader_state_singleton CHECK (id = 'singleton'),
  mode              meridian.autotrader_mode NOT NULL DEFAULT 'OBSERVE',
  selected_instruments text[]   NOT NULL DEFAULT '{}',
  lot_units         int         NOT NULL DEFAULT 100,
  auto_stop_at      timestamptz,
  auto_stop_label   text,
  risk_profile      jsonb       NOT NULL DEFAULT '{}',
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        text,
  PRIMARY KEY (id)
);

-- Seed the singleton row so every read hits an existing row.
INSERT INTO meridian.autotrader_state (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- ─── mode_transitions — immutable transition log ──────────────────────────────
-- OBSERVE→LIVE is blocked at the database level via CHECK constraint.
-- Application-level validation is an additional defence-in-depth layer, not the primary gate.
CREATE TABLE IF NOT EXISTS meridian.mode_transitions (
  id           bigserial   PRIMARY KEY,
  from_mode    meridian.autotrader_mode NOT NULL,
  to_mode      meridian.autotrader_mode NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  actor        text        NOT NULL,
  reason       text        NOT NULL,
  CONSTRAINT no_observe_to_live
    CHECK (NOT (from_mode = 'OBSERVE' AND to_mode = 'LIVE'))
);

-- Block mutations — this table is append-only.
CREATE OR REPLACE FUNCTION meridian.enforce_immutable_mode_transitions()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'meridian.mode_transitions is immutable. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mode_transitions_immutable ON meridian.mode_transitions;
CREATE TRIGGER trg_mode_transitions_immutable
  BEFORE UPDATE OR DELETE ON meridian.mode_transitions
  FOR EACH ROW EXECUTE FUNCTION meridian.enforce_immutable_mode_transitions();

-- ─── gate_decisions — immutable RiskGate audit log ───────────────────────────
-- One row per evaluation, approvals AND rejections alike.
-- UPDATE and DELETE are revoked from the application roles at the SQL level.
CREATE TABLE IF NOT EXISTS meridian.gate_decisions (
  id                bigserial   PRIMARY KEY,
  order_intent_id   text        NOT NULL,
  instrument        text        NOT NULL,
  direction         text        NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  units             text        NOT NULL, -- serialised bigint
  entry_price       text        NOT NULL,
  stop_loss_price   text        NOT NULL,
  take_profit_price text,
  profile_id        text        NOT NULL,
  profile_snapshot  jsonb       NOT NULL,
  account_state     jsonb       NOT NULL,
  approved          bool        NOT NULL,
  reason_code       text,
  token_id          text,
  evaluated_at      timestamptz NOT NULL DEFAULT now()
);

-- Revoke mutations from application roles (anon + authenticated are the Supabase app roles).
REVOKE UPDATE, DELETE ON meridian.gate_decisions FROM anon;
REVOKE UPDATE, DELETE ON meridian.gate_decisions FROM authenticated;

-- Trigger-level enforcement as defence-in-depth.
CREATE OR REPLACE FUNCTION meridian.enforce_immutable_gate_decisions()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'meridian.gate_decisions is immutable. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gate_decisions_immutable ON meridian.gate_decisions;
CREATE TRIGGER trg_gate_decisions_immutable
  BEFORE UPDATE OR DELETE ON meridian.gate_decisions
  FOR EACH ROW EXECUTE FUNCTION meridian.enforce_immutable_gate_decisions();

-- ─── cycle_log — one row per cycle and per instrument evaluation ──────────────
CREATE TABLE IF NOT EXISTS meridian.cycle_log (
  id         bigserial   PRIMARY KEY,
  cycle_id   uuid        NOT NULL,
  instrument text,
  action     text        NOT NULL,  -- OBSERVE_EVAL | PAPER_FILL | EXECUTED | REJECTED | ERROR | SKIPPED | CLOSED
  reason     text,
  order_id   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cycle_log_cycle_id   ON meridian.cycle_log (cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_log_order_id   ON meridian.cycle_log (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cycle_log_created_at ON meridian.cycle_log (created_at DESC);

-- ─── account_day — daily opening balance and high-water mark ─────────────────
-- Scaled integers, scale = 2 (i.e. value / 100 = currency amount).
-- Used by Phase 4 for daily drawdown calculation.
CREATE TABLE IF NOT EXISTS meridian.account_day (
  day_date                      date        PRIMARY KEY,
  opening_balance               bigint      NOT NULL,
  opening_balance_captured_at   timestamptz NOT NULL,
  high_water_mark               bigint      NOT NULL,
  high_water_mark_updated_at    timestamptz NOT NULL
);
