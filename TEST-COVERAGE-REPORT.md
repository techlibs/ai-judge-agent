# Test Coverage Report: Spec Kit (speckit)

**Date:** 2026-04-13
**Branch:** speckit
**Auditor:** speckit-tester (Sonnet)

---

## Summary

| Metric | Value |
|--------|-------|
| Source files (src/) | 64 |
| Unit test files | 0 |
| Unit coverage % | **0%** |
| E2E spec files | 22 |
| E2E test() calls | 105 |
| BDD feature files | 7 |
| BDD scenarios | 36 |
| Solidity test files | 6 |
| Solidity test functions | 101 |
| Unit tests passing | N/A (no unit tests) |
| E2E tests passing | Not run (requires live server + env) |

**CRITICAL: Zero unit tests despite 64 source files and a configured vitest.config.ts.**
Running `bun run test` exits with code 1: `No test files found`.

---

## Source-to-Test Map

All 64 source files are covered only via E2E/integration/API tests hitting the running Next.js server. No source module is imported directly by any test. Coverage is behavioral, not structural.

### API Routes (E2E covered)

| Source File | Test File(s) | Type | Status |
|------------|--------------|------|--------|
| src/app/api/health/route.ts | e2e/api/health.spec.ts | e2e/api | COVERED |
| src/app/api/proposals/route.ts | e2e/api/proposals-list.spec.ts | e2e/api | COVERED |
| src/app/api/proposals/[id]/route.ts | e2e/api/proposal-detail.spec.ts | e2e/api | COVERED |
| src/app/api/evaluate/[id]/finalize/route.ts | e2e/api/evaluate-finalize.spec.ts | e2e/api | COVERED |
| src/app/api/cron/monitoring/route.ts | e2e/api/cron-monitoring.spec.ts | e2e/api | COVERED |
| src/app/api/sync/route.ts | e2e/api/sync.spec.ts | e2e/api | COVERED |
| src/app/api/rounds/[id]/stats/route.ts | e2e/api/rounds-stats.spec.ts | e2e/api | COVERED |
| src/app/api/webhooks/proposals/route.ts | e2e/api/webhooks-proposals.spec.ts, e2e/integration/evaluation-pipeline.spec.ts | e2e/api + integration | COVERED |
| src/app/api/webhooks/disputes/route.ts | e2e/api/webhooks-disputes.spec.ts | e2e/api | COVERED |
| src/app/api/chat/route.ts | — | — | **UNCOVERED** |

### UI Pages (E2E covered)

| Source File | Test File(s) | Type | Status |
|------------|--------------|------|--------|
| src/app/page.tsx | e2e/navigation.spec.ts | e2e/browser | COVERED (smoke) |
| src/app/grants/page.tsx | e2e/grants-list.spec.ts, e2e/pages/grants-list-populated.spec.ts | e2e/browser | COVERED |
| src/app/grants/[id]/page.tsx | e2e/proposal-detail.spec.ts, e2e/pages/proposal-detail-pending.spec.ts, e2e/pages/proposal-detail-evaluated.spec.ts | e2e/browser | COVERED |
| src/app/dashboard/operator/page.tsx | e2e/operator-dashboard.spec.ts | e2e/browser | COVERED (1 test) |
| src/app/grants/submit/page.tsx | — | — | **UNCOVERED** |
| src/app/grants/submit/form.tsx | — | — | **UNCOVERED** |
| src/app/grants/submit/actions.ts | — | — | **UNCOVERED** |
| src/app/grants/submit/schema.ts | — | — | **UNCOVERED** |
| src/app/grants/[id]/chat/page.tsx | — | — | **UNCOVERED** |
| src/app/layout.tsx | e2e/navigation.spec.ts | e2e/browser | COVERED (smoke) |
| src/components/error-boundary.tsx | — | — | **UNCOVERED** |

### Business Logic (NO unit tests — E2E indirect only)

| Source File | Test File(s) | Type | Status |
|------------|--------------|------|--------|
| src/evaluation/scoring.ts | e2e/integration/evaluation-pipeline.spec.ts | integration | INDIRECT ONLY |
| src/evaluation/orchestrate.ts | e2e/integration/evaluation-pipeline.spec.ts | integration | INDIRECT ONLY |
| src/evaluation/schemas.ts | e2e/integration/evaluation-pipeline.spec.ts | integration | INDIRECT ONLY |
| src/evaluation/sanitization.ts | — | — | **UNCOVERED** |
| src/evaluation/anomaly.ts | — | — | **UNCOVERED** |
| src/evaluation/dispute-override.ts | — | — | **UNCOVERED** |
| src/evaluation/agents/runner.ts | e2e/integration/evaluation-pipeline.spec.ts | integration | INDIRECT ONLY |
| src/evaluation/agents/prompts.ts | — | — | **UNCOVERED** |
| src/evaluation/agents/registration.ts | — | — | **UNCOVERED** |
| src/reputation/scoring.ts | e2e/integration/evaluation-pipeline.spec.ts | integration | INDIRECT ONLY |
| src/reputation/multiplier.ts | — | — | **UNCOVERED** |
| src/reputation/feedback.ts | — | — | **UNCOVERED** |

