# MERIDIAN — Claude Code Prompt Pack

**How to use this.** One prompt per session. Do not batch. After each, Claude Code must produce the verification evidence named in that prompt — production output, not a self-report. If evidence is missing, the correct reply is "show me the output," not the next prompt.

`CLAUDE.md` must be at the repo root before Prompt 0.

Prompts 0–8 are the platform. 9–15 are scale and are outlined rather than fully written, because their real shape depends on what Phases 1–8 teach you.

---

## PROMPT 0 — FOUNDATION

```
Read CLAUDE.md fully before doing anything. It is binding.

Build the MERIDIAN monorepo foundation. No features. No data. A blank
authenticated shell only.

This foundation must carry sixty-plus data sources, eight pillars,
continuous three-model inference and live gated execution. Build it for
that load now. Everything after this is loading, not restructuring.

DELIVER

1. pnpm + Turborepo monorepo, TypeScript strict:
   apps/terminal (Next.js 15 App Router), apps/engine (Node worker),
   apps/scheduler
   packages/core registry adapters resolve signals council delta salience
            edge horizon risk execute brief automation ui
   infra/supabase

   Every package scaffolded with its entry point and a stub type surface,
   even where empty. I want the shape visible from day one.

2. packages/core — the type foundation. Everything depends on this.
   - Pillar enum (WORLD, MARKETS, HORIZON, UNDERCURRENT, ALTERNATIVES)
   - Observation exactly as specified in CLAUDE.md
   - Entity, EntityType, EntityIdentifier (LEI, CIK, ISIN, ticker,
     Companies House number, exchange symbol, internal)
   - SourceHealth, Cadence, LicenceClass, TimeWindow, RawPayload
   - Result<T,E> — no thrown errors across package boundaries
   - core/money: scaled-integer Money and Price with arithmetic helpers.
     Constructing one from a float must be a type error, not a runtime
     check.

3. packages/registry — typed, versioned source registry. Per source: id,
   name, pillar, category, cadence, licence_class, redistributable, auth
   method, base URL, quota, cost model, staleness SLA seconds, wave number.
   No adapter may hardcode any of this.
   Seed with the full Wave 1 list from the brief (~18 entries) as registry
   rows with NO adapters. They must render as NOT_CONNECTED later. This
   proves the registry and the adapters are properly decoupled.

4. packages/ui — design tokens. If a Signal Centre repo is present locally,
   COPY its token file verbatim and tell me the path. Do not re-derive from
   description. If absent, use the values in CLAUDE.md and flag clearly in
   your summary that they are approximations requiring replacement.

5. infra/supabase — initial migration:
   sources, entities, entity_identifiers, observations, source_health,
   spend, audit_log.
   observations partitioned by month.
   DB-level CHECK constraints: NOT NULL on licence_class, pillar,
   source_timestamp, captured_at. The database rejects unprovenanced data,
   not just the application.
   audit_log is append-only — enforce with a trigger blocking UPDATE and
   DELETE.

6. CI (GitHub Actions) implementing every gate listed in CLAUDE.md,
   including the float check, the broker-SDK check, and the
   forbidden-route-name check.

7. apps/terminal: a single authenticated route rendering the word MERIDIAN
   in the design system. Nothing else.

CONSTRAINTS
- No mock data anywhere including tests. Test fixtures live under
  __fixtures__ and are obviously synthetic.
- No signup route may exist.
- Do not install a charting library or any broker SDK.

VERIFY
- Output of pnpm build and pnpm test
- Output of the CI run showing every gate present
- Applied migration list from Supabase
- Paste the SQL you ran attempting to insert an observation with null
  licence_class, and the error returned
- Paste the SQL you ran attempting to UPDATE an audit_log row, and the error
- Paste the TypeScript error produced by attempting to construct a Money
  from a float
- Deployed URL and commit hash
```

---

## PROMPT 1 — THE SPINE AND THE HEALTH BOARD

