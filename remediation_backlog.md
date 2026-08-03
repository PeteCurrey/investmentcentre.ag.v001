# MERIDIAN Platform Remediation Backlog

This document tracks identified architectural gaps, deferred refactors, and technical debt items noted during phase remediation work.

---

## Technical Debt & Deferred Items

### 1. Structured Logging Infrastructure (COMPLETED)
- **Origin**: Phase 1 Item 1.2 (Security Exception & HMAC misconfiguration logging)
- **Status**: **COMPLETED** (Phase 2 Item 3)
- **Description**: Created `packages/core/src/logger.ts`, providing a zero-dependency structured logger that emits newline-delimited JSON records (`ts`, `level`, `subsystem`, `msg`, context fields) to `stdout`/`stderr` with level filtering (`LOG_LEVEL`). Migrated `RiskGate.verifyToken`, `apps/engine`, and `apps/scheduler` to structured logging. Unit tested with 7 new tests in `packages/core/src/logger.test.ts`.

### 2. Broker Interface `Price` Type Standardization — Phase 2 Item 1 (COMPLETED)
- **Origin**: Phase 1 Item 1.4 (OANDA Broker Adapter & Execution Boundary)
- **Status**: **COMPLETED** (Phase 2 Item 1)
- **Description**: `BrokerPosition`, `BrokerAccountState`, and `BrokerOrder` in `packages/execute/src/index.ts` have been updated to use structured `Price` objects (`{ price: ScaledInteger, scale: number, currency: string }`) for `entryPrice`, `stopLossPrice`, `fillPrice`, `balance`, `equity`, and `unrealizedPnl`. `OandaBrokerAdapter` now constructs structured `Price` objects directly from OANDA response data using native scale parsing, removing all hardcoded target scale assumptions in `oanda.ts`.



### 3. `apps/terminal/tsconfig.json` — Raw tsc Workspace Resolution Gap (COMPLETED)
- **Origin**: Phase 1 Item 1.5 (Kill-Switch Verification)
- **Status**: **COMPLETED** (Phase 2 Item 2)
- **Fix**: Added `"paths": {}` to `compilerOptions` in `apps/terminal/tsconfig.json`. Raw `tsc --noEmit` now exits 0 with no errors, consistent with `apps/engine` and `apps/scheduler`.

---
