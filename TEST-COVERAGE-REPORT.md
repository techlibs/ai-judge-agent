# Test Coverage Report: Superpowers (superpower)

**Date:** 2026-04-13
**Branch:** superpower
**Auditor:** superpower-tester (Sonnet 4.6)

---

## Summary

| Metric | Value |
|--------|-------|
| Source files (TS/TSX) | 54 (30 TS lib/api + 24 TSX components/pages) |
| Unit test files | 14 (in `src/__tests__/`) |
| E2E spec files | 6 (in `e2e/api/` + `e2e/golden-path.spec.ts`) |
| BDD feature files | 9 |
| BDD generated spec files | 7 (2 features missing generated specs) |
| Solidity test files | 3 |
| Unit test results | 112 pass / 10 fail (91.8% pass rate) |
| UI component coverage | 0% (no component tests) |
| Estimated line coverage | ~40% (TS logic) / 0% (UI) |

---

## Source-to-Test Map

### TypeScript Library Files

| Source File | Test File | Type | Status |
|-------------|-----------|------|--------|
| `src/lib/judges/weights.ts` | `src/__tests__/lib/weights.test.ts` | unit | COVERED |
| `src/lib/sanitize-html.ts` | `src/__tests__/lib/sanitize.test.ts` | unit | COVERED |
| `src/lib/security-log.ts` | `src/__tests__/lib/security-log.test.ts` | unit | COVERED |
| `src/lib/ipfs/client.ts` | `src/__tests__/lib/ipfs-client.test.ts` | unit | COVERED |
| `src/lib/rate-limit.ts` | `src/__tests__/lib/rate-limit.test.ts` | unit | COVERED |
| `src/lib/evaluation/publish-chain.ts` | `src/__tests__/lib/publish-chain.test.ts` | unit | COVERED |
| `src/lib/evaluation/orchestrator.ts` | `src/__tests__/lib/orchestrator.test.ts` | unit | COVERED (2 failing) |
| `src/lib/judges/schemas.ts` | `src/__tests__/lib/judge-schemas.test.ts` | unit | COVERED |
| `src/lib/judges/prompts.ts` | `src/__tests__/lib/judge-prompts.test.ts` | unit | COVERED |
| `src/lib/judges/agents.ts` | `src/__tests__/lib/judge-agents.test.ts` | unit | COVERED |
| `src/lib/evaluation/scorers.ts` | `src/__tests__/lib/scorers.test.ts` | unit | COVERED (4 failing) |
| `src/lib/mastra/index.ts` | `src/__tests__/lib/mastra-instance.test.ts` | unit | COVERED |
| `src/lib/evaluation/workflow.ts` | `src/__tests__/lib/workflow.test.ts` | unit | COVERED |
| `src/lib/db/client.ts` | — | — | NO TEST |
| `src/lib/db/schema.ts` | — | — | NO TEST |
| `src/lib/chain/config.ts` | — | — | NO TEST |
| `src/lib/chain/contracts.ts` | — | — | NO TEST |
| `src/lib/utils.ts` | — | — | NO TEST |
| `src/lib/constants.ts` | — | — | NO TEST |
| `src/lib/chat/prompts.ts` | — | — | NO TEST |
| `src/lib/chat/agent.ts` | — | — | NO TEST |
| `src/lib/chat/tools.ts` | — | — | NO TEST |
| `src/types/index.ts` | — | — | NO TEST (type-only) |

### API Route Files

