# MERIDIAN — Master Intelligence Console
## Build Brief & Pre-Flight Checklist

**Prepared for:** Pete Currey
**Date:** 29 July 2026
**Status:** Pre-build. Nothing has been written yet.
**Codename:** MERIDIAN (working title, held in one config constant — rename is a one-line change)

---

## 0. THE HONEST STRATEGIC READ

Before any architecture, three things need saying plainly, because they determine whether this becomes a genuine edge or an expensive dashboard.

### 0.1 Feeds are not an edge. Joins are.

Every single provider in those two PDFs will sell to anyone with a card. Databento will sell CME to a hedge fund and to you on the same terms. Quiver Quant is £25/month and 40,000 people have it. If the platform's proposition is "I have the feeds," you have bought a commodity at retail and called it an advantage.

The actual edge sits in four places, and the build must be organised around them:

1. **Join uniqueness** — combinations nobody bothers to make. Congressional trade + government contract award + the company's WARN notices + its patent grants + its Similarweb curve, joined on one entity, dated, in one row. No vendor sells that join. You'd be assembling it.
2. **Personal context** — the platform knows your actual book, your actual FTMO drawdown state, your actual watchlist and your actual thesis notes. Bloomberg does not know what you own. That's the asymmetry a private single-user build has over an institutional terminal.
3. **Time-to-decision** — not "is the data there" but "how many seconds from a thing changing to you knowing it changed and why it matters." That is a *delta-detection and ranking* problem, not a data problem.
4. **Accumulated memory** — after twelve months of ingesting, you hold a private time-series corpus you can query historically. That compounds. Nobody can buy your 2026 archive of exactly those joins.

### 0.2 The failure mode is noise, and it is the default outcome

Forty feeds on a dashboard is worse than four, because you stop looking. Every "one-stop-shop" intelligence platform ever built has died of this. The primary object of MERIDIAN must therefore **not be a dashboard**. It must be:

> **THE BRIEF** — a ranked, dated, evidenced feed answering: *what changed since you last looked, why does it matter to your positions and watchlist, what would falsify it, and what would you do about it.*

Dashboards are the drill-down *behind* the brief, not the front door. Build the brief first and the panels second, or you will build forty panels and read none of them.

### 0.3 Private use is a genuine, temporary superpower — protect it deliberately

The single biggest commercial blocker on Signal Centre right now is the Databento CME **non-display + redistribution-to-paying-subscribers** licence quote. That blocker exists because Signal Centre shows derived exchange data to people who pay you.

MERIDIAN, as a private single-user internal tool, **does not have that problem at all**. Internal non-display use is a fraction of the cost, exchange fees are per-user-not-per-subscriber, scraped sources carry no redistribution exposure, and there's no FCA financial-promotion surface because there's no promotion and no third party.

The moment you add a second login or publish an output, the entire licence picture inverts and roughly half of this stack becomes unaffordable or illegal to show.

**So: build the licence metadata in from row one.** Every source registry entry carries `licence_class` and `redistributable: boolean`. Every observation inherits it. A future commercial variant can then mechanically filter what it is allowed to display, rather than requiring a forensic audit of forty adapters. This is a five-minute decision now and a six-month problem later.

**Hard directional rule:** MERIDIAN may read from Signal Centre. Signal Centre must **never** read from MERIDIAN. One-way valve, enforced at the network and schema level. Otherwise a private-licence data point ends up rendered on a page a subscriber paid for, and that is the kind of mistake that ends a platform.

---

## 1. WHAT MERIDIAN ACTUALLY IS

A private, single-user intelligence console with five layers:

| Layer | What it does |
|---|---|
| **1. Ingestion** | One adapter per source. Adapters are dumb: fetch, validate, normalise, write, report health. No business logic. |
| **2. Normalisation** | Everything lands in one observation model, keyed to a resolved entity, carrying provenance, timestamp, staleness and licence class. |
| **3. Delta & Salience** | Detects *changes*, scores them against your watchlist, positions and stated theses. This is the actual product. |
| **4. Synthesis** | LLM layer turns ranked deltas into the Brief. Every sentence cites an observation row ID. No uncited claims, ever. |
| **5. Surfaces** | The Brief, the entity dossier, the market console, embedded Signal Centre, and a read-only-plus-approval autotrader bridge. |

