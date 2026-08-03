# CLAUDE CODE — PHASE 0: AUTOTRADER FOUNDATION

Copy everything below this line into Claude Code as the opening prompt.

---

## CONTEXT & MISSION

You are building the foundation of a private autonomous trading platform (working name: `autotrader` — structure everything so renaming later is trivial). It trades GBP/USD and major indices via retail broker APIs and a funded FTMO account (via an MT5 bridge). It is single-user today but will later be offered to subscribers of a trading education platform, initially in **signal-only or manual-approval mode** — full autonomous execution remains private. Architect for that split from day one.

This phase builds **structure, safety systems, and scaffolding only**. No live broker connections, no real strategies, no AI-powered decisions yet. The goal is a skeleton where it is architecturally impossible to place a reckless order.

## NON-NEGOTIABLE RULES — DATA INTEGRITY

These apply to the entire codebase, forever:

1. Every data point is stored with its **source and timestamp**. No exceptions.
2. Every displayed value carries its **age**.
3. Any feed beyond its freshness threshold returns **`FEED_OFFLINE`** — never a cached or stale value presented as current.
4. **Hardcoded fallback prices are banned.** If real data is unavailable, the system says so and refuses to act.
5. No fabricated data anywhere — not in seeds, not in demos, not in tests masquerading as live values. Test fixtures must be unmistakably labelled as fixtures.

## NON-NEGOTIABLE RULES — EXECUTION SAFETY

These are the reason this phase exists:

1. **Trading mode state machine.** The system has exactly three modes: `OBSERVE` (signals generated, nothing simulated or placed), `PAPER` (orders filled by the internal paper broker only), `LIVE` (real orders). Mode is stored in the database AND required as an environment variable — both must agree or the system runs in `OBSERVE`. Transitions to `LIVE` require an explicit CLI confirmation step. There is no code path from `OBSERVE` directly to `LIVE`.
2. **Crash recovery is conservative.** After any unclean shutdown or restart, the system boots into `OBSERVE` regardless of prior mode, reconciles state, and requires manual promotion back to `PAPER`/`LIVE`.
3. **Kill switch, three ways.** A `HALT` flag in the database, a `HALT` file on disk, and a CLI command — any one of them stops all order submission within one event loop tick and flattens nothing automatically (closing positions is a separate, explicit command). The dashboard gets a kill switch button that sets the DB flag.
4. **Single RiskGate.** Every order — paper or live — passes through one module: `packages/risk`. There is exactly one function that can hand an order to a broker adapter, and it only accepts orders carrying a valid, unexpired RiskGate approval token. Broker adapters must reject orders without one. No other code path may submit orders.
5. **Risk profiles are data, not code.** Each trading account has a risk profile row: max risk per trade (% of equity), max daily loss, max total drawdown, max concurrent positions, max position size, allowed instruments, allowed session windows, news blackout rules. An `FTMO_STANDARD` profile ships as seed data encoding: 5% max daily loss, 10% max total drawdown, no new orders within a configurable window (default ±2 minutes) of high-impact calendar events, and a trade-frequency ceiling. Profiles are enforced pre-trade by RiskGate, not monitored after the fact.
6. **Daily loss limit is enforced with dead-man logic.** RiskGate tracks realised + unrealised P&L against the day's starting balance (midnight CET reset to match FTMO). At a configurable soft threshold (default 80% of the daily limit), no new orders. At the hard threshold, `HALT` is set automatically.
7. **Idempotent orders.** Every order carries a client-generated idempotency key. Resubmission with the same key is a no-op. This must survive process restarts.
8. **Reconciliation loop.** A scheduled job compares local order/position state against broker-reported state and writes discrepancies to `risk_events`. In `LIVE` mode, an unresolved discrepancy sets `HALT`.
9. **Full decision audit.** Every signal, every RiskGate decision (approved or rejected, with the reason), and every order lifecycle event is written to an append-only `audit_log` with the complete input snapshot that produced it. It must be possible to answer "why did the system do X at 14:32?" from the database alone.
10. **No market orders without protection.** Every entry carries a stop-loss defined before submission. Market orders carry a max-slippage tolerance; if the venue can't honour it, use limit orders. An open position with no stop is a `risk_event` of maximum severity and sets `HALT` in LIVE mode.

## ARCHITECTURE

**Stack:** TypeScript throughout. Monorepo with pnpm workspaces + Turborepo. Next.js 15 App Router dashboard (Vercel). Long-running workers as Node 20+ processes designed for a VPS/Railway — NOT Vercel functions (they need persistent connections and schedulers). Supabase Postgres as the system of record. Zod for all config and external-data validation. Vitest for tests. Strict TypeScript, no `any` in `packages/risk` or `packages/execution`.

**Monorepo layout:**

```
autotrader/
  packages/
    core/        # shared types, zod config schemas, structured logger, error taxonomy, clock abstraction
    data/        # feed adapter INTERFACES + feed health/staleness framework (no real adapters this phase)
    signals/     # indicator library scaffold (RSI, EMA, MACD, ATR, VWAP as pure, tested functions) + SignalProvider interface
    risk/        # RiskGate, risk profiles, position sizing (fixed-fractional + ATR-based), daily loss tracker
    execution/   # BrokerAdapter interface, PaperBroker (full implementation), order/position state machines
    backtest/    # scaffold only: interfaces + README describing the deterministic harness design
  apps/
    worker/      # orchestrator daemon: event loop, scheduler, mode manager, reconciliation job
    dashboard/   # Next.js 15: auth, system status, feed health, positions, audit log viewer, kill switch
    cli/         # `autotrader` CLI: verify, mode get/set, halt, resume, risk show, paper reset
```

