# MERIDIAN
## The Flagship Intelligence & Execution Platform

**Prepared for:** Pete Currey
**Date:** 29 July 2026
**Status:** Pre-build, greenfield. Not a remodel of anything.
**Codename:** MERIDIAN — the line of the sun's highest point, and a navigational term. Alternatives if you want them: ATLAS, LODESTAR, PARALLAX, VANTAGE, THE FLOOR. Held in one config constant; renaming is a one-line change, so don't spend a week on it.

---

## 1. WHAT THIS IS

A single terminal that answers four questions continuously, across every asset class you can buy:

> **What is happening. What is moving. What is coming. What should I do about it.**

And then, where you allow it, **does something about it**.

Conventional and alternative, FX and farmland, indices and IPOs, crypto and carbon, in one login. Three frontier AI models running over all of it continuously, with disagreement preserved rather than averaged away. An automation layer that escalates from alerting through research to prepared trades to gated execution.

Signal Centre and the autotrader are **modules inside this**, not the foundation of it. MERIDIAN has its own signal engine, its own AI council, its own risk layer. Where you've already built something proven — the FTMO risk profile logic, the HMAC approval token, the mode state machine — that code gets **lifted into this monorepo as packages**. That isn't a remodel; that's not re-deriving six weeks of tested risk logic for no reason.

---

## 2. THE EIGHT PILLARS

Everything in the build maps to one of these. If a feature doesn't, it doesn't get built.

### I. THE WORLD — *what is happening*
Global state. Macro releases, central bank communications, geopolitics, conflict, energy and power grids, trade flows, weather, elections, regulation, litigation. The context layer that explains why everything else is moving.

### II. THE MARKETS — *what is moving*
FX, indices, commodities, crypto, equities, rates, options, futures. Price, volatility, volume, order flow, correlation, cross-asset regime state. Everything you can put a bid and ask against.

### III. THE HORIZON — *what is coming*
**This is the pillar you named that most platforms don't have, and it's the most differentiated thing here.** A single forward calendar of everything scheduled or forming:

IPOs and pricings · S-1 / F-1 filings before they hit any calendar · direct listings and SPACs · Reg A+ and Reg D private placements · token generation events and unlock schedules · earnings dates and pre-announcements · central bank meetings and speech calendars · economic release schedules · index rebalances and reconstitutions · lockup expiries · bond auctions · dividend and buyback announcements · FDA and EMA decision dates · patent grants and expiries · regulatory comment-period closes and rule effective dates · elections and referenda · court dates and verdict windows · commodity report dates (WASDE, EIA, COT) · options expiry and quad witching · prediction market odds attached to every dateable event above.

Rendered as one time-ordered board, filterable by asset class and by whether it touches your book. Nothing off the shelf does this properly.

### IV. THE UNDERCURRENT — *what is hidden*
Alt-data. Congressional and insider trades, institutional 13F flow, options sweeps and dark pool prints, short interest and borrow costs, government contract awards, satellite and SAR imagery, AIS shipping and tanker positions, corporate jet movements, hiring and layoffs, web and app traffic, foot traffic, patent filings, import/export customs, on-chain flows, social and retail sentiment.

The value here is not the individual feeds — it is the **joins**. Congressional purchase + federal contract award to the same issuer + hiring surge + patent grant, on one entity, on one dated row. No vendor sells that. You'd be manufacturing it.

### V. THE ALTERNATIVES — *beyond the conventional*
Prediction markets and event contracts · pre-IPO and private company pricing · fine wine and whisky · trading cards and memorabilia · classic cars and watches · sneakers and streetwear · farmland, timber and property indices · music royalties · carbon credits · domain names · art.

Some of these are genuinely tradeable for you. Most are, honestly, a *pricing* layer rather than an *execution* layer — you'll watch far more of this than you buy. That's still valuable: it's the part of the investable universe every other terminal ignores entirely.

