# CLAUDE CODE — PHASE 1: SIGNAL INGESTION BRIDGE

Copy everything below this line into Claude Code in the autotrader repo.

---

## CONTEXT

Phase 0 is complete and tagged: monorepo, RiskGate with ApprovalToken, PaperBroker, mode state machine, migrations applied to the shared Supabase project (`autotrader.*` schema), verify exiting 0. The account is disabled, in OBSERVE, with ExecutionPolicy DISPLAY_ONLY.

Phase 1 makes the system *see*: it consumes trading signals produced by a separate system (signalcentre) that shares this Supabase project and owns the `public.*` schema. Signals flow in, get evaluated by RiskGate in dry-run, and appear on the dashboard with full provenance — and nothing executes. By the end of this phase the entire decision pipeline runs end-to-end with execution still impossible.

All Phase 0 non-negotiables remain in force: provenance on every data point, age on every displayed value, FEED_OFFLINE instead of stale data, no hardcoded fallbacks, fixtures unmistakably labelled, `public.*` is read-only foreign territory, no DDL against `public.*`, verification discipline (real command output, no prose claims of success).

## STEP 1 — INTROSPECT BEFORE ASSUMING (blocking)

The state of signalcentre's signal output is UNVERIFIED. We know its market-data ingestion exists (Databento futures, Polygon spot FX, cron routes) but `public.economic_events` was found empty in Phase 0, so nothing about the producer side may be assumed.

Read-only introspection of `public.*` (information_schema + bounded SELECTs, no DDL, no writes):

1. Enumerate all tables and views in `public` with their columns and row counts.
2. Identify anything that looks like signal output: tables carrying instrument/direction/conviction/factor-score-like columns. Sample rows if present.
3. Identify the market data tables (prices/candles/quotes) — their shape, granularity, instruments covered, recency of newest rows.
4. Check `public.economic_events` row count again and report whether the signalcentre ingestion gap has been fixed since Phase 0.

Then STOP and present findings with your recommendation between the two integration shapes below. Do not write code past this point without confirmation.

## THE TWO INTEGRATION SHAPES

**Shape A — Consume (preferred if the producer exists):** signalcentre computes its seven-factor gauge (RSI, EMA, COT, VOL, NEWS, ORDER FLOW, MACRO) and publishes signals to a table in `public.*`. Autotrader reads them through a `SignalSource` adapter, maps them into `autotrader.signals`, and never computes factors itself. One source of truth; signalcentre subscribers and the autotrader see identical signals.

**Shape B — Compute (fallback if no producer output exists):** autotrader's `packages/signals` computes indicator values itself from signalcentre's raw market-data tables (read-only), using the pure indicator functions scaffolded in Phase 0. This duplicates gauge logic and risks divergence from signalcentre — acceptable as a temporary bridge only, and if chosen it must be built behind the same `SignalSource` interface so swapping to Shape A later is an adapter change, not a rewrite.

Whichever shape applies, deliverable 9 (the contract document) is produced either way.

## WHAT TO BUILD (after confirmation)

### 1. SignalSource adapter (packages/data)
- `SignalSource` interface mirroring the `MarketDataFeed` discipline: every signal read returns provenance (source, dataTimestamp, receivedAt), `FeedRead` semantics apply — a stale or unreachable source returns FEED_OFFLINE, never the last known signals.
- Freshness threshold configurable per source; a signal source whose newest signal exceeds the threshold is DEGRADED/FEED_OFFLINE and this is visible on the feed-health board.
- Concrete adapter: `DbSignalSource` reading the confirmed `public.*` location (Shape A) or wrapping the internal computation (Shape B).

### 2. Signal mapping into autotrader.signals
- Each external signal maps to the Phase 0 `Signal` domain type: instrument, direction, conviction, factors[], generatedAt, expiresAt, provenance.
- If the producer supplies no explicit expiry, expiry is derived from a per-source configured TTL — a signal with no computable expiry is INVALID and rejected at ingestion (logged, counted, visible), never given a default far-future expiry.
- Instrument mapping between signalcentre's identifiers and `autotrader.instruments` rows is explicit config data, not name-matching heuristics. Unmapped instruments are skipped loudly (logged + counter), never guessed.
- Idempotent ingestion: re-reading the same source rows must not duplicate signals. Natural key from (source, external id or content hash).

### 3. Worker: signal loop
- New scheduled job in apps/worker: poll SignalSource, ingest new signals, update feed health for the signal source.
- For every ingested signal, run a **dry-run RiskGate evaluation** immediately: full check suite, decision written to audit_log with complete RiskInputSnapshot, but no order intent is constructed and nothing approaches the order router. Expected steady-state result today: REJECTED with CALENDAR_UNAVAILABLE (economic_events is empty) — that is correct fail-closed behaviour and must be visible, not suppressed.
- The dry-run decision is stored linked to the signal so the dashboard can show "signal arrived → here is exactly what RiskGate said and why".

### 4. Dashboard: signals page
- New page: live signals list — instrument, direction, conviction, factor breakdown, age (updating), provenance source, expiry countdown, and the linked dry-run RiskGate decision with its rejection code or approval.
- Signal source health on the existing feed-health board.
- Same design system. Every market-derived value shows its age. Expired signals visibly distinct from active ones.

### 5. Migrations
- New migration(s) in the autotrader migration runner: any columns/tables needed for signal linkage (e.g. dry-run decision reference, ingestion counters), plus config tables for instrument mapping and per-source TTLs. All in `autotrader.*`. If Shape A requires signalcentre to change or add anything in `public.*`, that goes in the contract document (deliverable 9) — NOT in this repo's migrations.

### 6. Tests
- Fixture-driven SignalSource with deterministic signals (isFixture: true throughout).
- Ingestion idempotency test (same rows read twice → no duplicates).
- Expiry derivation tests including the no-computable-expiry rejection.
- Unmapped instrument skip test.
- Staleness → FEED_OFFLINE test for the signal source.
- Dry-run pipeline test: fixture signal in → audit_log decision out, with snapshot completeness asserted.
- All Phase 0 tests still green.

## WHAT NOT TO BUILD
No broker adapters. No order submission from signals (the dry-run stops before the order router; ExecutionPolicy stays DISPLAY_ONLY and the account stays disabled). No Claude API. No backtest engine. No dashboard auth (tracked separately on the Phase-0 exit checklist). No modifications to anything in `public.*` or the signalcentre repo.

## DELIVERABLES
1. Introspection findings + shape recommendation (the Step 1 pause).
2. SignalSource interface + concrete adapter with tests.
3. Ingestion mapper with idempotency, expiry, and instrument-mapping rules enforced.
4. Worker signal loop with dry-run RiskGate evaluation wired to audit_log.
5. Dashboard signals page live against real DB state.
6. Migrations applied via the autotrader runner (paste real output).
7. Full test suite green (paste real output).
8. `autotrader verify` extended: signal source health, count of signals ingested, count of dry-run decisions, last decision's rejection code. Paste real output.
9. `docs/SIGNAL_CONTRACT.md`: the precise interface autotrader expects a producer to publish — table/view shape, required columns, provenance fields, expiry semantics, instrument identifier convention, freshness expectations. Written so the signalcentre repo (a separate Claude Code session with no context) can implement the producer side from this document alone. Produce this regardless of which shape was chosen.

Begin with Step 1 and stop after presenting findings.
