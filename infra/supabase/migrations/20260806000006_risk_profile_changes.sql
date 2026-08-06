-- 20260806000006_risk_profile_changes.sql
--
-- Append-only audit table for changes to RiskProfile parameters
-- (maxConcurrentPositions, maxDailyLossPct, maxTotalDrawdownPct, maxRiskPerTradePct, maxAggregateRiskPct, maxCorrelatedExposure)

CREATE TABLE IF NOT EXISTS meridian.risk_profile_changes (
  id            bigserial PRIMARY KEY,
  field_name    text        NOT NULL,
  old_value     jsonb       NOT NULL,
  new_value     jsonb       NOT NULL,
  actor         text        NOT NULL,
  reason        text        NOT NULL,
  changed_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS & restrict to service role inserts only
ALTER TABLE meridian.risk_profile_changes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'risk_profile_changes' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY "service_role_only" ON meridian.risk_profile_changes
      USING (auth.role() = 'service_role');
  END IF;
END $$;