### VI. THE COUNCIL — *the AI layer*
Claude, GPT and Grok running **continuously**, not on request. Three distinct standing roles, same as the Signal Centre pattern but applied to the whole platform rather than one instrument:

- **Risk & Macro Officer** (Claude) — invalidations, counter-scenarios, central bank read, what breaks the thesis
- **Portfolio Strategist** (GPT) — confluence, structure, multi-timeframe synthesis, position context
- **Sentiment & Narrative Analyst** (Grok) — narrative shift, crowd positioning, contrarian read, retail flow

Plus a fourth standing pass that is genuinely rare and genuinely valuable:

- **The Adversary** — a scheduled run whose only job is to attack the platform's own highest-conviction position. Not a fourth opinion; an attempt at demolition. Every top-conviction item gets one before it earns its rank.

Agreement scores are displayed. **Disagreement is never suppressed** — where the models diverge, that divergence is stored as a first-class object and shown, because three models disagreeing about GBP is information.

### VII. THE EDGE — *what should I do*
The synthesis surface, and the headline object of the platform. A standing, ranked, cross-asset opportunity board. Every entry carries:

conviction score · the evidence chain (every claim traced to a source row) · the council's three views and their disagreement · **the falsification condition** — what specifically would kill this · asset class, instrument, direction, horizon · proposed structure: entry zone, invalidation, targets, R:R · position sizing against your live risk state · and how it correlates with what you already hold.

Plus **The Brief**: the daily read. What changed since you last looked, what falsified a thesis you hold, what's newly on the horizon, ranked by relevance to your actual book.

Falsifying evidence always ranks above confirming evidence. That single weighting decision is worth more than half the feeds.

### VIII. THE MACHINE — *automation*
Four escalating tiers. You choose the tier per rule; nothing skips a level.

| Tier | Name | What it does | Approval |
|---|---|---|---|
| **1** | **WATCH** | Thresholds, alerts, scheduled digests, anomaly detection | None needed |
| **2** | **RESEARCH** | When a trigger fires, agentically gather related data across pillars, run the Council, produce a written, cited dossier | None needed |
| **3** | **PREPARE** | Build the complete trade: entry, invalidation, targets, size against live risk headroom, correlation check — as an approval-ready ticket | None; nothing is sent |
| **4** | **EXECUTE** | Places the trade | **Through the risk gate, always. Mode state machine. No OBSERVE→LIVE jump.** |

Tier 4 exists, and it's the point of the build. It is also the tier where every safeguard lives: hard risk profile limits, daily loss and drawdown caps, news blackout windows, correlation limits, per-strategy whitelisting, and a kill switch that is a single obvious control on every screen. Money is stored as scaled integers; floats are banned anywhere near it.

---

## 3. ARCHITECTURE

### 3.1 The load-bearing principle

The foundation has to carry sixty-plus feeds, eight pillars, continuous multi-model inference and live execution. So it gets **built to carry all of that from day one** — and then feeds get loaded in waves.

This is not scope-cutting. It's the opposite. If you wire fifteen feeds before the observation model, the entity graph and the adapter harness exist, you will rewrite all fifteen. Once the harness exists, an adapter is roughly a day. Fifteen feeds is three weeks of steady loading, not a project.

**Build the harness for sixty. Load in waves of fifteen.**

### 3.2 Shape

Monorepo. pnpm + Turborepo + TypeScript strict.

