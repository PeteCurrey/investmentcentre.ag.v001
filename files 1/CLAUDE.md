# CLAUDE.md — MERIDIAN

> Save this at the repo root **before the first Claude Code session**. It is read at the start of every session and is binding.

---

## WHAT THIS IS

MERIDIAN is a **private, single-user, flagship intelligence and execution platform** covering FX, indices, commodities, crypto, equities, rates, and alternative assets. It ingests sixty-plus data sources, runs three frontier AI models continuously over them, produces ranked cross-asset opportunities, and executes trades through a risk gate.

It is a **greenfield build**. It is not a refactor or an extension of any existing project. Where proven code exists elsewhere (risk gate, approval tokens, mode state machine), it is **ported in as packages** — never re-derived, never referenced across repo boundaries.

Exactly one human uses it. It is never public, never multi-tenant, never sold in this form.

## THE EIGHT PILLARS

Every feature belongs to one. If it doesn't, don't build it.

1. **THE WORLD** — macro, central banks, geopolitics, energy, regulation, litigation, weather
2. **THE MARKETS** — price, volatility, flow, positioning across all asset classes
3. **THE HORIZON** — everything scheduled or forming: IPOs, filings, unlocks, earnings, decisions, elections
4. **THE UNDERCURRENT** — alt-data: insider, congress, options flow, satellite, shipping, hiring, on-chain
5. **THE ALTERNATIVES** — prediction markets, private markets, collectibles, wine, property, royalties, carbon
6. **THE COUNCIL** — Claude, GPT, Grok, plus the Adversary
7. **THE EDGE** — ranked cross-asset opportunities and the daily Brief
8. **THE MACHINE** — automation across four escalating tiers

---

## EXECUTION SAFETY — HIGHEST PRIORITY

MERIDIAN executes real trades with real money. Every safeguard below is load-bearing.

1. **No order reaches a broker except through `packages/risk`.** No exceptions, no bypass, no "temporary" direct path. Any code in `packages/execute` reachable without a `RiskGate` decision is a defect of the highest severity.
2. **The mode state machine is absolute.** OBSERVE → PAPER → LIVE. No direct OBSERVE→LIVE transition may exist in code. Transitions require explicit human action and are logged immutably.
3. **Money is scaled integers.** `bigint` + scale. Floats banned in `packages/core/money`, `risk`, `execute`, `edge`. CI fails on a float type in those paths.
4. **The kill switch is on every screen** and halts all automation instantly. Not behind a menu.
5. **Automation Tier 4 (EXECUTE) ships disabled** at config level, enabled only by explicit deliberate human change. Tiers 1–3 never send anything anywhere.
6. **Every gate decision is persisted immutably** with inputs, profile version and reason — approvals and rejections alike.
7. If a task appears to require bypassing any of the above, **stop and ask.** Do not find a workaround.

## LICENCE DISCIPLINE

Every observation carries `licence_class` and `redistributable`. Enforced by a database CHECK constraint, not application code.

This platform will later have a commercial variant, which must be able to mechanically filter what it is permitted to display. An observation without a licence class is unusable and must be impossible to insert.

## DATA INTEGRITY — NON-NEGOTIABLE

These come from prior projects where violating them caused real damage.

1. **No mock data. No fixture data. No seed data that looks real.** Unwired sources render `NOT_CONNECTED`. Never a plausible placeholder number.
2. **No hardcoded fallbacks.** Failed fetch means absent value and `FEED_OFFLINE`. A previous build displayed gold at 58% of its real price from a fallback constant for weeks.
3. **No imputed values.** Unobserved means non-existent.
4. **Every displayed figure carries provenance** — source, source timestamp, capture timestamp, staleness, and sample size where applicable.
5. **Disagreement is preserved, never reconciled silently.** Two sources contradicting is a first-class object, not an error. Applies equally to the three AI models.
6. **Everything generated cites its evidence.** Every factual sentence from the Council, Brief or Edge carries observation or delta IDs. A claim that cannot cite does not render. Validate programmatically after generation — never trust the prompt alone.
7. **No hedging language.** Confidence is a number, not a verbal fudge. Ban "reportedly", "it appears", "may suggest", "some analysts".

## VERIFICATION GATE

A phase is complete when **live output from the deployed environment** proves it. Not when the code looks right, not when local tests pass, and never on self-report.

Every completion claim includes: the command run (production curl or a real query against the deployed database), the **actual unedited output**, and the deployed commit hash.

"I have implemented X" is a hypothesis. Production output is evidence. If you can't produce the evidence, say so plainly instead of describing what the code should do.