**MERIDIAN is a consumer, not an owner.** It does not own Signal Centre's data and it does not execute trades. It reads Signal Centre via the existing `SIGNAL_CONTRACT.md` interface, and it interacts with the autotrader only through the existing `ExecutionPolicy` / HMAC `ApprovalToken` seam. It never touches a broker API directly. That constraint is non-negotiable — it keeps your live capital behind the risk gate you already built and tested.

---

## 2. ARCHITECTURE

### 2.1 Shape

Monorepo. pnpm + Turborepo + TypeScript strict. Same shape as the autotrader so you're not learning two mental models.

```
meridian/
  apps/
    console/          Next.js 15 App Router — the UI. Vercel.
    worker/           Long-running Node ingestion worker. Railway or Fly.
    scheduler/        Cron orchestration + backfill jobs.
  packages/
    core/             Types, observation model, entity model, errors.
    registry/         The source registry — single source of truth for every feed.
    adapters/         One package per source. Uniform interface.
    resolve/          Entity resolution (reuse the Faultline union-find approach).
    delta/            Change detection.
    salience/         Ranking against watchlist/positions/theses.
    brief/            LLM synthesis with mandatory citation.
    bridge/           Signal Centre reader + autotrader approval client.
    ui/               Design system, ported verbatim from Signal Centre.
  infra/
    supabase/         Migrations. Own project — NOT the Signal Centre instance.
```

### 2.2 Storage split

- **Postgres (Supabase, new project):** entities, source registry, current state, observations from the last ~90 days, deltas, briefs, watchlist, positions, theses, health. Everything the UI reads.
- **Parquet on Cloudflare R2 + DuckDB:** deep history and bulk datasets (satellite-derived series, trade customs, full 13F history, bulk MOT-style dumps). You already have this pattern working on Faultline — reuse it rather than inventing.

Rule of thumb: if the UI needs it in under 200ms, it's in Postgres. If it's a research question, it's in DuckDB over Parquet.

### 2.3 The observation model (the whole thing hinges on this)

Get this right on day one; everything else is replaceable.

```ts
type Observation = {
  id: string;
  source_id: string;          // FK → registry
  entity_id: string | null;   // FK → resolved entity
  metric: string;             // canonical metric key, e.g. 'short_interest.pct_float'
  value_numeric: bigint | null;   // scaled integer. floats banned.
  value_scale: number | null;     // decimal places
  value_text: string | null;
  unit: string | null;
  source_timestamp: string;   // when the SOURCE says it happened
  captured_at: string;        // when WE fetched it
  staleness_seconds: number;  // derived, always present
  confidence: number;         // 0-100
  licence_class: LicenceClass;
  redistributable: boolean;
  raw_ref: string;            // pointer to the raw payload in R2
};
```

Non-negotiables carried over from your existing standards:
- **No imputed values. No hardcoded fallbacks. No mock data anywhere, ever.**
- Money and prices as **scaled integers**. Floats banned in any package that touches valuation or risk.
- Every displayed figure carries **sample size / source / snapshot date**, exactly as in Faultline.
- If a source is offline, the UI shows `FEED_OFFLINE` — it does not show a stale number without a staleness badge, and it never shows a plausible-looking substitute.

That last one is the entire lesson of the XAU/USD 58%-of-real-price incident and the current `CALENDAR_UNAVAILABLE` state on Signal Centre. Which brings us to:

### 2.4 Source health is a first-class feature, built in Phase 1

Your screenshot shows "No Active Signals" on a live platform, because `public.economic_events` is empty because an API key is missing in Vercel. Nothing told you. That is a silent failure that a health layer catches in sixty seconds.