```
meridian/
  apps/
    terminal/         Next.js 15 App Router — the console
    engine/           Persistent Node worker: ingestion + council + automation
    scheduler/        Cron orchestration, backfill, replay
  packages/
    core/             Observation model, entity model, money (scaled int), Result
    registry/         Source registry — single source of truth for every feed
    adapters/         One package per source, uniform interface
    resolve/          Entity resolution (union-find in DuckDB, per Faultline)
    signals/          Native signal engine — gauges, scoring, horizon guard
    council/          Three-model orchestration + Adversary + disagreement model
    delta/            Change detection, contradiction detection
    salience/         Deterministic ranking against book, watchlist, theses
    edge/             Opportunity construction: structure, sizing, correlation
    horizon/          The forward calendar engine
    risk/             Risk gate, profiles, mode state machine  [PORT existing]
    execute/          Broker adapters behind the gate           [PORT existing]
    brief/            Daily synthesis with mandatory citation
    automation/       Trigger → tier → action engine
    ui/               Design system
  infra/
    supabase/         Migrations
```

### 3.3 Storage

- **Postgres (Supabase, dedicated project):** entities, registry, current state, ~90 days of observations, deltas, horizon events, council outputs, edges, book, theses, automation rules, audit log. Everything the terminal reads.
- **Parquet on Cloudflare R2 + DuckDB:** deep history, bulk datasets, satellite-derived series, full filing archives, raw payload store. You already run this pattern on Faultline.
- **Raw payload archive is mandatory.** Every fetch is persisted before parsing. When you find a parsing bug in month eight, you re-derive from raw rather than losing eight months.

### 3.4 The observation model

Non-negotiable, and the one thing that must be right on day one because everything else is replaceable.

```ts
type Observation = {
  id: string;
  source_id: string;
  entity_id: string | null;
  pillar: Pillar;                 // I-V, for routing and filtering
  metric: string;                 // canonical key
  value_numeric: bigint | null;   // scaled integer — floats banned
  value_scale: number | null;
  value_text: string | null;
  unit: string | null;
  source_timestamp: string;       // when the source says it happened
  captured_at: string;            // when we fetched it
  staleness_seconds: number;
  confidence: number;             // 0-100
  licence_class: LicenceClass;
  redistributable: boolean;
  raw_ref: string;                // pointer into R2
};
```

Enforced at the database level with CHECK constraints, not just in application code.

### 3.5 The `redistributable` flag — why it's there

You said it yourself: *"before we consider rolling this out with a marketing website and membership."* That's a business requirement you've already stated, not caution I'm imposing.

Private single-user internal use is dramatically cheaper and simpler than redistribution. Databento's CME quote, exchange fees, scraped sources, FCA financial promotion — all of it changes the moment a second person logs in. If every observation carries its licence class from row one, the commercial version can mechanically filter what it's permitted to display. If it doesn't, you'll be auditing sixty adapters by hand under time pressure.

Five minutes now. Six months later otherwise.

### 3.6 Design

The Signal Centre visual language, applied at flagship scale. Port the token file from that repo verbatim rather than re-deriving it.

White `#FFFFFF` · surface `#F7F7F5` · ink `#14181B` · muted `#6B7280` · navy `#1C3A5E` · accent chartreuse `#C8F135`, used sparingly · hairline `1px` borders `#E4E4DF` · no shadows, no gradients, no glassmorphism · **monospace for every numeric value** · grotesk for prose · generous whitespace, thin rules, high density.

GSAP + ScrollTrigger, single Lenis instance on the GSAP ticker. IntersectionObserver remains prohibited. Motion near-zero — this is a terminal you'll have open eight hours a day.

---

## 4. THE DATA REGISTRY, BY PILLAR

**Cost band:** `FREE` · `£` <£50/mo · `££` £50–500 · `£££` £500+ · `ENT` contact sales
**Access:** `API` documented · `PART` scraper/unofficial/members-only · `NONE` product only
**Wave:** when it loads

### PILLAR I — THE WORLD