**Key interfaces to define in `packages/core`:**

- `MarketDataFeed` — subscribe/snapshot with mandatory `source`, `timestamp`, `receivedAt` on every tick; `staleness()` and `health()` built into the interface.
- `SignalProvider` — emits `Signal { instrument, direction, conviction, factors[], generatedAt, expiresAt, provenance }`. Signals expire; RiskGate rejects expired signals.
- `BrokerAdapter` — `submitOrder`, `cancelOrder`, `getPositions`, `getAccountState`, `closePosition`. Adapters are dumb pipes: no risk logic inside them, and they must refuse orders lacking a RiskGate token.
- `RiskProfile`, `RiskDecision`, `AuditEvent`.

**PaperBroker (build fully this phase):** simulated fills against injected quote data with a configurable spread + slippage model, partial-fill support, simulated latency, and account equity tracking. It implements `BrokerAdapter` identically to a real broker so nothing upstream can tell the difference. Include a deterministic mode (seeded) for tests.

**Database schema (Supabase migrations, written by hand and committed):**

`accounts`, `risk_profiles`, `instruments`, `signals`, `orders`, `order_events`, `positions`, `account_snapshots`, `risk_events`, `audit_log`, `feed_health`, `system_state`, `calendar_events` (schema only — feed comes later).

Every table carries `account_id` (multi-tenant from day one), and every market-data-derived column carries `source` + `data_timestamp`. `audit_log` and `order_events` are append-only — enforce with a trigger that blocks UPDATE/DELETE. Design table structures RLS-ready (add policies later when multi-user).

**Multi-tenancy / future subscriber prep:**

- All config lives in DB rows keyed by `account_id`, never in code constants.
- The seam between signal generation and execution is a formal one: signals are written to the `signals` table; an `ExecutionPolicy` per account decides what happens next — `AUTO`, `MANUAL_APPROVE` (signal surfaces in dashboard, human clicks approve, then RiskGate runs), or `DISPLAY_ONLY`. Build all three policy values into the enum now; implement `AUTO` and `DISPLAY_ONLY` this phase, stub `MANUAL_APPROVE` with the approval table schema in place.
- No credentials in code or DB — broker credentials via environment/secret references only, one set per account.

## DASHBOARD (this phase: shell + monitoring only)

Next.js 15 App Router, Supabase auth (single user for now), and these pages: system status (mode, uptime, worker heartbeat), feed health board (every feed with age and status — `FEED_OFFLINE` states rendered unmissably), open positions + orders (paper), audit log viewer with filtering, and a kill switch (two-step confirm, sets DB `HALT`).

Design system: near-black background (#0A0A0B or similar), single accent colour — use `#C8F135` as a placeholder token in one place (`tailwind.config`) so it can be rebranded in one line. Syne for display headings, DM Sans for body, **DM Mono for every numeric/data value**. Data density over decoration — this is an operations console, not a marketing site. Every value showing market-derived data displays its age inline.

## CLI

`autotrader verify` is the canonical health check: prints mode, DB connectivity, migration status, feed health table, active risk profile, RiskGate self-test result (submits a deliberately rule-breaking paper order and confirms rejection), and kill switch state. Also: `autotrader mode get|set`, `autotrader halt`, `autotrader resume`, `autotrader paper reset`.

## TESTING REQUIREMENTS (blocking)

- `packages/risk` requires exhaustive unit tests: every rule in every profile has at least one test proving an order that violates it is rejected with the correct reason code. The FTMO profile tests must cover the daily loss boundary, total drawdown boundary, news blackout window, and position size cap.
- Order state machine tests: no illegal transitions possible.
- PaperBroker: deterministic fill tests with seeded data.
- Idempotency: duplicate submission test across a simulated restart.
- Mode state machine: prove OBSERVE→LIVE direct transition is impossible; prove crash recovery lands in OBSERVE.

## WHAT NOT TO BUILD THIS PHASE

No real broker adapters (interfaces + PaperBroker only). No real data feed adapters (interfaces + health framework only). No trading strategies. No Claude API integration. No backtest engine (scaffold + design doc only). No billing/subscription anything. Do not install libraries speculatively.

## VERIFICATION DISCIPLINE

Do not report any task as complete without showing the actual command output that proves it: `pnpm test` results in full, `autotrader verify` output, and migration apply output against a real Supabase instance. Prose summaries of success are not acceptable evidence. If something is partially done, say exactly what works and what doesn't. Never introduce changes that weren't requested; if you believe a change is necessary, propose it and wait.

## DELIVERABLES FOR THIS PHASE

1. The full monorepo scaffold building cleanly (`pnpm build` green).
2. All migrations applied to Supabase, schema documented in `docs/SCHEMA.md`.
3. `packages/core` interfaces complete and documented.
4. `packages/risk` fully implemented with passing test suite.
5. PaperBroker fully implemented with passing tests.
6. Worker daemon running the mode state machine, heartbeat, and reconciliation job (against PaperBroker).
7. Dashboard shell deployed with the five pages above wired to real DB state.
8. CLI implemented; paste the full output of `autotrader verify` as the final proof of completion.
9. `docs/ARCHITECTURE.md` explaining the RiskGate token flow, mode state machine, and the signal→execution-policy seam, written so a second developer (or a future Claude Code session with no context) can pick this up cold.

Begin by presenting your proposed file tree and the `packages/core` type definitions for review before writing the rest.
