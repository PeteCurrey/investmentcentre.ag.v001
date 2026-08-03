# CLAUDE CODE — PHASE 2: OANDA PRACTICE BROKER ADAPTER

Copy everything below this line into Claude Code in the autotrader repo.

---

## CONTEXT

Phase 0 (foundation) and Phase 1 (signal ingestion) are complete. The system ingests real signals from signalcentre, runs dry-run RiskGate evaluations with full audit, and displays everything on the dashboard. Execution is structurally impossible: account disabled, OBSERVE mode, DISPLAY_ONLY policy, no broker adapter beyond PaperBroker.

Phase 2 makes execution real — against an OANDA practice account with fake money and real market data. This is the first time an ApprovedOrder leaves the system and hits a venue. By the end of this phase, the full pipeline works end-to-end: signal arrives → RiskGate evaluates with a VENUE_NATIVE quote → order submits to OANDA practice → fill returns → position tracked → reconciliation confirmed. The account remains in PAPER mode throughout — LIVE promotion is a future phase.

All non-negotiables from Phase 0 remain in force. The verification discipline is especially critical this phase because you're talking to a real API and the failure modes are latency, partial fills, rate limits, and state disagreements — none of which exist in PaperBroker's world.

## PREREQUISITE — OANDA PRACTICE ACCOUNT

I will create an OANDA practice (demo) account at https://www.oanda.com and generate an API access token via My Account → My Services → Manage API Access. I'll place credentials in `.env.local` before you need them. Tell me the exact variable names you want and pause at the appropriate point — same discipline as the Supabase credentials in Phase 0.

## STEP 1 — OANDA API EXPLORATION (blocking)

Before writing the adapter, introspect the OANDA practice environment to confirm assumptions:

1. Hit `GET /v3/accounts` with the practice token against `api-fxpractice.oanda.com` — confirm connectivity, retrieve the account ID, and report the account currency and current balance.
2. Hit `GET /v3/accounts/{id}/instruments` — confirm GBP_USD is available, retrieve its contract details (pip location, display precision, minimum trade size, margin rate). Report the exact field names and values — these populate the autotrader instrument spec, replacing the seed defaults.
3. Hit `GET /v3/accounts/{id}/pricing?instruments=GBP_USD` — retrieve a live quote, confirm the response shape (bid, ask, timestamp, tradeable flag, spread).
4. Report the rate limit headers from any response (`X-RateLimit-*`).
5. Confirm: does the streaming endpoint (`stream-fxpractice.oanda.com/v3/accounts/{id}/pricing/stream`) return SSE or chunked JSON? What's the heartbeat interval?

Then STOP and present findings. Do not write the adapter until I confirm the API shape matches expectations.

## WHAT TO BUILD (after confirmation)

### 1. OANDA REST client (packages/execution/src/oanda/)

A thin, typed HTTP client — NOT a third-party wrapper (the npm ecosystem wrappers are unmaintained). Build directly against the v20 REST API.

**Design requirements:**
- Single `OandaClient` class handling auth, base URL switching (practice vs live via config — NOT a code change), request/response logging, and rate limiting.
- Rate limiting: respect OANDA's limits with a token-bucket or sliding-window limiter. Log warnings at 80% utilisation. Never let a 429 reach the adapter — queue and delay instead.
- Every response is Zod-validated before use. OANDA returns strings for numeric values (prices, units) — parse and validate at the boundary, convert to our scaled-integer Price/Qty types here, nowhere else. Reject malformed responses loudly rather than coercing.
- Retry policy: idempotent reads retry with exponential backoff (max 3). Order submissions NEVER retry automatically — a failed submission surfaces as FAILED with the raw error, and the reconciliation loop determines what actually happened at the venue. Double-submitting an order is the catastrophic failure this rule prevents.
- Request/response pairs logged at DEBUG with timing, sanitised (no token in logs).

**Endpoints to implement (v3 paths):**
- `GET /v3/accounts/{id}` — account state (balance, unrealised P&L, NAV, margin, open trade count)
- `GET /v3/accounts/{id}/instruments` — instrument specs
- `GET /v3/accounts/{id}/pricing?instruments=X` — snapshot quotes
- `POST /v3/accounts/{id}/orders` — order submission (MARKET with stopLoss, LIMIT with stopLoss)
- `PUT /v3/accounts/{id}/orders/{id}` — order modification
- `PUT /v3/accounts/{id}/orders/{id}/cancel` — order cancellation
- `GET /v3/accounts/{id}/trades` — open trades
- `PUT /v3/accounts/{id}/trades/{id}/close` — close trade
- `GET /v3/accounts/{id}/transactions/sinceid?id=X` — transaction stream for reconciliation
- Streaming pricing: `GET /v3/accounts/{id}/pricing/stream` — persistent connection, reconnect on drop with backoff, heartbeat timeout detection → FEED_OFFLINE.