---

## TECH STACK — FIXED

- TypeScript `strict: true`. No `any` without an inline justification.
- pnpm + Turborepo monorepo
- Next.js 15 App Router (`apps/terminal`) · persistent Node worker (`apps/engine`) · Supabase Postgres · Vercel + Railway/Fly · Cloudflare R2
- Tailwind with raw primitives. **No shadcn/ui.**
- GSAP + ScrollTrigger; single Lenis instance on the GSAP ticker. **IntersectionObserver prohibited.**
- DuckDB + Parquet on R2 for bulk and history
- Zod at every external boundary
- TradingView embedded for charting. **Do not install a charting library.**
- Model string for Council and synthesis: `claude-sonnet-4-6`

## DESIGN

Signal Centre visual language at flagship scale. If that repo is available locally, **copy its token file verbatim and tell me the path.** Do not re-derive from screenshots.

White `#FFFFFF` · surface `#F7F7F5` · ink `#14181B` · muted `#6B7280` · navy `#1C3A5E` · accent chartreuse `#C8F135` sparingly · hairline 1px borders `#E4E4DF` · no shadows, gradients or glassmorphism · **monospace for every numeric value** · grotesk for prose · dense, thin rules, generous whitespace · motion near-zero.

## STRUCTURE

```
apps/     terminal  engine  scheduler
packages/ core registry adapters resolve signals council delta salience
          edge horizon risk execute brief automation ui
infra/    supabase
```

Cross-package imports through entry points only. No deep imports.

## ADAPTER CONTRACT

Adapters are **dumb**: fetch, validate, normalise, write, report health. No business logic, no scoring, no interpretation.

```ts
interface Adapter {
  readonly sourceId: string;
  readonly pillar: Pillar;
  readonly cadence: Cadence;
  readonly licenceClass: LicenceClass;
  readonly redistributable: boolean;
  fetch(window: TimeWindow): Promise<RawPayload>;
  validate(raw: RawPayload): Result<ValidatedPayload, ValidationError>;
  normalise(v: ValidatedPayload): Observation[];
  health(): Promise<SourceHealth>;
}
```

Every adapter must: persist raw to R2 before parsing; record request/credit cost; emit health on every run including failures; be idempotent over a replayed window (enforced by unique constraint, not application logic); and never throw past its own boundary.

**The harness is built to carry sixty sources. Adding a source must never require touching the runner.**

## THE COUNCIL

- Three models, three fixed standing roles, plus the Adversary pass.
- **Disagreement is data.** Store per-model output separately with an agreement score. Never average, never merge, never suppress the outlier.
- The Adversary's only job is attacking the platform's own highest-conviction position. It runs before anything reaches the top of the Edge board.
- Cache council output against a hash of its inputs. Never re-run on unchanged data — inference is a real monthly cost and it is metered on the health board.
- Council output is subject to the citation rule in full.

## SECRETS

- Never print, log, echo or write an environment variable's **value**. Names and presence only.
- Never commit a key — not in a comment, test fixture, migration or markdown file.
- If you find what looks like a live credential in the codebase, **stop and report it** for rotation.

## PROHIBITED IN THIS REPO

- Any signup, registration, subscription, pricing, checkout or Stripe code
- Any marketing page or public route
- Any multi-tenant or role/permission abstraction
- Any execution path that does not traverse `packages/risk`
- Any direct OBSERVE→LIVE mode transition
- `localStorage` / `sessionStorage` for anything that matters
- Chart libraries
- ML-based salience ranking (explicit weights only, so the score can be argued with)

## WORKING STYLE

- **State assumptions before building, not after.** Name ambiguities; state the assumption you're proceeding on.
- **Small, verifiable increments.** One adapter proven live beats six scaffolded.
- **Push back.** If an instruction conflicts with anything above, or is architecturally poor, say so directly before implementing. Silent compliance with a bad instruction is a failure.
- **Never claim completion without production evidence.**
- No emoji in code, comments, commits or UI. British English throughout.

## CI GATES — build fails on any of these

- Type errors, lint errors, test failures
- Forbidden strings `mock` `dummy` `placeholder` `lorem` in `packages/adapters/**`
- Any float type in `core/money`, `risk`, `execute`, `edge`
- Any broker SDK imported outside `packages/execute`
- Any call path reaching `packages/execute` that does not traverse `packages/risk`
- Any observation insert missing `licence_class`, `pillar`, `source_timestamp` or `captured_at`
- Any generated output containing an uncited factual claim
- Any route file matching `signup|register|subscribe|pricing|checkout`