| Source | Gives you | Access | Cost | Wave |
|---|---|---|---|---|
| FRED | 800k US macro series — the backbone | API | FREE | 1 |
| US Treasury Fiscal Data | Auctions, debt, cash balance | API | FREE | 1 |
| NY Fed (SOFR, repo, SCE, Nowcast) | Funding stress — early warning nobody watches | API | FREE | 1 |
| Atlanta Fed GDPNow | Real-time GDP tracking | API | FREE | 1 |
| Cleveland Fed inflation nowcast | Beats consensus CPI regularly | API | FREE | 1 |
| Fed speech corpus + FOMC statement diff | **Statement-vs-previous text diff is a tradeable signal almost nobody automates** | API/PART | FREE | 2 |
| CME FedWatch | Implied rate probabilities | PART | FREE | 2 |
| BoE / ECB / BoJ / SNB calendars + ECB SDW | Non-US central banks | API | FREE | 2 |
| ONS / Eurostat / OECD / IMF / World Bank / BIS | Global official statistics | API | FREE | 2 |
| Trading Economics | 196 countries, forecasts, calendar | API | ££/ENT | 2 |
| GDELT | Global event + tone database. Massive, free, underexploited. | API | FREE | 1 |
| ACLED | Conflict event data | API | FREE/££ | 3 |
| Federal Register + Regulations.gov | Rule changes before they're news | API | FREE | 2 |
| CourtListener / RECAP | Federal dockets — litigation risk pre-press-release | API | FREE | 2 |
| EIA | Weekly energy inventories at source | API | FREE | 1 |
| ENTSO-E Transparency | EU power generation, flows, prices | API | FREE | 2 |
| Elexon BMRS / NESO | UK grid, imbalance pricing | API | FREE | 2 |
| NOAA/NWS + ECMWF open data | Weather | API | FREE | 3 |
| USDA NASS + WASDE | Crop reports at source | API | FREE | 2 |
| UN Comtrade + US Census trade | Global customs flows | API | FREE | 3 |
| Benzinga / Marketaux / NewsCatcher | News with sentiment | API | £/££ | 2 |
| RavenPack | Institutional news NLP | API | ENT | — |

### PILLAR II — THE MARKETS

| Source | Gives you | Access | Cost | Wave |
|---|---|---|---|---|
| Twelve Data | 70+ exchanges, FX, crypto, indices, 100+ indicators | API | £ | 1 |
| Polygon.io | US equities/options/FX, WebSocket, tick history | API | ££ | 2 |
| Databento | CME/NYMEX/CBOT/ICE direct, full order book | API | £££ | 3 |
| Finnhub | WebSocket trades, fundamentals, calendars | API | £ | 1 |
| EODHD | 150k tickers, 70+ global exchanges, non-US depth | API | £ | 2 |
| Financial Modeling Prep | EDGAR-sourced fundamentals, transcripts, DCF | API | £ | 2 |
| TAAPI.IO | Bulk multi-timeframe indicators, one call | API | ££ | 2 |
| CFTC COT + Bank Participation | Positioning | API | FREE | 1 |
| FCA short positions register | **Daily UK net shorts, free, barely built on** | API/CSV | FREE | 1 |
| ESMA short positions | EU equivalent | CSV | FREE | 2 |
| Ortex / Fintel | Short interest, borrow fees — two sources, cross-validated | API | ££ | 3 |
| Unusual Whales | Options sweeps, dark pool prints, borrow | API | ££ | 3 |
| CBOE / OCC | Exchange-native options data | API | ££/ENT | 4 |
| TradingView | Charting (embed — do not rebuild) | Widget | £ | 1 |
| CoinGecko | 18k coins, 1.5k exchanges, DEX | API | FREE/£ | 1 |
| CoinGlass | Funding, open interest, liquidations | API | ££ | 2 |
| DefiLlama | TVL, protocol data — free and best-in-class | API | FREE | 1 |
| Dune Analytics | SQL across chains. Enormous leverage per pound. | API | ££ | 2 |
| Glassnode / CryptoQuant / Nansen / Arkham | Deep on-chain | API | £££ | 4 |
| LME / Baltic / Drewry / Freightos | Metals and freight | API/ENT | £££ | 4 |