| Source File | Test File | Type | Status |
|-------------|-----------|------|--------|
| `src/app/api/proposals/route.ts` | `src/__tests__/api/proposals.test.ts` | unit | COVERED |
| `src/app/api/evaluate/[id]/status/route.ts` | `src/__tests__/api/evaluate-status.test.ts` | unit | COVERED |
| `src/app/api/evaluate/[id]/[dimension]/retry/route.ts` | `src/__tests__/api/evaluate-retry.test.ts` | unit | COVERED |
| `src/app/api/evaluate/[id]/route.ts` | `src/__tests__/api/evaluate-trigger.test.ts` | unit | COVERED |
| `src/app/api/evaluate/[id]/finalize/route.ts` | `src/__tests__/api/evaluate-finalize.test.ts` | unit | COVERED |
| `src/app/api/evaluate/[id]/[dimension]/route.ts` | `src/__tests__/api/evaluate-dimension.test.ts` | unit | COVERED (3 failing) |
| `src/app/api/chat/route.ts` | — | — | NO TEST |
| `src/app/api/test-seed/seed-evaluation/route.ts` | — | — | NO TEST (test helper) |

### UI / Components (No unit tests for any of these)

| Source File | Test File | Status |
|-------------|-----------|--------|
| `src/app/page.tsx` | — | NO TEST |
| `src/app/layout.tsx` | — | NO TEST |
| `src/app/grants/page.tsx` | — | NO TEST |
| `src/app/grants/submit/page.tsx` | — | NO TEST |
| `src/app/grants/[id]/page.tsx` | — | NO TEST |
| `src/app/grants/[id]/evaluate/page.tsx` | — | NO TEST |
| `src/app/grants/[id]/verify/page.tsx` | — | NO TEST |
| `src/app/grants/[id]/chat/page.tsx` | — | NO TEST |
| `src/components/proposal-card.tsx` | — | NO TEST |
| `src/components/score-gauge.tsx` | — | NO TEST |
| `src/components/judge-card.tsx` | — | NO TEST |
| `src/components/error-boundary.tsx` | — | NO TEST |
| `src/components/proposal-form.tsx` | — | NO TEST |
| `src/components/score-radar.tsx` | — | NO TEST |
| `src/components/verify-badge.tsx` | — | NO TEST |
| `src/components/evaluation-theater.tsx` | — | NO TEST |
| `src/components/ui/button.tsx` | — | NO TEST (shadcn) |
| `src/components/ui/card.tsx` | — | NO TEST (shadcn) |
| `src/components/ui/badge.tsx` | — | NO TEST (shadcn) |
| `src/components/ui/input.tsx` | — | NO TEST (shadcn) |
| `src/components/ui/textarea.tsx` | — | NO TEST (shadcn) |
| `src/components/ui/select.tsx` | — | NO TEST (shadcn) |
| `src/components/ui/label.tsx` | — | NO TEST (shadcn) |
| `src/components/ui/separator.tsx` | — | NO TEST (shadcn) |

---

## BDD Scenario Coverage

| Feature File | Scenarios | Has Generated Spec | Active Scenarios | Skipped |
|-------------|-----------|-------------------|-----------------|---------|
| `golden-path.feature` | 2 | YES | 2 | 0 |
| `grants-listing.feature` | 8 | YES | 8 | 0 |
| `live-evaluation.feature` | 10 | YES | 4 | 6 (`@skip`) |
| `on-chain-verification.feature` | 8 | YES | 8 | 0 |
| `proposal-detail.feature` | 11 | YES | 11 | 0 |
| `proposal-submission.feature` | 3 | YES | 3 | 0 |
| `proposal-validation.feature` | 10 | YES | 10 | 0 |
| `api-proposals.feature` | 8 | **NO** | 8 | 0 |
| `api-evaluation.feature` | 19 | **NO** | 19 | 0 |
| **TOTAL** | **79** | — | **73** | **6** |

---

## BDD Feature-to-Spec Mapping

9 feature files but only 7 generated `.feature.spec.js` files. The two missing are:

| Missing Spec | Feature File | Scenario Count | Why Missing |
|---|---|---|---|
| `api-proposals.feature.spec.js` | `e2e/features/api-proposals.feature` | 8 | Feature tagged `@skip @api` — excluded from `bddgen` run |
| `api-evaluation.feature.spec.js` | `e2e/features/api-evaluation.feature` | 19 | Feature tagged `@skip @api` — excluded from `bddgen` run |

