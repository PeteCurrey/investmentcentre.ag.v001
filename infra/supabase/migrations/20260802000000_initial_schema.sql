-- MERIDIAN Initial Migration Schema
-- Phase 0 Foundation

CREATE SCHEMA IF NOT EXISTS meridian;

-- Source Registry Table
CREATE TABLE IF NOT EXISTS meridian.sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('WORLD', 'MARKETS', 'HORIZON', 'UNDERCURRENT', 'ALTERNATIVES')),
  category TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ON_EVENT')),
  licence_class TEXT NOT NULL CHECK (licence_class IN ('INTERNAL_ONLY', 'REDISTRIBUTABLE_PUBLIC', 'COMMERCIAL_THIRD_PARTY')),
  redistributable BOOLEAN NOT NULL DEFAULT FALSE,
  auth_method TEXT NOT NULL,
  base_url TEXT NOT NULL,
  quota_monthly_requests INT,
  cost_model TEXT NOT NULL,
  staleness_sla_seconds INT NOT NULL,
  wave_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entity Model Tables
CREATE TABLE IF NOT EXISTS meridian.entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('COMPANY', 'INSTRUMENT', 'PERSON', 'GOVERNMENT_BODY', 'THEME', 'COMMODITY', 'LOCATION', 'EVENT')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian.entity_identifiers (
  id BIGSERIAL PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES meridian.entities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('LEI', 'CIK', 'ISIN', 'TICKER', 'COMPANIES_HOUSE', 'EXCHANGE_SYMBOL', 'INTERNAL')),
  value TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, type, value)
);

-- Observations Table (Non-negotiable DB-level provenance & licence constraints)
CREATE TABLE IF NOT EXISTS meridian.observations (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES meridian.sources(id),
  entity_id TEXT REFERENCES meridian.entities(id),
  pillar TEXT NOT NULL CHECK (pillar IN ('WORLD', 'MARKETS', 'HORIZON', 'UNDERCURRENT', 'ALTERNATIVES')),
  metric TEXT NOT NULL,
  value_numeric BIGINT,
  value_scale INT,
  value_text TEXT,
  unit TEXT,
  source_timestamp TIMESTAMPTZ NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  staleness_seconds INT NOT NULL,
  confidence INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  licence_class TEXT NOT NULL CHECK (licence_class IN ('INTERNAL_ONLY', 'REDISTRIBUTABLE_PUBLIC', 'COMMERCIAL_THIRD_PARTY')),
  redistributable BOOLEAN NOT NULL,
  raw_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_source_timestamp ON meridian.observations(source_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_obs_entity_id ON meridian.observations(entity_id);
CREATE INDEX IF NOT EXISTS idx_obs_metric ON meridian.observations(metric);

-- Source Health Tracking
CREATE TABLE IF NOT EXISTS meridian.source_health (
  source_id TEXT PRIMARY KEY REFERENCES meridian.sources(id),
  state TEXT NOT NULL CHECK (state IN ('HEALTHY', 'DEGRADED', 'OFFLINE', 'NOT_CONNECTED')),
  last_success_at TIMESTAMPTZ,
  expected_cadence TEXT NOT NULL,
  staleness_seconds INT NOT NULL,
  error_rate_24h DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  rows_written_last_window INT NOT NULL DEFAULT 0,
  quota_consumed_mtd INT NOT NULL DEFAULT 0,
  cost_mtd_usd DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spend Telemetry
CREATE TABLE IF NOT EXISTS meridian.spend (
  id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES meridian.sources(id),
  model_id TEXT,
  requests_count INT NOT NULL DEFAULT 1,
  credits_used DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  window_start TIMESTAMPTZ NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Log (Immutable Append-Only)
CREATE TABLE IF NOT EXISTS meridian.audit_log (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  output_snapshot JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger Function: Block UPDATE & DELETE on audit_log
CREATE OR REPLACE FUNCTION meridian.enforce_immutable_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'MERIDIAN Audit Log is immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON meridian.audit_log;

CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON meridian.audit_log
FOR EACH ROW EXECUTE FUNCTION meridian.enforce_immutable_audit_log();