### PILLAR III — THE HORIZON

| Source | Gives you | Access | Cost | Wave |
|---|---|---|---|---|
| SEC EDGAR (Submissions, XBRL, Full-Text) | S-1/F-1/Form D/Reg A+ — earliest IPO signal, ~60s indexing | API | FREE | 1 |
| sec-api.io | EDGAR wrapped, 300ms indexing, XBRL parsed | API | ££ | 3 |
| Nasdaq IPO Calendar | Free baseline expected/priced deals | PART | FREE | 1 |
| Renaissance Capital IPO Pro | Industry-standard calendar, lockups, index | API on request | ££ | 3 |
| Finnhub / FMP IPO + earnings endpoints | Bundled calendars | API | £ | 1 |
| Companies House | UK incorporations, filings, charges | API | FREE | 2 |
| Token unlock schedules (TokenUnlocks / DefiLlama) | Crypto supply cliffs | API/PART | FREE/£ | 2 |
| FDA / EMA decision calendars | Biotech binary events | API/PART | FREE | 3 |
| Index rebalance schedules (FTSE/MSCI/S&P) | Forced flow, dateable | PART | FREE | 3 |
| USPTO PatentsView + EPO OPS | Grants, applications, expiries by assignee | API | FREE | 3 |
| Kalshi | CFTC-regulated event contracts, public unauth market data | API | FREE | 1 |
| Polymarket CLOB | Volume leader, public read endpoints | API | FREE | 1 |
| Manifold | Play-money, fully open — free sandbox to build ingestion against | API | FREE | 1 |
| PMXT / FinFeedAPI | Prediction market aggregators, one schema | API | FREE/£ | 2 |
| Election and referendum calendars | Political event dates | API/PART | FREE | 3 |

### PILLAR IV — THE UNDERCURRENT

| Source | Gives you | Access | Cost | Wave |
|---|---|---|---|---|
| Quiver Quantitative | Congress, Form 4, contracts, lobbying, WSB, dark pool, 13F — broadest bundle for the money | API | £ | 2 |
| Capitol Trades | Free congressional cross-check | PART | FREE | 2 |
| OpenInsider | Free Form 4 screener | PART | FREE | 2 |
| WhaleWisdom | Deepest 13F analysis, WhaleScore | API | £/££ | 3 |
| USAspending.gov | **Every federal contract award — join this to congressional trades** | API | FREE | 2 |
| SAM.gov / UK Contracts Finder | Procurement pipelines | API | FREE | 3 |
| layoffs.fyi + state WARN notices | Free, early, genuinely underused | PART | FREE | 2 |
| Revelio Labs / LinkUp | Hiring as growth signal | API | £££ | 4 |
| Similarweb / Sensor Tower | Web and app traffic as revenue proxy | API | £££ | 4 |
| Keepa | Amazon price + BSR history. Cheap, real. | API | £ | 3 |
| Placer.ai / Advan | Foot traffic, earnings prediction | API | £££ | 4 |
| AISStream.io | **Free AIS — tanker and dry bulk positions on a budget** | API | FREE | 3 |
| Kpler / Vortexa | Institutional oil and gas flows | API | £££ | 4 |
| OpenSky Network | Free flight tracking | API | FREE | 3 |
| ADS-B Exchange | Unfiltered — the one that actually tracks corporate jets | API | £ | 3 |
| Copernicus / Sentinel Hub | Free medium-res satellite | API | FREE | 4 |
| SkyFi | **Self-serve satellite tasking + archive across providers incl. Vantor — the only realistic single-user entry point** | API | ££ | 4 |
| ICEYE / Capella | SAR — all-weather, night | API | ENT | — |
| Spire | Maritime, weather, AIS from orbit | API | ENT | — |
| HawkEye 360 | RF geolocation — dark fleet, jamming | API | ENT | — |
| Stocktwits | Purpose-built trader chatter, bull/bear index | API | FREE | 2 |
| ApeWisdom | Free Reddit ticker ranks | API | FREE | 2 |
| LunarCrush / Santiment | Crypto social, Galaxy Score | API | ££ | 3 |
| Google Trends (pytrends) | Free attention proxy | PART | FREE | 2 |
| Wikipedia Pageviews | Free, surprisingly predictive, almost nobody uses it | API | FREE | 2 |
| X / Twitter API v2 | Direct social. Expensive now. | API | £££ | 4 |
| GLEIF / OpenCorporates / OpenSanctions | **The entity graph glue that makes every join above possible** | API | FREE | 2 |