### Infrastructure / Utilities (NO tests)

| Source File | Test File(s) | Type | Status |
|------------|--------------|------|--------|
| src/lib/retry.ts | — | — | **UNCOVERED** |
| src/lib/rate-limit.ts | e2e/integration/security-audit.spec.ts | integration | INDIRECT ONLY |
| src/lib/auth.ts | e2e/api/sync.spec.ts | e2e/api | INDIRECT ONLY |
| src/lib/api-key.ts | e2e/api/webhooks-proposals.spec.ts | e2e/api | INDIRECT ONLY |
| src/lib/request-id.ts | — | — | **UNCOVERED** |
| src/lib/sanitize-html.ts | — | — | **UNCOVERED** |
| src/lib/security-log.ts | — | — | **UNCOVERED** |
| src/lib/validate-origin.ts | e2e/integration/security-audit.spec.ts | integration | INDIRECT ONLY |
| src/cache/client.ts | — | — | **UNCOVERED** |
| src/cache/queries.ts | e2e/api/proposals-list.spec.ts | e2e/api | INDIRECT ONLY |
| src/cache/schema.ts | — | — | **UNCOVERED** |
| src/cache/sync.ts | e2e/api/sync.spec.ts | e2e/api | INDIRECT ONLY |
| src/chain/contracts.ts | e2e/integration/onchain-reads.spec.ts | integration | INDIRECT ONLY |
| src/chain/evaluation-registry.ts | e2e/integration/onchain-reads.spec.ts | integration | INDIRECT ONLY |
| src/chain/identity-registry.ts | — | — | **UNCOVERED** |
| src/chain/reputation-registry.ts | — | — | **UNCOVERED** |
| src/chain/validation-registry.ts | — | — | **UNCOVERED** |
| src/chain/dispute-registry.ts | e2e/api/webhooks-disputes.spec.ts | e2e/api | INDIRECT ONLY |
| src/chain/milestone-manager.ts | — | — | **UNCOVERED** |
| src/graph/client.ts | — | — | **UNCOVERED** |
| src/graph/queries.ts | — | — | **UNCOVERED** |
| src/ipfs/client.ts | e2e/integration/ipfs-pinning.spec.ts | integration | INDIRECT ONLY |
| src/ipfs/pin.ts | e2e/integration/ipfs-pinning.spec.ts | integration | INDIRECT ONLY |
| src/ipfs/schemas.ts | — | — | **UNCOVERED** |
| src/monitoring/orchestrate.ts | e2e/api/cron-monitoring.spec.ts | e2e/api | INDIRECT ONLY |
| src/monitoring/runner.ts | — | — | **UNCOVERED** |
| src/monitoring/github.ts | — | — | **UNCOVERED** |
| src/monitoring/onchain.ts | — | — | **UNCOVERED** |
| src/monitoring/social.ts | — | — | **UNCOVERED** |
| src/monitoring/agent-config.ts | — | — | **UNCOVERED** |
| src/chat/prompts.ts | — | — | **UNCOVERED** |
| src/chat/tools.ts | — | — | **UNCOVERED** |

---

## BDD Scenario Coverage

| Feature File | Scenarios | Has Playwright Spec | Gaps |
|-------------|-----------|---------------------|------|
| evaluation-pipeline.feature | 5 | evaluation-pipeline.spec.ts (3 tests cover scenarios 1, 4, and duplicate detection from scenario 1) | Scenarios 2, 3, 5 not implemented as standalone tests |
| ipfs-storage.feature | 5 | ipfs-pinning.spec.ts (3 tests) | Scenarios 3 (dispute IPFS), 4 (canonical JSON), 5 (timeout) not explicitly covered |
| onchain-verification.feature | 5 | onchain-reads.spec.ts (4 tests) | Scenario 2 (getEvaluation read) partially covered |
| dispute-workflow.feature | 5 | webhooks-disputes.spec.ts (2 tests) | Scenarios 2, 3, 4, 5 not covered |
| duplicate-detection.feature | 4 | evaluation-pipeline.spec.ts (1 test covers scenario 1) | Scenarios 2, 3, 4 not covered |
| operator-dashboard.feature | 2 | operator-dashboard.spec.ts (1 test), api/sync.spec.ts (1 test) | Partial — scenario 2 partially covered |
| security-audit.feature | 10 | integration/security-audit.spec.ts (10 tests) | Full 1:1 scenario coverage |