```
Read CLAUDE.md. Phase 1: the ingestion harness and source health.

The harness is the most important thing in this build. Once it exists,
adding a source is roughly a day's work. If it is wrong, sixty adapters get
rewritten. Take the time.

Health is built before anything is made pretty. Silent feed failure is the
single most damaging failure mode in a platform like this — a missing key in
a deploy environment producing an empty table with nothing surfacing it.

DELIVER

1. packages/adapters — the Adapter interface exactly as in CLAUDE.md, plus
   the runner in apps/engine:
   - resolve adapter from registry
   - persist raw payload to R2 BEFORE parsing; raw_ref on every observation
     points at it
   - validate with Zod at the boundary
   - write observations in one transaction
   - record SourceHealth on every run, success or failure
   - record request and credit cost to spend
   - never throw past its boundary: failure becomes FEED_OFFLINE
   - concurrency control, per-source rate limiting from registry quota,
     exponential backoff, and a circuit breaker

   Adding a source must require zero changes to the runner. Prove this.

2. Five real adapters against real endpoints, one per pillar, to prove the
   harness generalises:
   - fred          (WORLD)         — 12 macro series
   - twelve_data   (MARKETS)       — a defined instrument set across FX,
                                     indices, commodities, crypto
   - sec_edgar     (HORIZON)       — full-text search, new filings by form
                                     type, including S-1 and F-1
   - usaspending   (UNDERCURRENT)  — federal contract awards
   - kalshi        (ALTERNATIVES)  — event contract markets and prices

3. Staleness: derived at write time from source_timestamp. Per-source SLA in
   the registry. Breach = DEGRADED. No successful fetch in three cadence
   windows = OFFLINE.

4. The health board at /health, per source: last successful fetch, expected
   cadence, staleness vs SLA, 24h error rate, rows written last window,
   quota consumed month to date, cost month to date, state
   (HEALTHY / DEGRADED / OFFLINE / NOT_CONNECTED).
   Registry entries with no adapter show NOT_CONNECTED — not zeros, not
   blank. All ~18 Wave 1 rows must appear.

5. apps/scheduler — cron per registry cadence, plus an idempotent backfill
   command replaying any adapter over any window.

CONSTRAINTS
- Missing API key means NOT_CONNECTED, named explicitly on the board. Never
  silent, never a fallback.
- Idempotency enforced by unique constraint, not application logic.

VERIFY
- Production curl of /api/health returning real JSON for all five adapters
  and all NOT_CONNECTED registry rows
- SQL: observation count per source with min and max source_timestamp
- Unset one source's key in the deployed environment; show the board naming
  it; restore; show recovery
- Run the same backfill window twice; show row count unchanged
- Add a trivial sixth adapter and show the diff touched zero runner files
```

---

## PROMPT 2 — THE TERMINAL SHELL

```
Read CLAUDE.md. Phase 2: the authenticated terminal in the Signal Centre
design language.

DELIVER

1. Auth — Supabase Auth, single user.
   - Email allowlist of exactly one address in config
   - TOTP 2FA mandatory
   - No signup route exists. Absent, not disabled.
   - Middleware protects every route including API routes. Default deny.
   - Server-side sessions.

2. Layout — dense terminal shell:
   - Persistent left nav
   - Top bar: global staleness indicator (amber and named when any source
     is DEGRADED, red when any is OFFLINE), current automation tier, and
     THE KILL SWITCH — always visible, one click, halts all automation
   - Content area. No footer.

3. Nav — the eight pillars plus operations. Stubbed except Health:
   Brief · Edge · World · Markets · Horizon · Undercurrent · Alternatives ·
   Council · Machine · Book · Sources · Health

4. packages/ui built out properly:
   - Value — the most important component in the application. Mono numeric,
     unit, staleness badge, source tooltip. It must be TYPE-IMPOSSIBLE to
     render a figure without source and timestamp. Not a convention — a
     type-level guarantee. Every number in this platform goes through it.
   - DataTable (dense, sortable, hairline rules, virtualised for 10k+ rows)
   - SourceBadge, StalenessBadge, ConfidenceBar, DisagreementBar
   - StateBanner (NOT_CONNECTED / FEED_OFFLINE / DEGRADED)
   - Panel, Rule, MetricCell, PillarTag, KillSwitch

5. /health rebuilt in the real design system.

CONSTRAINTS
- Motion near-zero. No page transitions, no scroll animation.
- No skeleton loaders implying data exists. Loading says "fetching"; empty
  says why it is empty.

VERIFY
- Deployed URL, commit hash
- Demonstrate 2FA enforcement
- grep for signup/register/subscribe routes returning nothing
- Unauthenticated curl of a protected API route being rejected
- Paste the TypeScript error from attempting to render Value without a source
- Screenshot of /health
```

