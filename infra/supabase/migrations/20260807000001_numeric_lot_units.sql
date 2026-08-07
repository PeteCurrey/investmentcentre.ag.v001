-- 20260807000001_numeric_lot_units.sql
--
-- Alter meridian.autotrader_state.lot_units column from integer to numeric
-- to support fractional/decimal lot sizes (e.g. 0.01, 0.10, 0.50, 1.00) matching OANDA UI.

ALTER TABLE meridian.autotrader_state
  ALTER COLUMN lot_units TYPE numeric USING lot_units::numeric;
