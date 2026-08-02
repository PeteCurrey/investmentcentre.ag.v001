# MERIDIAN Platform Remediation Backlog

This document tracks identified architectural gaps, deferred refactors, and technical debt items noted during phase remediation work.

---

## Technical Debt & Deferred Items

### 1. Structured Logging Infrastructure
- **Origin**: Phase 1 Item 1.2 (Security Exception & HMAC misconfiguration logging)
- **Description**: `RiskGate.verifyToken` and related security gates emit misconfiguration warnings via raw `console.error`. The platform needs a unified structured logging interface (`packages/core/src/logger.ts` or similar) to ensure security and misconfiguration events survive in production log aggregators with structured context (timestamp, level, subsystem, error code, metadata).
- **Target Phase**: Post-Phase 1 / Phase 2 Infrastructure.

### 2. Broker Interface `Price` Type Standardization — Phase 2 Item 1 (MUST precede live data integration)
- **Origin**: Phase 1 Item 1.4 (OANDA Broker Adapter & Execution Boundary)
- **Description**: `BrokerPosition`, `BrokerAccountState`, and `BrokerOrder` in `packages/execute/src/index.ts` currently type monetary/price fields (`entryPrice`, `stopLossPrice`, `fillPrice`, `balance`, `equity`, `unrealizedPnl`) as bare `ScaledInteger`. In Item 1.3, `OrderIntent` was updated to use structured `Price` objects (`{ price: ScaledInteger, scale: number, currency: string }`). The absence of this type on broker response types forced three separate workaround fixes in `oanda.ts` during Phase 1 (fill-price scale, getPositions entryPrice, getPositions unrealizedPnl) using `parsePriceStringToBigInt` with hardcoded target scales and documented assumptions. Each workaround is currently stable and documented, but the underlying type gap remains.
- **Constraint**: This refactor MUST be completed as the first Phase 2 item, before any live broker data is wired into UI pages in `apps/terminal`. Any page that renders `BrokerPosition.entryPrice` or `BrokerAccountState.balance` as a raw number without scale context will display incorrectly. Deferring past Phase 2 item 1 is not acceptable.
- **Target Phase**: Phase 2, item 1.


### 3. `apps/terminal/tsconfig.json` — Raw tsc Workspace Resolution Gap
- **Origin**: Phase 1 Item 1.5 (Kill-Switch Verification)
- **Description**: Running `tsc --noEmit` directly against `apps/terminal/tsconfig.json` produces TS6059/TS6307 errors for all workspace packages (`@meridian/core`, `@meridian/adapters`, `@meridian/registry`). Raw tsc resolves these via `node_modules` symlinks to package source files, which are outside `apps/terminal`'s implicit `rootDir`. The Next.js build pipeline handles this correctly via its `next` tsconfig plugin and `transpilePackages` webpack config, so `next build` succeeds and type-checks cleanly. The fix is to add `"paths": {}` to `apps/terminal/tsconfig.json`, consistent with the fix applied to `apps/engine` and `apps/scheduler` in Phase 1 Item 1.3. This is a CI hygiene issue — it prevents raw tsc from being used as a reliable gate for this app outside of `next build`.
- **Target Phase**: Phase 1 Item 1.9 (Verification pass) or early Phase 2 infrastructure cleanup.

---