Both `api-proposals.feature` and `api-evaluation.feature` are tagged `@skip @api` at the `Feature:` level. The playwright BDD config excludes `@skip` tags (`tags: "not @skip"`), so these 27 scenarios are never generated into specs. These scenarios are instead covered by the dedicated API spec files in `e2e/api/*.spec.ts`.

---

## Solidity Test Coverage

| Contract | Test File | Functions Covered | Test Count | Gaps |
|---|---|---|---|---|
| `IdentityRegistry.sol` | `contracts/test/IdentityRegistry.t.sol` | `register()` (3 overloads), `transferFrom`, `safeTransferFrom`, `setAgentURI`, `setMetadata`, `getMetadata`, `getAgentWallet`, `unsetAgentWallet` | 14 tests | No fuzz tests; `approve()`/`setApprovalForAll()` soulbound behavior not tested |
| `ReputationRegistry.sol` | `contracts/test/ReputationRegistry.t.sol` | `initialize`, `giveFeedback`, `revokeFeedback`, `getSummary`, `getClients`, `appendResponse` | 13 tests | No access-control modifier tests; `getSummary` decimal mismatch edge cases |
| `MilestoneManager.sol` | `contracts/test/MilestoneManager.t.sol` | `createMilestones`, `releaseMilestone` | 6 tests | No tests for `refundMilestone`, dispute flow, or zero-score edge cases |

**Note:** `contracts/test/` only contains these 3 files. The remaining `.t.sol` files found in the glob are from `contracts/lib/forge-std/` and `contracts/lib/openzeppelin-contracts/` (upstream library tests, not project tests).

---

## Uncovered Files (Priority)

### High Priority — Business Logic, No Tests

| File | Reason |
|------|--------|
| `src/lib/chat/agent.ts` | Chat agent with Mastra — AI interaction path, no tests |
| `src/lib/chat/tools.ts` | Chat tool implementations — tool call behavior untested |
| `src/lib/chat/prompts.ts` | Chat prompt templates |
| `src/app/api/chat/route.ts` | Chat API endpoint, no coverage |
| `src/lib/chain/contracts.ts` | viem contract calls — on-chain read/write paths |
| `src/lib/chain/config.ts` | Chain config — environment-sensitive |
| `src/lib/db/client.ts` | DB client initialization |
| `src/lib/db/schema.ts` | Drizzle schema — no migration tests |

### Medium Priority — UI Components, No Tests

| File | Reason |
|------|--------|
| `src/components/evaluation-theater.tsx` | Complex SSE streaming component — most complex UI piece |
| `src/components/proposal-form.tsx` | Form validation logic embedded in component |
| `src/components/score-gauge.tsx` | Score display logic |
| `src/components/judge-card.tsx` | Judge evaluation display |
| `src/app/grants/[id]/evaluate/page.tsx` | Evaluation trigger page |

### Low Priority — Simple / Scaffolding

| File | Reason |
|------|--------|
| `src/lib/utils.ts` | Likely simple utilities (clsx/tailwind merge) |
| `src/lib/constants.ts` | Constants file |
| `src/app/api/test-seed/seed-evaluation/route.ts` | Test helper route — not production |
| All `src/components/ui/*.tsx` | shadcn/ui primitives — third-party, not project logic |

---

## Test Execution Results

```
bun test src/__tests__
Ran 122 tests across 19 files. [6.84s]
112 pass / 10 fail
```

### Failing Tests