**BDD-to-spec ratio:** ~40% of BDD scenarios have corresponding test implementations.
The security-audit feature is the only fully implemented BDD feature.

---

## Solidity Test Coverage

| Contract | Test File | Test Functions | Status |
|---------|-----------|---------------|--------|
| contracts/src/DisputeRegistry.sol | contracts/test/DisputeRegistry.t.sol | 22 | COVERED |
| contracts/src/EvaluationRegistry.sol | contracts/test/EvaluationRegistry.t.sol | 13 | COVERED |
| contracts/src/IdentityRegistry.sol | contracts/test/IdentityRegistry.t.sol | 22 | COVERED |
| contracts/src/MilestoneManager.sol | contracts/test/MilestoneManager.t.sol | 14 | COVERED |
| contracts/src/ReputationRegistry.sol | contracts/test/ReputationRegistry.t.sol | 16 | COVERED |
| contracts/src/ValidationRegistry.sol | contracts/test/ValidationRegistry.t.sol | 14 | COVERED |

**Solidity coverage: 6/6 contracts tested (101 test functions total). This is the strongest test layer in the project.**

---

## E2E Test Inventory

### API Tests (e2e/api/) — 39 tests total

| File | Tests | Coverage |
|------|-------|---------|
| health.spec.ts | 4 | GET /api/health — response shape, DB/IPFS/chain checks |
| proposals-list.spec.ts | 7 | GET /api/proposals — list, pagination, search, filter |
| proposal-detail.spec.ts | 5 | GET /api/proposals/[id] — shape, not-found |
| evaluate-finalize.spec.ts | 3 | POST /api/evaluate/[id]/finalize — already-finalized, pending, not-found |
| cron-monitoring.spec.ts | 3 | GET /api/cron/monitoring — auth, response shape |
| sync.spec.ts | 1 | POST /api/sync — auth required |
| rounds-stats.spec.ts | 2 | GET /api/rounds/[id]/stats — shape |
| security-headers.spec.ts | 5 | Security headers on GET / |
| webhooks-proposals.spec.ts | 7 | POST /api/webhooks/proposals — auth, validation, duplicate |
| webhooks-disputes.spec.ts | 2 | POST /api/webhooks/disputes — auth, validation |

### Browser Tests (e2e/) — 42 tests total

| File | Tests | Coverage |
|------|-------|---------|
| navigation.spec.ts | 3 | Page titles, nav links, 404 handling |
| grants-list.spec.ts | 3 | Grants list page — empty state, loading |
| proposal-detail.spec.ts | 3 | Proposal detail page — loading state |
| operator-dashboard.spec.ts | 1 | Auth redirect check |
| screenshots.spec.ts | 11 | Screenshot generation for docs (not behavioral) |
| pages/grants-list-populated.spec.ts | 8 | Grants list with seed data — filtering, pagination |
| pages/proposal-detail-pending.spec.ts | 5 | Proposal detail pending state — score display |
| pages/proposal-detail-evaluated.spec.ts | 12 | Proposal detail evaluated state — scores, IPFS, chain |

### Integration Tests (e2e/integration/) — 20 tests total

| File | Tests | Coverage |
|------|-------|---------|
| evaluation-pipeline.spec.ts | 3 | Full write path — webhook → IPFS → AI eval |
| ipfs-pinning.spec.ts | 3 | IPFS pin, CID format, fetch |
| onchain-reads.spec.ts | 4 | Contract presence, event queries, score scaling |
| security-audit.spec.ts | 10 | H-01, H-02, H-03, H-04, M-04, M-05, M-07 regression tests |

---

## Uncovered Files (Priority)

### CRITICAL — Pure business logic with zero test coverage

These files contain deterministic logic that is ideal for unit testing and have no test at any layer:

```
src/evaluation/scoring.ts       — weighted score calculation (testable formula)
src/evaluation/anomaly.ts       — anomaly detection logic
src/evaluation/sanitization.ts  — input sanitization rules
src/evaluation/dispute-override.ts — dispute override logic
src/reputation/multiplier.ts    — multiplier calculation (testable math)
src/reputation/feedback.ts      — feedback aggregation
src/lib/retry.ts                — retry logic with backoff
src/lib/sanitize-html.ts        — HTML sanitization
src/lib/request-id.ts           — ID generation
src/lib/security-log.ts         — security logging
```