### PILLAR V — THE ALTERNATIVES

| Source | Gives you | Access | Cost | Wave |
|---|---|---|---|---|
| Forge Data / Forge Price | Daily indicative pricing, ~200 pre-IPO names. Closest thing to Bloomberg for private companies. | API | ENT | 4 |
| Caplight MarketPrice | Forge's direct competitor | API | ENT | 4 |
| Liv-ex | **The actual fine wine exchange — ~95% of global fine wine trading. Real API, trade relationship required.** | API | ENT | 4 |
| Rare Whisky 101 / Apex 1000 | Whisky indices | PART | FREE | 4 |
| Card Ladder | 14 sources aggregated, market indexes | API | £ | 4 |
| Card Hedge | Full OpenAPI 3.0 + an MCP endpoint | API | £ | 4 |
| SportsCardsPro / PriceCharting | Free tier, documented Prices API | API | FREE/£ | 4 |
| WatchCharts / Chrono24 | Luxury watches — unofficial wrappers only | PART | FREE/£ | 5 |
| Hagerty Valuation | Classic cars, HAGI indices — no bulk API | PART | FREE | 5 |
| StockX / GOAT / SNKRDUNK | Sneakers — scrapers only, budget for maintenance | PART | £ | 5 |
| NCREIF | Institutional property, farmland, timber benchmarks — members only | PART | ENT | 5 |
| HM Land Registry Price Paid + UK HPI | UK property, free and complete | API | FREE | 3 |
| Chartmetric | Streaming momentum — the leading indicator for royalty income | API | ££ | 4 |
| Royalty Exchange | Auction results as de facto valuation benchmark | NONE | FREE | 5 |
| Sylvera | Carbon credit ratings — most developer-friendly in that category | API | ENT | 5 |
| Xpansiv / CBL | Dominant carbon venue — brokerage relationship | PART | ENT | — |
| EstiBot + NameBio | Domain appraisal vs real comparable sales | API/PART | £ | 5 |
| SEC EDGAR Reg A+ / Reg D | The only public data on Rally, Masterworks, Fundrise et al | API | FREE | 4 |

**Note on the platforms themselves** — Rally, Masterworks, Fundrise, Arrived, AcreTrader, EquityZen, Hiive, Royalty Exchange, SongVest, Novig, Sporttrade: these are places to *transact*, not sources to *pull from*. None publish a data API. Their Reg A+ filings on EDGAR are the closest thing to a feed.