---

## PROMPT 3 — ENTITY GRAPH AND THE BOOK

```
Read CLAUDE.md. Phase 3: entities, resolution, and personal context.
Nothing downstream can rank anything without this.

DELIVER

1. Entity model — company, instrument, person, government body, theme,
   commodity, location, event. Multiple identifiers per entity, each with
   source and confidence.

2. packages/resolve — entity resolution using the set-based union-find
   approach in DuckDB SQL that works on Faultline. Rules are explicit,
   versioned and auditable: every merge records which rule fired on which
   identifier match. Merges are reversible.

3. The Book — personal context:
   - watchlist: entity, why watched, added, review date
   - positions: instrument, direction, size (scaled integer), entry,
     current risk state. Manual entry in this phase; broker sync comes in
     Phase 11.
   - theses: text, linked entities, FALSIFICATION CONDITIONS (mandatory —
     a thesis without one cannot be saved), review date, confidence
   - questions: the standing questions I want answered weekly. These drive
     Council standing prompts and salience weighting.

4. /entities/[id] — the dossier. Every observation ever recorded against
   that entity, chronological, grouped by pillar, full provenance. Dense and
   complete. No summarisation yet.

5. Wire the five Phase 1 adapters to resolve entities where they can and
   leave entity_id null where they cannot. Unresolved observations are
   visible and counted, never discarded.

CONSTRAINTS
- Never silently merge on a fuzzy name match. Name-only matches become
  proposals in a review queue requiring my confirmation.
- The falsification requirement on theses is deliberate. Do not make it
  optional.

VERIFY
- SQL showing one real company resolved across SEC EDGAR and USAspending
  with the rules that fired
- Unresolved-observation count and rate per source
- A dossier page for a real entity with real observations
- Attempt to save a thesis without a falsification condition; show rejection
```

---

## PROMPT 4 — WAVE 1 LOAD

```
Read CLAUDE.md. Phase 4: load the remaining Wave 1 sources.

This is a volume phase, not a design phase. The harness exists; use it.
Do not modify the runner. If a source cannot be adapted without changing
the runner, STOP and tell me — that is a harness defect and I want to fix
it rather than special-case around it.

DELIVER — adapters for every remaining Wave 1 registry entry:

WORLD:        us_treasury_fiscal, ny_fed, atlanta_fed_gdpnow,
              cleveland_fed_nowcast, gdelt, eia
MARKETS:      finnhub, cftc_cot, fca_short_positions, coingecko, defillama
HORIZON:      nasdaq_ipo_calendar, companies_house
UNDERCURRENT: gleif, opencorporates
ALTERNATIVES: polymarket, manifold

For each: registry entry complete, adapter implemented, entity resolution
wired where applicable, canonical metric keys registered, health SLA set,
cost tracking live.

Also deliver a canonical metric dictionary in packages/core: every metric
key, its unit, its scale, its expected range and its change-threshold for
delta detection. Two sources reporting the same real-world quantity MUST map
to the same canonical metric key — that mapping is what makes contradiction
detection possible later.

CONSTRAINTS
- No runner changes. Report immediately if one seems necessary.
- Every source gets a real staleness SLA based on its actual publication
  cadence, not a default.
- Rate limits respected from registry quota. Do not burn a free tier.

VERIFY
- /health showing all ~18 sources HEALTHY or explicitly NOT_CONNECTED with
  a named reason
- SQL: observation count by source and by pillar, with min/max timestamps
- The metric dictionary, with at least three examples of two different
  sources mapping to the same canonical key
- Confirmation that zero runner files were modified — show the diff summary
```

---

## PROMPT 5 — THE HORIZON

