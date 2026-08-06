-- MERIDIAN Migration: Add watchlist column to autotrader_state
-- Date: 2026-08-06

ALTER TABLE meridian.autotrader_state
ADD COLUMN IF NOT EXISTS watchlist text[] NOT NULL DEFAULT '{}';