| Test | File | Failure | Root Cause |
|------|------|---------|------------|
| `checkAndFinalizeEvaluation > throws when IPFS upload fails` | `orchestrator.test.ts` | Expected reject, got resolve | Orchestrator swallows IPFS errors in non-fatal path |
| `checkAndFinalizeEvaluation > throws 'On-chain publishing failed'...` | `orchestrator.test.ts` | Expected reject, got resolve | Orchestrator swallows chain errors in non-fatal path |
| `runQualityScorers > returns no flag when all pass thresholds` | `scorers.test.ts` | Expected 0.85, got 0.9 | Score threshold values differ from implementation |
| `runQualityScorers > flags when faithfulness below 0.7` | `scorers.test.ts` | Expected true, got false | Mock scorer not wired in test setup |
| `runQualityScorers > flags when hallucination above 0.3` | `scorers.test.ts` | Expected true, got false | Mock scorer not wired |
| `runQualityScorers > flags when prompt alignment below 0.7` | `scorers.test.ts` | Expected true, got false | Mock scorer not wired |
| `runQualityScorers > runs all 3 scorers` | `scorers.test.ts` | Expected 1 call, got 0 | Mock not installed correctly |
| `GET /api/evaluate/[id]/[dimension] > returns 200 with judge...` | `evaluate-dimension.test.ts` | Justification string mismatch | Mock returns different fixture than expected |
| `GET /api/evaluate/[id]/[dimension] > returns 500 when judge fails all retries` | `evaluate-dimension.test.ts` | Expected 500, got 200 | Error handling diverged from mock setup |
| `GET /api/evaluate/[id]/[dimension] > updates evaluation to failed on judge failure` | `evaluate-dimension.test.ts` | Expected "failed", got "complete" | Same error handling divergence |

### E2E Tests (Playwright)

E2E specs cannot run via `bun test` — they require `bunx playwright test`. The `e2e/*.spec.ts` files use Playwright's `test.describe` which conflicts with Bun's test runner. They must be run via `bun run test:api` or `bun run test:e2e` (requires a running server).

---

## Recommendations

### Immediate (Fix Failures)

1. **Fix scorer mock wiring** (`scorers.test.ts`) — The `@mastra/evals` mock in the test helpers is not correctly replacing the real scorers. The mock export path likely changed in a recent version update.

2. **Fix orchestrator error propagation** (`orchestrator.test.ts`) — The `checkAndFinalizeEvaluation` function silently swallows IPFS and chain failures (logs them as "non-fatal"). The tests expect throwing behavior but the implementation changed to resilient mode. Either update tests to match implementation intent, or revert to throwing behavior.

3. **Fix evaluate-dimension mock fixture** (`evaluate-dimension.test.ts`) — Justification string in mock differs from what the implementation returns. Update mock fixture or implementation constant.

### High Value Additions

4. **Chat subsystem tests** — `src/lib/chat/agent.ts`, `tools.ts`, and `route.ts` have zero coverage despite being a significant feature surface.

5. **On-chain integration tests** — `src/lib/chain/contracts.ts` has no tests. Even mocked viem tests would catch ABI mismatches before deployment.

6. **Component tests with React Testing Library** — `evaluation-theater.tsx` and `proposal-form.tsx` have embedded business logic that would benefit from unit tests. SSE state management in `evaluation-theater.tsx` is particularly complex.

7. **Add `bun test` config to exclude Playwright specs** — The `bun test` command currently picks up `e2e/*.spec.ts` and fails loudly. Add a `bunfig.toml` or `package.json` test include pattern to only run `src/__tests__/**`.

### BDD Gaps

8. **Generate specs for API features** — The `api-proposals.feature` (8 scenarios) and `api-evaluation.feature` (19 scenarios) are tagged `@skip` which excludes them from BDD generation. These 27 scenarios have dedicated API unit tests in `e2e/api/*.spec.ts` instead, but the cross-reference could be made explicit.

### Solidity Coverage

9. **Add MilestoneManager refund tests** — No test for the refund/dispute flow in `MilestoneManager.sol`.
10. **Add soulbound `approve` revert tests** in `IdentityRegistry.t.sol` — `approve()` and `setApprovalForAll()` should also revert for a fully soulbound token but are not tested.
11. **Add fuzz tests** for `ReputationRegistry.giveFeedback` value/decimal validation.