**Correction on your satellite links** — that Planet Labs article is from 2024 and stale. Maxar Intelligence is now **Vantor** (rebranded 1 October 2025 following Advent International's acquisition and split; Maxar Space Systems became Lanteris). UrtheCast in that list is defunct; Orbital Insight was absorbed into Privateer. **Khazain hyperspectral** — treat as unverified until they deliver a sample against a target you can independently check. And honestly: satellite is the most seductive and lowest expected-value category in this document for year one. Free AIS plus ENTSO-E plus EIA gets you most of the same physical-economy signal for nothing. Wave 4, via SkyFi, not via an enterprise contract.

### EXECUTION

| Source | Gives you | Wave |
|---|---|---|
| OANDA | FX/CFD REST + streaming, clean audit trail | 2 |
| Interactive Brokers | Most comprehensive multi-asset execution — ~150 markets, 33 countries | 3 |
| Alpaca | Fastest to integrate, good sandbox, commission-free US equities/options/crypto | 3 |
| MetaApi / MT5 | FTMO bridge | 3 |
| Tradier | US equities/options, simpler than IBKR | — |

---

## 5. LOAD WAVES AND COST

| Wave | What loads | Sources | Monthly data cost |
|---|---|---|---|
| **1** | Harness proof + free spine + core prices | ~18 | **£0–100** |
| **2** | Breadth: alt-data bundle, indicators, entity glue, news, crypto derivatives | ~20 | **£300–700** |
| **3** | Depth: Databento internal, options flow, short interest, physical economy, IPO intelligence | ~15 | **£1,500–3,500** |
| **4** | Institutional: satellite, private markets, foot traffic, web traffic, deep on-chain, alternatives | ~12 | **£10,000–50,000+** |
| **5** | The long tail of alternatives — scrapers, indices, low-liquidity categories | ~10 | **£100–500** |

**The sleeper cost is inference, not data.** Three frontier models running continuous passes over dozens of instruments and thousands of daily observations is not a rounding error. Budget **£200–1,000/month** for the Council depending on cadence, and build a token-spend meter into the health board from Wave 1. Batch aggressively, cache council outputs against an input hash, and don't re-run the Council on data that hasn't changed.

**My recommendation on Wave 4:** don't. Not as a wave. Cross that line only when a *specific, named question you actually want answered* justifies a specific feed — "is Placer.ai worth £X to answer this one question about this one holding" — rather than buying the category. The jump from Wave 3 to Wave 4 is roughly 10x the cost for maybe 15% more edge, and most of that edge is in categories where you won't act on the answer anyway.

---

## 6. PRE-FLIGHT

### Decisions only you can make

**D1 — Monthly ceiling.** A hard number for data plus inference. My steer: Waves 1–2 (~£700/mo all-in) will tell you within eight weeks whether this changes your decision-making. Commit Wave 3 money after that, not before.

**D2 — Your book.** Instruments you trade, positions you hold, sectors and themes you care about, and — most importantly — **ten questions you'd genuinely like answered every week.** Those ten questions are the product spec. Salience scoring, the Edge board and the Council's standing prompts all derive from them. Without this, the platform ranks nothing and you get sixty feeds of noise, which is strictly worse than four.

**D3 — Automation ceiling for v1.** Which tier are you willing to reach? My recommendation: build all four, but ship Tier 4 disabled at the config level and unlock it only after Tier 3 has produced prepared trades you'd have taken manually for four consecutive weeks. That's not timidity — it's the cheapest possible backtest of the whole stack.

**D4 — Infrastructure.** Vercel Pro (Hobby's daily cron cap is fatal here) + a persistent worker on Railway or Fly + a dedicated Supabase project + a Cloudflare R2 bucket.

**D5 — Auth.** Single user. Email allowlist of one, TOTP mandatory, signup route absent from the codebase rather than disabled, Vercel deployment protection on every environment.

**D6 — Port or rebuild the risk layer.** My strong recommendation: **port.** The FTMO_STANDARD profile, the three-layer RiskGate, the HMAC ApprovalToken, the mode state machine and the 307 tests behind them are proven. Lift them into `packages/risk` and `packages/execute`. Rebuilding tested risk logic from scratch on a greenfield flagship is how live capital gets hurt.

### Admin — one afternoon

**Free keys to get now:** FRED, SEC EDGAR (declare a user-agent), Finnhub, Twelve Data, CoinGecko, Kalshi, EIA, USDA, NOAA, OpenSky, UN Comtrade, USAspending, Federal Register, CourtListener, PatentsView, Companies House, ENTSO-E, Elexon/NESO, Alpha Vantage, DefiLlama, Manifold.

**Secrets:** Doppler or 1Password Connect, injected into Vercel and the worker. Two hard rules — **rotate anything ever pasted into a chat window** (the ForecourIQ service_role key and the Faultline client secret both need doing if they haven't been), and `CLAUDE.md` forbids Claude Code from ever echoing an environment variable's value.

**Cost telemetry from Wave 1.** Every adapter and every Council run reports consumption into a `spend` table, surfaced on the health board. You should never learn your data spend from a card statement.

### Legal posture — write it in the repo, once

Private. Single user. No redistribution. No third-party advice. No promotion. Under that posture there's nothing to register and no FCA surface.

Three things that change it — a second login of any kind, publishing any output including a screenshot containing derived exchange data, or acting on anyone else's behalf. The `redistributable` flag exists so that when you do decide to commercialise, it's a filtering exercise rather than an archaeology exercise.

Two live specifics: **prediction markets** — reading Kalshi and Polymarket data from the UK is fine; *trading* them from the UK is a live and contested question (Polymarket geoblocks UK users; Kalshi's international position is disputed and it's facing enforcement in a number of US states while the CFTC litigates against those states). Data yes; execution, check properly. And **scraping** — minimal exposure for private use, real liability the moment redistribution is on the table.

---

## 7. BUILD SEQUENCE

| Phase | Name | Pillar | Gate |
|---|---|---|---|
| 0 | Foundation | — | Harness built for 60 sources. Constraints enforced at DB level. |
| 1 | Spine + Health | — | 5 live sources, health board catching real failures |
| 2 | Terminal Shell | — | Auth, design system, `Value` component that cannot render an unsourced figure |
| 3 | Entity Graph + Book | — | A company resolving across EDGAR + Companies House + GDELT + USAspending |
| 4 | Wave 1 Load | I, II, III | 18 sources live, all provenanced |
| 5 | The Horizon | III | Unified forward board with prediction-market odds attached |
| 6 | Delta + Salience | — | Ranked, explainable, arguable scores |
| 7 | The Council | VI | Three models + Adversary, disagreement preserved as an object |
| 8 | The Edge + Brief | VII | Cross-asset ranked opportunities, every claim cited |
| 9 | Wave 2 Load | I–V | 38 sources, the joins working |
| 10 | Automation T1–T3 | VIII | Prepared trades, nothing sent |
| 11 | Risk + Execution | VIII | Ported gate, paper mode, kill switch |
| 12 | Automation T4 | VIII | Live, gated, whitelisted, mode-stepped |
| 13 | Wave 3 Load | I–V | Depth |
| 14 | Research Memory | — | RAG over the whole accumulated corpus |
| 15 | Wave 4/5 | IV, V | Only against named questions |

Phases 0–8 are the platform. 9–15 are scale.

---

## 8. WHAT I'D STILL TELL YOU NOT TO BUILD

- **No charting engine.** Embed TradingView. Three weeks to rebuild something free and worse.
- **No public surface in this repo.** No marketing page, no pricing, no Stripe, not even stubbed. When you commercialise, that's a separate front-end reading a permitted subset through the `redistributable` filter. Keeping it out keeps the licence posture unambiguous.
- **No mobile app.** Responsive terminal is enough.
- **No chat box as the front door.** Chat is a drill-down. The whole value of this platform is surfacing what you *didn't* know to ask; a chat box only answers what you did.
- **No real-time everything.** Most of these sources update daily or slower. Real-time on a weekly series is expensive theatre.
- **No ML ranking.** Salience uses explicit weights in one versioned file, so you can argue with the score. A ranking you can't interrogate is a ranking you'll stop trusting in month two.

---

*Compiled 29 July 2026. Provider status, pricing and tiers in Section 4 change constantly — reconfirm directly before committing budget. This is a build brief, not investment, legal or compliance advice; get actual contract terms reviewed before signing any commercial data licence, particularly one you may later redistribute through.*