```
Read CLAUDE.md. Phase 5: THE HORIZON — everything that is coming.

This is the most differentiated pillar in the platform. Almost nothing off
the shelf does this properly. Build it carefully.

DELIVER

1. packages/horizon — a unified forward event model:
   HorizonEvent { id, kind, entity_id, title, scheduled_at,
                  date_confidence (CONFIRMED | ESTIMATED | RUMOURED),
                  window_start, window_end, source_ids[], pillar_context,
                  expected_impact, book_relevance, market_odds }

   Kinds to support: IPO_PRICING, IPO_FILING (S-1/F-1), DIRECT_LISTING,
   LOCKUP_EXPIRY, TOKEN_UNLOCK, EARNINGS, CENTRAL_BANK_DECISION,
   CENTRAL_BANK_SPEECH, ECONOMIC_RELEASE, INDEX_REBALANCE, BOND_AUCTION,
   OPTIONS_EXPIRY, REGULATORY_DEADLINE, COURT_DATE, ELECTION,
   COMMODITY_REPORT, DIVIDEND, BUYBACK, PRODUCT_LAUNCH, PATENT_GRANT.

2. Feed it from what is already ingested: SEC EDGAR (S-1/F-1 = the earliest
   possible IPO signal, well ahead of any calendar aggregator), Nasdaq IPO
   calendar, Finnhub earnings and economic calendars, CFTC report schedule,
   EIA schedule, Companies House, Federal Register effective dates,
   CourtListener docket dates.

3. Attach prediction market odds. For every horizon event, search Kalshi,
   Polymarket and Manifold for a market referencing the same outcome and
   attach current odds plus their movement. Matching is fuzzy — surface it
   as a PROPOSED link requiring my confirmation, and learn from confirmed
   links. Never auto-attach on a weak match.

4. Deduplicate across sources. The same IPO arriving from EDGAR, Nasdaq and
   Finnhub is ONE event with three sources and possibly three conflicting
   dates. Show all three dates and their sources. Do not silently pick one.

5. /horizon — one time-ordered board. Filters: pillar, asset class, kind,
   date confidence, and "touches my book". Views: next 24h, week, month,
   quarter, unscheduled-but-forming.

CONSTRAINTS
- An estimated date is never displayed as confirmed. date_confidence renders
  visibly on every row.
- An event with conflicting dates across sources shows the conflict. That
  disagreement is information.

VERIFY
- The board with real events from at least six distinct sources
- A real S-1 detected from EDGAR that has not yet appeared on the Nasdaq
  calendar — this proves the earliest-signal claim
- One event with a prediction market attached, and one with a proposed
  attachment awaiting confirmation
- One deduplicated event showing conflicting dates from multiple sources
```

---

## PROMPT 6 — DELTA AND SALIENCE

```
Read CLAUDE.md. Phase 6: change detection and ranking. This is where the
platform stops being a database and starts being useful.

DELIVER

1. packages/delta:
   - NEW: first observation of a metric
   - CHANGE: beyond the per-metric threshold in the dictionary
   - ACCELERATION: rate-of-change breach. For most of these series the
     second derivative matters more than the level.
   - REGIME: a series crossing out of its historical distribution
   - HEALTH: a source going DEGRADED or OFFLINE is itself a delta
   - CONTRADICTION: two sources disagreeing beyond tolerance on the same
     canonical metric and entity. First-class object. Store both values,
     both provenances. Never reconcile silently.
   - HORIZON_SHIFT: a horizon event's date or odds moving materially

   Deltas are persisted, immutable, and reference their source observations.

2. packages/salience — deterministic scoring, 0-100. NO LLM in this package.
   Explicit weighted components in ONE versioned config file:
   - Position exposure: do I hold something affected
   - Watchlist proximity: on the watchlist, or one hop away in the graph
   - Thesis relevance: does this bear on a stated thesis, and does it
     SUPPORT or FALSIFY it. Falsifying evidence scores strictly higher than
     confirming evidence. This single weighting is the most valuable
     behaviour in the system — make it explicit and prominent in the config.
   - Standing question relevance: does it bear on one of my weekly questions
   - Magnitude relative to that metric's own historical distribution
   - Novelty: is this a repeat of something surfaced this week
   - Source confidence
   - Horizon proximity: is a related dated event imminent

   Every score is interrogable: given a delta ID, return the full component
   breakdown that produced it.

3. Historical re-scoring: change the weights, re-score any past window, and
   diff what the platform would have surfaced.

CONSTRAINTS
- No machine learning. No embedding-based ranking. Explicit weights only.
  I need to be able to argue with the score.
- Salience is computed once and stored, not recomputed on render.

VERIFY
- Ranked delta list from real data with real scores
- Full component breakdown for the top five
- A real CONTRADICTION delta; if the data has not produced one, construct
  the condition using two genuine sources and show it firing
- Re-score a historical window under two weight configs and diff the output
```