MERIDIAN gets a **source health board** before it gets a single chart: per source — last successful fetch, expected cadence, staleness vs. SLA, error rate, rows written in the last window, credit/quota burn, cost month-to-date. Any source breaching SLA turns the Brief header amber and states which one.

Build this in Phase 1, not Phase 9. It is the cheapest reliability win available and it fixes the failure pattern that has bitten three of your projects.

### 2.5 Design

Port the Signal Centre design system **verbatim** — do not have Claude Code re-derive it from the screenshot. Point CC at the Signal Centre repo locally and have it copy the token file.

Observed from the screenshot (use as fallback only if the repo isn't to hand):
- Backgrounds: pure white `#FFFFFF`, alternating section surface `~#F7F7F5`
- Ink: near-black `~#14181B`; muted `~#6B7280`
- Primary: deep navy `~#1C3A5E` (buttons, the EDGE pricing card)
- Borders: hairline `1px`, `~#E4E4DF` — thin rules, generous whitespace, no shadows
- Accent badge: chartreuse `#C8F135` (same accent as Avorria)
- Type: grotesk for headings/body, **monospace for every figure** (`47`, `0—100`, `A+ — D`, ticker chips)
- No gradients, no glassmorphism, no retail flourish. Data density achieved through rules and mono type, not colour.

Motion: GSAP + ScrollTrigger, single Lenis instance driven by the GSAP ticker. **IntersectionObserver remains prohibited.** For a dense internal console, keep motion near-zero — a terminal that animates is a terminal that annoys you by week two.

---

## 3. DATA SOURCE REGISTRY

Everything from your two PDFs, plus what you already had wired across Signal Centre / Drawdown, plus the gaps the other chat identified, plus what neither covered.

**Legend — API reality:** `API` = documented programmatic access · `PART` = scraper/unofficial wrapper/members-only · `NONE` = product only
**Cost band:** `FREE` · `£` <£50/mo · `££` £50–500/mo · `£££` £500+/mo · `ENT` contact-sales

### 3.1 Already wired or contracted (your existing stack)

| Source | Where | Notes |
|---|---|---|
| Twelve Data | Signal Centre, Drawdown | Core price breadth |
| Finnhub | Signal Centre, Drawdown | WebSocket + calendar + alt-data extras |
| Databento | Signal Centre | CME futures. Licence quote outstanding — but **for private internal non-display use the quote is a different, far smaller number. Re-quote as internal-use-only for MERIDIAN.** |
| Polygon.io | Signal Centre | Currently EOD-only plan — upgrade decision pending |
| Trading Economics | Signal Centre | Calendar API is enterprise-tier; this is why `economic_events` is empty |
| CFTC (direct) | Signal Centre | COT. Free. |
| Claude / GPT / Grok | Signal Centre | Three-model consensus |
| OANDA | Autotrader | Practice adapter, Phase 2 |
| DVSA MOT bulk | Faultline | Precedent for bulk-ingest architecture |

### 3.2 TIER 1 — Free, high value, integrate in Phase 1–3

These cost nothing and carry no redistribution exposure. There is no reason not to have all of them.

| Source | Category | API | Why it matters |
|---|---|---|---|
| **FRED** | Macro | API | 800k series. The backbone. Free, unlimited-ish. |
| **US Treasury Fiscal Data** | Rates/fiscal | API | Auctions, debt, cash balance. Underused. |
| **NY Fed** (SOFR, repo, SCE, Nowcast) | Rates | API | Repo stress is an early warning nobody retail watches |
| **Atlanta Fed GDPNow** | Nowcast | API | Real-time GDP tracking |
| **Cleveland Fed inflation nowcast** | Nowcast | API | Beats consensus CPI forecasts regularly |
| **SEC EDGAR** (Submissions, XBRL Facts, Full-Text) | Filings | API | Source of truth. ~60s indexing. Free. |
| **GDELT** | News/geopolitics | API | Massive global event/tone database. Genuinely free. Underexploited. |
| **ENTSO-E Transparency** | EU power | API | European electricity generation/flow/price. Free and excellent. |
| **Elexon BMRS / NESO Data Portal** | UK power | API | UK grid, imbalance prices. Free. |
| **EIA** | Energy | API | Weekly inventories at source, no reseller markup |
| **USDA NASS + WASDE** | Ags | API | Crop reports at source |
| **NOAA / NWS** | Weather | API | Free US weather; ECMWF open data for global |
| **OpenSky Network** | Aviation | API | Free flight tracking. Corporate-jet M&A signal. |
| **UN Comtrade** | Trade | API | Global customs flows, free tier |
| **USAspending.gov** | Gov contracts | API | Every federal award. Pairs with congressional trades. |
| **Federal Register + Regulations.gov** | Regulatory | API | Rule changes before they're news |
| **CourtListener / RECAP** | Litigation | API | Federal dockets. Litigation risk before the press release. |
| **USPTO PatentsView + Open Data** | IP | API | Grant/application flow by assignee |
| **UK Companies House** | UK corporate | API | You already know this one from the Avorria work |
| **FCA Short Positions register** | UK shorts | API/CSV | **Daily disclosed UK net shorts, free.** Barely anyone builds on this. |
| **ESMA short positions** | EU shorts | CSV | Same for Europe |
| **RNS / Investegate** | UK announcements | PART | UK regulatory news. Scrape or LSE feed. |
| **HM Land Registry Price Paid + UK HPI** | UK property | API | Free, complete |
| **DefiLlama** | Crypto/DeFi | API | Free, best-in-class TVL and protocol data |
| **CoinGecko** | Crypto | API | Free demo tier |
| **Alternative.me Fear & Greed** | Crypto sentiment | API | Free |
| **ApeWisdom** | Retail sentiment | API | Free Reddit ticker ranks |
| **Stocktwits** | Retail sentiment | API | Purpose-built trader chatter |
| **Google Trends (pytrends)** | Attention | PART | Free attention proxy |
| **Wikipedia Pageviews** | Attention | API | Free, surprisingly predictive, almost nobody uses it |
| **Manifold** | Prediction mkts | API | Play-money — perfect free sandbox to build your ingestion logic against |
| **Kalshi** | Prediction mkts | API | Market data public + unauthenticated |
| **Polymarket CLOB** | Prediction mkts | API | Public read, no auth |
| **Copernicus / Sentinel Hub** | Satellite | API | Free medium-res imagery |
| **layoffs.fyi + state WARN notices** | Labour | PART | Free, early, genuinely underused |
| **GLEIF LEI / OpenCorporates / OpenSanctions** | Entity graph | API | The joins that make everything else joinable |
| **World Bank / IMF / OECD / Eurostat / UK ONS** | Macro | API | Free official statistics |

### 3.3 TIER 2 — Cheap paid, add once the spine works

| Source | Category | Band | Note |
|---|---|---|---|
| Quiver Quantitative | Congress/insider/alt bundle | £ | ~£25/mo. Best breadth-per-pound in the document. |
| TAAPI.IO | Indicators | ££ | Bulk multi-timeframe confluence in one call |
| CoinGlass | Crypto derivatives | ££ | Funding, OI, liquidations |
| Keepa | Consumer | £ | Amazon price/BSR history. Cheap. Real revenue proxy. |
| Dune Analytics | On-chain | ££ | SQL across chains. Enormous leverage for the money. |
| Financial Modeling Prep | Fundamentals | £ | EDGAR-derived, cheap |
| EODHD | Global exchanges | £ | Non-US coverage |
| sec-api.io | Filings | ££ | Skips the EDGAR parsing engineering |
| Fintel / Ortex | Short interest | ££ | Two independent sources — cross-validate, never trust one parser |
| Unusual Whales | Options flow / dark pool | ££ | Documented REST + MCP server |
| Marketaux / NewsCatcher | News | £ | Cheap sentiment-scored news |
| AISStream.io | Maritime | FREE/£ | Free AIS. Tanker positions on a budget. |
| ADS-B Exchange | Aviation | £ | Unfiltered — the one that actually tracks corporate jets |
| Trading Economics | Global macro | ££ | 500 req/mo cap; calendar is enterprise-only |

### 3.4 TIER 3 — Serious money, only when a specific question demands it

| Source | Category | Band | Verdict |
|---|---|---|---|
| Databento (internal non-display) | Futures/equities tick | £££ | **Re-quote for private internal use — this is the cheap version of the quote that's blocking Signal Centre** |
| Polygon.io paid | US equities/options | ££ | Upgrade when latency matters |
| Glassnode / CryptoQuant / Nansen / Arkham | On-chain | £££ | Only once crypto is earning |
| Liv-ex | Fine wine | ENT | Real exchange, trade relationship required. 95% of global fine wine trading. |
| Forge Data / Caplight | Pre-IPO pricing | ENT | The only real private-market price feeds |
| Card Ladder / Card Hedge | Collectibles | £/££ | Card Hedge publishes OpenAPI + an MCP endpoint |
| Chartmetric | Music royalties | ££ | Streaming momentum as royalty leading indicator |
| Sylvera | Carbon | ENT | Most developer-friendly in that category |
| EstiBot + NameBio | Domains | £/PART | Model estimate vs. real comps |
| Kpler / Vortexa | Oil flows | £££ | Tanker tracking. Genuinely powerful, genuinely expensive. Start with free AIS. |
| Placer.ai / Advan | Foot traffic | £££ | Earnings prediction |
| Similarweb / Sensor Tower | Web & app | £££ | Tech revenue proxy |
| Revelio Labs / LinkUp | Labour | £££ | Hiring as a growth signal |
| RavenPack / AlphaSense | News/research NLP | ENT | Institutional |
| MSCI / Sustainalytics | ESG | ENT | Only if ESG is a thesis input |
| NCREIF | Property/farmland | ENT | Members only |
| Xpansiv / CBL | Carbon | ENT | Brokerage relationship |
| Baltic Exchange / Drewry | Freight | £££ | Freightos FBX is the cheaper proxy |

### 3.5 Satellite & geospatial — the category from your links

Correcting the article you were sent, which is from 2024:

- **Vantor** — this is what Maxar Intelligence became. <cite index="6-1">Maxar retired its name on 1 October 2025: Maxar Intelligence now operates as Vantor and Maxar Space Systems as Lanteris.</cite> <cite index="5-1">Both followed Advent International's acquisition and split of the business.</cite> Vantor holds the WorldView constellation. Enterprise/defence-weighted; not a self-serve purchase.
- **UrtheCast** in that list is defunct. **Orbital Insight** was absorbed into Privateer. Treat the article as a starting point, not a current market map.
- **Realistic entry point for a private user: SkyFi** — a self-service platform that resells tasking and archive across providers including Vantor. Card-payable, no enterprise contract. That is how you test whether satellite data actually changes any decision you make, for hundreds rather than hundreds of thousands.
- **Free layer: Copernicus / Sentinel Hub.** Medium resolution, free, sufficient for macro-scale change detection (storage tank shadows, port congestion, crop stress).
- **SAR (all-weather, night):** ICEYE, Capella. **RF geolocation:** HawkEye 360 — dark-fleet and jamming detection, no optical needed. **Methane:** GHGSat. **Maritime + weather + AIS from orbit:** Spire. **Aggregators:** SkyFi, SkyWatch EarthCache.
- **Khazain hyperspectral** (from your first link) — I'd treat as unverified. Hyperspectral for commodity/mineral inference is a real and growing field, but verify the company is operational, has actual on-orbit capacity, and will sell to a single private user before committing a pound. Ask for a sample delivery against a target you can independently check.

**My honest verdict on satellite:** it is the most seductive category here and the lowest expected value for you in year one. It is high-cost, high-latency, and requires an analysis pipeline (change detection, object counting) that is itself a whole product. Park it in Phase 9. If you want the satellite *thesis* without the satellite *cost*, free AIS plus ENTSO-E plus EIA gets you most of the same physical-economy signal for £0.

### 3.6 Gaps neither PDF covered, worth flagging

- **Central bank communications as structured data** — Fed speech corpus, FOMC statement diffs (statement-vs-previous-statement text diff is a genuine, tradeable signal), CME FedWatch implied probabilities, BoE/ECB calendars. Mostly free, almost entirely unexploited by retail.
- **FCA / ESMA short-position registers** — daily, free, UK/EU, and a real informational asymmetry versus US-centric tooling.
- **UK-specific corporate layer** — Companies House, Insolvency Service, RNS, Contracts Finder. You already have this muscle from the Avorria company-intelligence work. It is directly reusable and it is a domain where you have an edge over a US-built terminal.
- **Cross-source contradiction detection** — when Quiver and Capitol Trades disagree on a congressional trade, or Fintel and Ortex disagree on short interest, *that disagreement is itself a signal* and should be a first-class object in the model, not an error to reconcile silently. Same philosophy as Signal Centre's "disagreement is never suppressed."

---

## 4. PRE-FLIGHT — WHAT YOU DO BEFORE CLAUDE CODE OPENS

Six decisions and one afternoon of admin. Do not start the build until these are done; every one of them is a thing CC would otherwise have to guess at, and CC guessing at architecture is how you get a rewrite.

### 4.1 Decisions (only you can make these)

**D1 — Monthly data budget ceiling.** A hard number. This single figure determines which tier the build targets. My recommendation: **£0/month for Phases 0–4.** Build the entire spine on Tier 1 free sources. You'll know within six weeks whether the thing is useful, and you'll have spent nothing. Then set a real ceiling.

**D2 — What do you actually trade and hold?** The watchlist is the input to salience scoring. Without it there is no ranking, and without ranking this is a noise machine. Write down: instruments you trade, positions you hold, sectors/themes you care about, and roughly ten open questions you'd genuinely like answered weekly. That list is the product spec.

**D3 — Hosting.** Vercel Pro for the console (Hobby's daily cron cap is fatal — this is the same wall you hit on Signal Centre). Plus one persistent worker host: **Railway** or **Fly.io**. You deferred this decision on Signal Centre to Phase 3; MERIDIAN needs it from Phase 1 because continuous ingestion is the whole point.

**D4 — Separate Supabase project.** New project, not the shared Signal Centre / autotrader instance. Your live trading system should not share a database with a research tool that will be schema-churning weekly.

**D5 — Single-user auth model.** Supabase Auth, email allowlist of exactly one address, TOTP 2FA mandatory, **signup route physically absent from the codebase** (not disabled — absent), plus Vercel deployment protection on the preview and production domains. No public surface at all.

**D6 — Scope discipline for v1.** Pick **eight** sources for the entire first build. Not eighty. My proposed eight: FRED, SEC EDGAR, GDELT, Kalshi, FCA Short Positions, USAspending, Companies House, and Signal Centre itself. All free, spanning macro / filings / news / prediction / positioning / contracts / UK corporate / your own signals — which proves every adapter shape you'll ever need.

### 4.2 Admin (an afternoon)

**Keys to obtain now (all free):** FRED, Finnhub, Twelve Data, SEC EDGAR (declare a user-agent string), Companies House, Kalshi, CoinGecko, EIA, USDA, NOAA, OpenSky, UN Comtrade, USAspending, Federal Register, CourtListener, PatentsView, Elexon/NESO, ENTSO-E, Alpha Vantage.

**Secrets handling.** Doppler or 1Password Connect, injected into Vercel and the worker. Two hard rules given what's happened before:
1. **Rotate anything ever pasted into a chat window.** The ForecourIQ service_role key and the Faultline DVSA client secret both need doing if they haven't been.
2. `CLAUDE.md` instructs CC to **never echo an environment variable value**, only its name and whether it's present.

**Storage.** Cloudflare R2 bucket for raw payloads and Parquet. Cheap egress, and you'll want the raw archive — the ability to re-derive a metric from stored raw payloads after you find a parsing bug is worth more than it sounds.

**Cost telemetry from day one.** Every adapter reports credits/requests consumed per run into a `source_cost` table. You will otherwise discover your data spend from a card statement.

### 4.3 Legal posture — write this down once, in the repo

Private. Single user. No redistribution. No third-party advice. No promotion. Under that posture there is nothing to register and no FCA surface.

Three things that would change it, listed so you notice if you drift into them:
1. A second login of any kind.
2. Publishing any output, including a screenshot with derived exchange data in it.
3. Acting on someone else's behalf.

Two live specifics:
- **Prediction markets:** reading Kalshi and Polymarket data from the UK is fine. *Trading* them from the UK is a different question with a live and messy answer — Polymarket geoblocks UK users, and Kalshi's international position is contested. Data yes; execution, check properly first.
- **Scraping:** for private internal use the exposure is minimal, but the moment redistribution is contemplated, every `PART` source in the registry becomes a liability. That's precisely what the `redistributable` flag is for.

---

## 5. PHASE PLAN

| Phase | Name | Deliverable | Gate |
|---|---|---|---|
| **0** | Foundation | Monorepo, CLAUDE.md, types, CI, design tokens ported. No features. | `pnpm build` + `pnpm test` green; forbidden-strings CI passes |
| **1** | The Spine | Observation model, source registry, adapter interface, **health board**, 3 free adapters | Live rows in Supabase from 3 real sources + health board showing real staleness |
| **2** | Console Shell | Auth (single user), layout, nav, health page rendered in Signal Centre design language | Deployed, 2FA enforced, no signup route exists in the codebase |
| **3** | Entity Graph | Entity model + resolution, watchlist, positions, theses | A company resolves correctly across EDGAR + Companies House + GDELT |
| **4** | Delta Engine | Change detection + salience scoring against watchlist | Ranked delta list, reproducible, explainable score |
| **5** | The Brief | LLM synthesis, mandatory citation, daily + on-demand | Every sentence traces to an observation ID. Zero uncited claims. |
| **6** | Bridges | Signal Centre reader; autotrader read-only + approval | One-way valve verified. No direct broker call exists anywhere in the tree. |
| **7** | Market Breadth | Prices, calendars, positioning, short interest | All figures carry source + timestamp + staleness |
| **8** | Alt-Data | Prediction markets, congress/insider, options flow | Contradiction detection working across duplicate sources |
| **9** | Exotic | Satellite, shipping, flights, patents, trade | Only if Phases 1–8 are genuinely in daily use |
| **10** | Research Memory | RAG over the accumulated corpus | Historical questions answerable with citations |

Phases 0–5 are the product. 6–10 are expansion. **If Phase 5 doesn't change how you make decisions, stop building and reconsider — don't add feeds.**

---

## 6. WHAT I'D TELL YOU NOT TO BUILD

- **No charting engine.** Embed TradingView. You will otherwise spend three weeks rebuilding something free and worse.
- **No backtester in MERIDIAN.** That belongs in the autotrader, where it's already scheduled after Phase 2.
- **No mobile app.** A responsive console is enough for a single user.
- **No marketing site, no pricing page, no Stripe, no onboarding.** Not in this repo. Not as a stub. The moment a `subscribe` route exists, the licence posture is ambiguous.
- **No AI chat interface as the primary surface.** The Brief is generated and ranked; chat is a drill-down affordance, not the front door. A chat box invites you to ask questions you already know to ask — the value is in surfacing what you didn't know to ask.
- **No real-time everything.** Most of this data updates daily or slower. Real-time is expensive and, for most of these categories, meaningless.

---

*Compiled 29 July 2026. Pricing, tiers and provider status in Section 3 change constantly — reconfirm directly with each vendor before committing engineering time or budget. This is a build brief, not investment, legal, or compliance advice; before signing any commercial data licence, particularly one you might later redistribute through, get the actual contract terms reviewed.*