### HIGH — Infrastructure with no tests

```
src/cache/client.ts             — database connection, no test
src/cache/schema.ts             — schema definitions
src/graph/client.ts             — GraphQL client
src/graph/queries.ts            — query builders
src/ipfs/schemas.ts             — IPFS content schemas
src/chain/identity-registry.ts  — chain reads
src/chain/reputation-registry.ts
src/chain/validation-registry.ts
src/chain/milestone-manager.ts
```

### MEDIUM — Monitoring agents with no unit tests

```
src/monitoring/runner.ts
src/monitoring/github.ts
src/monitoring/onchain.ts
src/monitoring/social.ts
src/monitoring/agent-config.ts
```

### LOW — UI components with no tests

```
src/app/grants/submit/schema.ts   — form schema (Zod, easily unit-testable)
src/app/grants/submit/actions.ts  — server actions
src/app/grants/submit/form.tsx    — form component
src/app/grants/[id]/chat/page.tsx — chat UI
src/components/error-boundary.tsx — React error boundary
src/chat/prompts.ts               — AI prompt templates
src/chat/tools.ts                 — AI tool definitions
```

---

## Test Execution Results

### Unit Tests (vitest)

```
$ bun run test
vitest run

 RUN  v3.2.4 /Users/.../speckit

No test files found, exiting with code 1

include: **/*.{test,spec}.?(c|m)[jt]s?(x)
exclude:  contracts/**, node_modules/**, e2e/**, .worktrees/**

error: script "test" exited with code 1
```

**Result: 0 unit tests. vitest exits with error.**

### E2E Tests (Playwright)

Not executed — requires a running Next.js server on port 3001 with seed data and configured env vars (PINATA_JWT, OPENAI_API_KEY, TURSO_DATABASE_URL).

### Solidity Tests (Foundry)

Not executed — requires Foundry toolchain. Test files are present and comprehensive (101 test functions across 6 contracts).

---

## Recommendations

### 1. Add unit tests immediately — this is the critical gap

The vitest infrastructure exists and is configured. Zero tests are wired in.
Start with the highest-value, easiest-to-test modules:

```typescript
// src/evaluation/scoring.test.ts
import { computeWeightedScore } from "@/evaluation/scoring";

test("weights sum to 1.0", () => { ... });
test("computes correct weighted score", () => { ... });
test("clamps scores to 0-10 range", () => { ... });
```

```typescript
// src/reputation/multiplier.test.ts
import { computeReputationMultiplier } from "@/reputation/multiplier";

test("multiplier is between 1.0 and 1.05", () => { ... });
test("scales to chain precision correctly", () => { ... });
```

**Priority order for first 10 unit tests:**
1. `src/evaluation/scoring.ts` — deterministic math, zero dependencies
2. `src/reputation/multiplier.ts` — deterministic math, zero dependencies
3. `src/app/grants/submit/schema.ts` — Zod schema validation rules
4. `src/lib/retry.ts` — retry logic (mock timers)
5. `src/evaluation/sanitization.ts` — string sanitization rules
6. `src/evaluation/anomaly.ts` — anomaly detection thresholds
7. `src/lib/sanitize-html.ts` — HTML sanitization
8. `src/ipfs/schemas.ts` — schema parse/validation
9. `src/evaluation/schemas.ts` — schema parse/validation
10. `src/lib/request-id.ts` — ID format and uniqueness

### 2. Implement missing BDD step definitions

Of the 36 BDD scenarios across 7 feature files, only ~14 (40%) have corresponding spec implementations. The unimplemented scenarios include:
- `dispute-workflow.feature` — scenarios 2-5 (IPFS evidence, validation, encoded tx)
- `duplicate-detection.feature` — scenarios 2-4 (deterministic ID, different platform)
- `evaluation-pipeline.feature` — scenarios 2, 3, 5 (AI scoring details, weighted calc, calldata encoding)
- `ipfs-storage.feature` — scenarios 3-5 (dispute evidence, canonical JSON, timeout)

### 3. Add E2E tests for uncovered routes

`POST /api/chat` and all `/grants/submit` flows have no test coverage at any layer.

### 4. Run Solidity tests in CI

The 101 Solidity tests are strong but require explicit CI step (`forge test`). Verify they are wired into the GitHub Actions workflow.

### 5. Fix the unit test exit code in CI

Until unit tests are added, `bun run test` fails with exit code 1, which will block any CI pipeline that runs it. Either add a placeholder test or update the vitest config to use `passWithNoTests: true` as a temporary measure.