---

## PROMPT 7 — THE COUNCIL

```
Read CLAUDE.md. Phase 7: three frontier models running continuously,
plus the Adversary.

DELIVER

1. packages/council — orchestration across Claude (claude-sonnet-4-6),
   GPT and Grok. Three fixed standing roles:
   - RISK_MACRO_OFFICER (Claude): invalidations, counter-scenarios, central
     bank read, what breaks the thesis, position risk
   - PORTFOLIO_STRATEGIST (GPT): confluence, structure, multi-timeframe
     synthesis, correlation with existing book
   - SENTIMENT_NARRATIVE_ANALYST (Grok): narrative shift, crowd positioning,
     contrarian read, retail flow

   Each receives the SAME structured input: the ranked deltas, relevant
   observations, horizon events and book context. Each returns structured
   output independently. Parallel dispatch, per-model timeout and failure
   handling — one model failing degrades the council, it does not break it,
   and the degradation is shown.

2. Disagreement as a first-class object. Compute an agreement score per
   topic. Where models diverge, store and display the divergence. Never
   average, never merge, never drop the outlier. Three models disagreeing
   about GBP is information.

3. THE ADVERSARY — a separate scheduled pass whose only job is to attack
   the platform's own highest-conviction items. Not a fourth opinion: an
   attempt at demolition. It receives the top Edge candidates and is
   instructed to find what is wrong with them — what data is missing, what
   the base rate says, what the correlation risk is, what would have to be
   true for this to be a bad trade. Every top-conviction item passes through
   it before it can rank.

4. Continuous operation: scheduled passes, not on-demand only. Cache output
   against a hash of the input set. Never re-run on unchanged data. Meter
   token spend per model per run into the spend table, surfaced on /health.

5. /council — current standings, per-model views side by side, agreement
   scores, divergences, and the Adversary's most recent attacks.

CONSTRAINTS
- The citation rule applies in full. Every factual claim from any model
  carries observation or delta IDs. Validate programmatically after
  generation; log and report the rejection rate.
- No model may introduce a fact not in its input set. Verify this
  post-generation: every named entity and every figure in the output must
  appear in the input. Report any that do not.
- Ban hedging language. Confidence is numeric.

VERIFY
- A real council run over real deltas, all three models, output shown
- A real disagreement, displayed and scored
- A real Adversary pass attacking a real top-conviction item
- The citation validation log: generated, rejected, and why
- The entity/figure verification result
- Token spend for the run, per model, on /health
- Kill one model's API key and show graceful degradation
```

---

## PROMPT 8 — THE EDGE AND THE BRIEF

```
Read CLAUDE.md. Phase 8: the two surfaces I actually look at.

DELIVER

1. packages/edge — the standing, ranked, cross-asset opportunity board.
   Each Edge carries:
   - Asset class, instrument, direction, horizon
   - Conviction score, derived from salience + council agreement + Adversary
     survival. Show the derivation.
   - The evidence chain: every claim traced to observations
   - All three council views and their disagreement
   - The Adversary's attack and whether the thesis survived it
   - FALSIFICATION CONDITION: what specifically kills this
   - Proposed structure: entry zone, invalidation, targets, R:R
   - Sizing against live risk headroom (from packages/risk; DISPLAY ONLY at
     this phase — nothing is sent anywhere)
   - Correlation with what I already hold

   An Edge without a falsification condition cannot be created. An Edge that
   has not passed the Adversary cannot rank in the top tier.

2. packages/brief — the daily read, generated and on demand:
   - Header: generation time, window, sources healthy vs degraded (named),
     deltas considered, council agreement level
   - THESIS PRESSURE FIRST — anything falsifying a thesis I hold leads,
     above everything, regardless of magnitude
   - Position-relevant changes
   - New and moved horizon events touching my book
   - Watchlist changes
   - Cross-source contradictions
   - Answers to my standing weekly questions
   - Context: notable changes with no current relevance, capped short

3. Full drill-down: Edge → claim → delta → observation → raw payload in R2.
   Every link traversable, always.

4. /edge as the default landing route. /brief one click away.

CONSTRAINTS
- Structured output, not prose blobs: every claim is
  { claim, citations[], salience, kind }. Empty citations means rejected at
  the validation boundary and never rendered.
- If nothing clears the salience floor, the Brief says "quiet window" and
  stops. It must never pad.
- Sizing is display-only in this phase. No path from here to a broker
  exists yet.

VERIFY
- A real Edge board from real data, top item fully expanded
- A real generated Brief
- Full drill-down demonstrated end to end for one claim
- An Edge that failed the Adversary and was demoted, with the reasoning
- Force a quiet window and show it refusing to pad
- The citation rejection log
```