### 2. OandaBrokerAdapter (packages/execution/src/oanda/)

Implements `BrokerAdapter` from Phase 0. This is the contract that makes it interchangeable with PaperBroker.

**Critical constraints:**
- `submitOrder(approved: ApprovedOrder)` — calls `verifyApprovalToken()` first (the Phase 0 runtime re-verification at the adapter boundary). Rejects with `UnapprovedOrderError` if verification fails. Maps our `OrderIntent` to OANDA's order request shape, including stopLoss and takeProfit as dependent orders. Sets `clientExtensions.id` to our `ClientOrderId` for idempotency tracking.
- `executes` property returns `'LIVE'` even for practice — from autotrader's mode system perspective, OANDA practice IS a real venue (real API, real fills, real state). The distinction between practice and funded is the account's money, not the adapter's behaviour. The mode system controls whether autotrader submits; the adapter doesn't second-guess.
- `getAccountState()` returns balance, equity (NAV), unrealised P&L, margin used/available, open position count — mapped to our `AccountState` type with full provenance (source: `'oanda.rest.v3'`, timestamps from OANDA's response).
- `getPositions()` maps OANDA trades to our `Position` type. OANDA calls them "trades" not "positions" — the mapping is 1:1 for our purposes.
- `closePosition()` maps to OANDA's trade close endpoint.
- Every response carries provenance. Every numeric value is converted to our scaled-integer representation at the boundary.
- Error mapping: OANDA's error responses (rejectReason, errorCode) map to our error taxonomy with the raw response preserved in the error detail for debugging.

### 3. OandaPricingFeed (packages/data/src/oanda/)

Implements `MarketDataFeed` from Phase 0. This is the **first VENUE_NATIVE quote source** in the system — the thing that makes real RiskGate evaluations possible.

**Design requirements:**
- Streaming connection with automatic reconnect and heartbeat-based liveness detection.
- Every quote carries `basis: 'VENUE_NATIVE'` — this is the discriminator that unlocks execution-grade evaluations (Phase 1's NON_VENUE_QUOTE guard rejects anything else for non-dry-run purposes).
- `snapshot()` falls back to REST polling if the stream is down, with the degradation visible in `health()`.
- Spread monitoring: compute and track bid-ask spread on every tick. If spread exceeds a configurable threshold (per instrument, on the risk profile), `health()` reports DEGRADED and RiskGate should see this. Wide spreads at news time or low-liquidity sessions are real and the system should refuse to trade through them, not ignore them.
- `staleness()` and `health()` integrate with the existing feed-health board on the dashboard.
- FeedRead semantics: stale beyond threshold → FEED_OFFLINE, never cached.

### 4. Mode promotion and execution pipeline wiring

This is the phase where the mode state machine gets exercised for real:

- **New CLI command: `autotrader account enable`** — enables the account (currently disabled from seed). Separate from mode promotion — an enabled account in OBSERVE still doesn't trade.
- **`autotrader mode set PAPER`** — the first real promotion. Requires: account enabled, no HALT, DB and env agree, reconciliation clean. With OANDA adapter configured, PAPER mode now means "RiskGate evaluates with VENUE_NATIVE quotes and submits approved orders to OANDA practice via the real adapter."
- **ExecutionPolicy promotion: `autotrader policy set AUTO`** — changes from DISPLAY_ONLY to AUTO. Combined with PAPER mode and an enabled account, this is what makes the system actually trade. Require explicit CLI confirmation with a summary of what will happen.
- Wire the signal loop: when ExecutionPolicy is AUTO and mode is PAPER, an approved signal constructs an OrderIntent, runs it through RiskGate (real evaluation, not dry-run), and on approval submits via the order router to OandaBrokerAdapter.
- The PaperBroker remains available and selectable — the account's broker config determines which adapter is used, not the mode.

### 5. Reconciliation loop — real implementation

The Phase 0 scaffold becomes real:
- Poll OANDA's transaction stream (`/v3/accounts/{id}/transactions/sinceid`) to detect fills, cancellations, and modifications that happened at the venue.
- Compare venue state against local state. Discrepancies written to `risk_events`.
- In PAPER mode (which is what we're in this phase), an unresolved discrepancy logs a warning and surfaces on the dashboard. In LIVE mode (future), it would set HALT — implement that branch now but it won't fire yet.
- Track the `lastTransactionID` watermark so reconciliation is incremental, not a full rescan.

### 6. Dashboard updates

- **Positions page**: real positions from OANDA practice with live P&L (from streaming quotes), entry price, stop level, size, duration, and provenance.
- **Feed health**: OANDA pricing feed status with spread monitoring.
- **Account state**: balance, equity, margin, unrealised P&L — all from OANDA with age displayed.
- **Order history**: submitted orders with their venue acknowledgement, fill details, and linked RiskGate decision.

### 7. Instrument spec replacement

Replace the `seed:operator-supplied-defaults` instrument row for GBP/USD with real contract specs from OANDA's instruments endpoint. This is a migration or a seed update — the values come from the Step 1 introspection, not from documentation or memory. Mark the source as `'oanda.instruments.v3'` with the retrieval timestamp.

### 8. Migrations

New migration(s) in the autotrader runner: broker_connections table (account_id, broker_name, environment, endpoint config — no credentials, those stay in env vars), spread_thresholds on risk profiles, any columns needed for reconciliation watermarks and venue-assigned IDs. All in `autotrader.*`.

### 9. Tests

**Mandatory — these block completion:**
- **Adapter contract tests**: OandaBrokerAdapter passes the same BrokerAdapter contract test suite that PaperBroker passes. If PaperBroker's tests are adapter-generic, run them against both. If not, make them generic first.
- **Token verification at the adapter boundary**: submit an order with a forged/expired/mismatched token → UnapprovedOrderError, never reaches OANDA.
- **Rate limiter**: prove a burst of requests queues rather than fires, and that a 429 never reaches the adapter.
- **Zod validation**: malformed OANDA response → loud rejection with the raw payload logged, not a silent coercion.
- **Order non-retry**: a failed submission does not retry. Test this explicitly.
- **Reconnection**: streaming disconnect → reconnect with backoff → health transitions FEED_OFFLINE → OK.
- **Reconciliation**: simulate a discrepancy (local says SUBMITTED, venue says FILLED) → risk_event created.
- **Spread threshold**: wide spread → DEGRADED health → RiskGate rejects.
- **End-to-end (against OANDA practice)**: signal → VENUE_NATIVE quote → RiskGate approves → order submitted → fill confirmed → position visible → reconciliation clean. This is the proof that the system works. Run it once, paste the full output, including the audit_log entry showing the complete RiskInputSnapshot with venue-native pricing.
- All Phase 0 and Phase 1 tests still green.

### 10. Documentation

- Update `docs/ARCHITECTURE.md`: add the OANDA adapter, the streaming pricing feed, the reconciliation flow, and the mode-promotion sequence.
- Update `docs/RUNBOOK.md`: OANDA connection troubleshooting, rate-limit warnings, reconnection behaviour, how to promote from OBSERVE → PAPER → (future) LIVE.
- `docs/OANDA_SETUP.md`: step-by-step for setting up a practice account and configuring the adapter — written so a second developer can onboard without tribal knowledge.

## WHAT NOT TO BUILD

No LIVE mode promotion (stays in PAPER). No MetaApi/MT5 adapter. No IG adapter. No additional instruments beyond GBP/USD (add more after the first one works end-to-end). No Claude API. No backtest engine. No billing. No dashboard auth (tracked on exit checklist). No strategy logic — signals come from signalcentre, execution decisions come from RiskGate, there is no "strategy" layer yet.

## VERIFICATION DISCIPLINE

Same rules, higher stakes. Every claim of completion must show:
- `pnpm test` full output (all packages green).
- `autotrader verify` full output (OANDA connectivity, quote freshness, reconciliation status).
- The end-to-end test output: from signal ingestion through to OANDA practice fill, with the audit_log entry.
- `pnpm build` green.

Do not report any adapter method as working without showing the actual OANDA API response it produced. Mocked tests prove the adapter's logic; only a real API call proves the adapter works.

## DELIVERABLES

1. Step 1 introspection findings (the pause).
2. OandaClient with rate limiting, Zod validation, retry policy.
3. OandaBrokerAdapter passing the full contract test suite.
4. OandaPricingFeed with streaming, spread monitoring, and VENUE_NATIVE quotes.
5. Mode promotion CLI commands working (account enable, mode set, policy set).
6. Reconciliation loop running against real OANDA state.
7. Dashboard pages updated with live OANDA data.
8. GBP/USD instrument spec replaced with real OANDA values.
9. Migrations applied (paste real output).
10. Full test suite green including the end-to-end (paste real output).
11. `autotrader verify` with OANDA sections (paste real output).
12. Documentation updated.

Begin with Step 1 — tell me the env var names you need, and stop after presenting the API exploration findings.