---

## PROMPTS 9–15 — SCALE (outline)

Write these properly once 0–8 are in daily use. Their real shape depends on what the Edge board turns out to surface.

**9 — WAVE 2 LOAD (~20 sources).** Quiver, Capitol Trades and OpenInsider (cross-validated — the contradiction detector earns its keep here), Stocktwits, ApeWisdom, Google Trends, Wikipedia pageviews, TAAPI, CoinGlass, Dune, Polygon, EODHD, FMP, ENTSO-E, Elexon, Federal Register, CourtListener, WARN notices, ESMA shorts, prediction market aggregators. **The priority deliverable is not the adapters — it's the joins**: congressional purchase + federal contract award + hiring surge + patent grant, on one entity, one dated row. Build the join, not twenty panels.

**10 — AUTOMATION TIERS 1–3.** `packages/automation`: trigger → condition → tier → action. Tier 1 WATCH (thresholds, digests, anomalies). Tier 2 RESEARCH (agentic gather across pillars, run Council, produce a cited dossier). Tier 3 PREPARE (complete approval-ready trade ticket: entry, invalidation, targets, size, correlation check). **Tier 4 is not built in this phase and no code path toward it may exist.** Every rule is versioned, every firing is logged, every rule has a dry-run mode showing what it would have done over the last 30 days before you enable it.

**11 — RISK AND EXECUTION.** Port `packages/risk` and `packages/execute` from the existing autotrader — the three-layer RiskGate, HMAC ApprovalToken, mode state machine, FTMO_STANDARD profile and its 307 tests. Port, do not re-derive. Add OANDA first. Broker position sync into the Book. Mode stays OBSERVE. Full test suite must pass in the new monorepo before anything else in this phase is accepted.

**12 — AUTOMATION TIER 4.** Live gated execution. PAPER mode for a minimum defined period first. Per-strategy whitelisting. Kill switch verified under load. Correlation limits, news blackout, daily loss and drawdown caps enforced by the gate, not by the automation rule. Ships with Tier 4 disabled; you enable it deliberately, once.

**13 — WAVE 3 LOAD (~15 sources).** Databento (re-quoted as internal non-display), Unusual Whales, Ortex, Fintel, WhaleWisdom, sec-api.io, Renaissance IPO Pro, AISStream, OpenSky, ADS-B Exchange, Keepa, UN Comtrade, Land Registry, LunarCrush, FDA/EMA calendars.

**14 — RESEARCH MEMORY.** RAG over the full accumulated corpus and every Brief, Edge, Council output and Adversary attack ever generated. Historical questions answered with citations. This is the layer that compounds — and it only works if Phases 0–13 have been quietly accumulating clean, well-provenanced data for months. Which is the entire reason the observation model in Prompt 0 matters more than anything visual.

**15 — WAVES 4/5.** Satellite (via SkyFi, not enterprise), Forge or Caplight, Liv-ex, Card Ladder or Card Hedge, Chartmetric, EstiBot, foot traffic, web traffic, deep on-chain, the alternatives long tail. **Only against a named question you actually want answered.** Do not buy the category.

---

## SESSION DISCIPLINE

Start of every session:
> Read CLAUDE.md. State the three rules most binding on today's task before you begin.

End of every session:
> State what is complete with production evidence, what is incomplete, what you assumed, and what you would push back on in the plan. Do not claim completion without evidence.

If Claude Code reports a phase complete without the named verification artefacts, the phase is not complete. That standard is what caught fabricated completion claims on previous builds, and on a platform that will eventually place real orders it matters considerably more than it did then.
