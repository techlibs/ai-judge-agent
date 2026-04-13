# Test Coverage Report: GSD (full-vision-roadmap)

**Date:** 2026-04-13
**Branch:** full-vision-roadmap
**Auditor:** gsd-tester (Sonnet)

## Summary

| Metric | Value |
|--------|-------|
| Source files (src/) | 67 |
| Unit test files | 4 |
| Unit tests passing | 47/47 |
| Unit coverage % | ~6% (4 of 67 files tested) |
| BDD features | 6 |
| BDD scenarios | 16 |
| E2E spec files | 9 |
| Solidity contracts | 2 |
| Solidity test files | 2 |
| Solidity tests | 28 |

## Source-to-Test Map

| Source File | Test File | Type | Status |
|------------|-----------|------|--------|
| src/lib/evaluation/schemas.ts | src/lib/evaluation/agents.test.ts | unit | COVERED |
| src/lib/evaluation/constants.ts | src/lib/evaluation/agents.test.ts | unit | COVERED |
| src/lib/evaluation/prompts.ts | src/lib/evaluation/agents.test.ts | unit | COVERED |
| src/lib/evaluation/orchestrator.ts | src/lib/evaluation/orchestrator.test.ts | unit | COVERED |
| src/components/evaluation/score-radar-chart.tsx | src/components/evaluation/score-radar-chart.test.tsx | unit (source-scan) | COVERED (weak) |
| src/components/evaluation/score-summary-card.tsx | src/components/evaluation/score-summary-card.test.tsx | unit (source-scan) | COVERED (weak) |
| contracts/src/IdentityRegistry.sol | contracts/test/IdentityRegistry.t.sol | Solidity | COVERED |
| contracts/src/ReputationRegistry.sol | contracts/test/ReputationRegistry.t.sol | Solidity | COVERED |
| src/app/api/chat/route.ts | — | — | UNCOVERED |
| src/app/api/evaluate/route.ts | — | — | UNCOVERED |
| src/app/api/proposals/[tokenId]/route.ts | — | — | UNCOVERED |
| src/app/api/proposals/route.ts | — | — | UNCOVERED |
| src/app/api/proposals/submit/route.ts | — | — | UNCOVERED |
| src/app/api/reputation/[tokenId]/route.ts | — | — | UNCOVERED |
| src/app/layout.tsx | — | — | UNCOVERED |
| src/app/page.tsx | — | — | UNCOVERED |
| src/app/proposals/[id]/chat/page.tsx | — | — | UNCOVERED |
| src/app/proposals/[id]/evaluation/page.tsx | — | — | UNCOVERED |
| src/app/proposals/[id]/page.tsx | — | — | UNCOVERED |
| src/app/proposals/[id]/reputation/page.tsx | — | — | UNCOVERED |
| src/app/proposals/layout.tsx | — | — | UNCOVERED |
| src/app/proposals/new/page.tsx | — | — | UNCOVERED |
| src/app/proposals/page.tsx | — | — | UNCOVERED |
| src/components/app-shell.tsx | — | — | UNCOVERED |
| src/components/evaluation/aggregate-score.tsx | — | — | UNCOVERED |
| src/components/evaluation/dimension-card.tsx | — | — | UNCOVERED |
| src/components/evaluation/evaluation-progress.tsx | — | — | UNCOVERED |
| src/components/evaluation/prompt-comparison.tsx | — | — | UNCOVERED |
| src/components/evaluation/recommendation-badge.tsx | — | — | UNCOVERED |
| src/components/evaluation/score-band-label.tsx | — | — | UNCOVERED |
| src/components/proposals/proposal-card.tsx | — | — | UNCOVERED |
| src/components/proposals/proposal-detail-skeleton.tsx | — | — | UNCOVERED |
| src/components/proposals/proposal-form.tsx | — | — | UNCOVERED |
| src/components/proposals/proposal-list-skeleton.tsx | — | — | UNCOVERED |
| src/components/proposals/proposal-status-badge.tsx | — | — | UNCOVERED |
| src/components/reputation/on-chain-status-badge.tsx | — | — | UNCOVERED |
| src/components/reputation/reputation-history-entry.tsx | — | — | UNCOVERED |
| src/components/reputation/reputation-history-list.tsx | — | — | UNCOVERED |
| src/components/reputation/reputation-summary-card.tsx | — | — | UNCOVERED |
| src/components/reputation/transaction-link.tsx | — | — | UNCOVERED |
| src/components/ui/badge.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/button.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/card.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/chart.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/input.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/label.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/separator.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/skeleton.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/table.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/tabs.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/textarea.tsx | — | — | UNCOVERED (shadcn generated) |
| src/components/ui/tooltip.tsx | — | — | UNCOVERED (shadcn generated) |
| src/lib/chain/client.ts | — | — | UNCOVERED |
| src/lib/chain/contracts.ts | — | — | UNCOVERED |
| src/lib/chain/reputation-schemas.ts | — | — | UNCOVERED |
| src/lib/chain/reputation.ts | — | — | UNCOVERED |
| src/lib/chat/context.ts | — | — | UNCOVERED |
| src/lib/chat/prompts.ts | — | — | UNCOVERED |
| src/lib/constants/proposal.ts | — | — | UNCOVERED |
| src/lib/env.ts | — | — | UNCOVERED |
| src/lib/evaluation/agents.ts | — | — | UNCOVERED (tested via agents.test.ts indirectly via schemas/prompts) |
| src/lib/evaluation/storage.ts | — | — | UNCOVERED |
| src/lib/evaluation/use-evaluation.ts | — | — | UNCOVERED |
| src/lib/ipfs/client.ts | — | — | UNCOVERED |
| src/lib/ipfs/schemas.ts | — | — | UNCOVERED |
| src/lib/ipfs/types.ts | — | — | UNCOVERED |
| src/lib/schemas/proposal.ts | — | — | UNCOVERED |
| src/lib/utils.ts | — | — | UNCOVERED |
| src/middleware.ts | — | — | UNCOVERED |

## BDD Scenario Coverage

| Feature File | Scenarios | Has Step Definitions | Gaps |
|-------------|-----------|---------------------|------|
| e2e/features/navigation.feature | 3 | Yes (e2e/steps/common.ts, proposals.ts) | None identified |
| e2e/features/proposal-submit.feature | 5 | Yes (e2e/steps/proposals.ts) | None identified |
| e2e/features/proposals-list.feature | 2 | Yes (e2e/steps/proposals.ts) | None identified |
| e2e/features/proposal-detail.feature | 2 | Yes (e2e/steps/proposals.ts) | None identified |
| e2e/features/evaluation.feature | 1 | Yes (e2e/steps/evaluation.ts) | Only 1 scenario — no trigger-evaluation or results scenarios |
| e2e/features/reputation.feature | 1 | Yes (e2e/steps/reputation.ts) | Only 1 scenario — no on-chain data scenarios |

**Total BDD scenarios: 14**

Notable gaps in BDD coverage:
- `evaluation.feature` has only an idle-state scenario. No scenario for triggering evaluation, streaming progress, or viewing results.
- `reputation.feature` has only a page-render scenario. No scenario for on-chain data display, history pagination, or transaction links.
- No BDD feature for: chat/Q&A flow, chain verification, or mobile responsiveness (covered only by dedicated E2E specs, not BDD).

## Solidity Test Coverage

| Contract | Test File | Functions Covered | Gaps |
|----------|-----------|-------------------|------|
| IdentityRegistry.sol | contracts/test/IdentityRegistry.t.sol | register, setAgentURI, getMetadata, tokenURI, pause, unpause, soulbound transfer block, max supply, URI length, access control | `supportsInterface`, `setAgentURI` URI-too-long path |
| ReputationRegistry.sol | contracts/test/ReputationRegistry.t.sol | giveFeedback, getSummary, readFeedback, getFeedbackCount, constructor zero-address, pause, access control, edge scores | `unpause`, `ContentHashTooLong` error path, `setAgentURI`-too-long on ReputationRegistry |

**Solidity test count:**
- `IdentityRegistry.t.sol`: 17 test functions
- `ReputationRegistry.t.sol`: 11 test functions
- Total: 28 Solidity tests

Solidity coverage is **strong** relative to what the contracts expose. The two primary paths missing are the `ContentHashTooLong` revert in `ReputationRegistry.giveFeedback` and the `setAgentURI` URI-too-long path (no separate test in `IdentityRegistry.t.sol`).

## Uncovered Files (Priority)

### Critical — Core business logic, no tests at all

```
src/lib/evaluation/agents.ts          # Judge agent LLM call wrappers
src/lib/evaluation/storage.ts         # Evaluation persistence layer
src/lib/evaluation/use-evaluation.ts  # React hook for evaluation state
src/lib/chain/client.ts               # viem client setup
src/lib/chain/contracts.ts            # Contract ABIs and addresses
src/lib/chain/reputation.ts           # Chain reputation read/write logic
src/lib/chain/reputation-schemas.ts   # Zod schemas for on-chain data
src/lib/ipfs/client.ts                # IPFS pin/fetch client
src/lib/ipfs/schemas.ts               # IPFS content schemas
src/lib/schemas/proposal.ts           # Proposal Zod schema (API boundary)
src/lib/env.ts                        # Env var validation
```

### High priority — API routes (no tests)

```
src/app/api/evaluate/route.ts              # Core evaluation trigger
src/app/api/proposals/submit/route.ts      # Proposal submission
src/app/api/proposals/route.ts             # Proposals list fetch
src/app/api/proposals/[tokenId]/route.ts   # Single proposal fetch
src/app/api/reputation/[tokenId]/route.ts  # Reputation data fetch
src/app/api/chat/route.ts                  # Chat/Q&A route
```

### Medium priority — Business UI components (no tests)

```
src/components/evaluation/aggregate-score.tsx
src/components/evaluation/dimension-card.tsx
src/components/evaluation/evaluation-progress.tsx
src/components/evaluation/recommendation-badge.tsx
src/components/evaluation/score-band-label.tsx
src/components/proposals/proposal-form.tsx
src/components/proposals/proposal-card.tsx
src/components/proposals/proposal-status-badge.tsx
src/components/reputation/reputation-summary-card.tsx
src/components/reputation/reputation-history-list.tsx
src/components/reputation/reputation-history-entry.tsx
src/components/reputation/on-chain-status-badge.tsx
src/components/reputation/transaction-link.tsx
```

### Low priority — Scaffolding/generated (skip or defer)

```
src/components/ui/*          # shadcn/ui generated — test via consumer components
src/lib/utils.ts             # Tailwind merge utility — minimal business logic
src/middleware.ts            # Next.js middleware
src/app/layout.tsx           # App shell layout
src/lib/chat/context.ts      # Chat context builder
src/lib/chat/prompts.ts      # Chat prompt templates
src/lib/constants/proposal.ts
```

## Test Execution Results

```
bun test src/

bun test v1.3.1 (89fa0f34)

 47 pass
 0 fail
 72 expect() calls
Ran 47 tests across 4 files. [158.00ms]
```

**Note:** `bun test` without a path arg picks up e2e `.spec.ts` files and Playwright's `test.describe()` throws when run outside the Playwright runner. Running `bun test src/` isolates unit tests correctly. A `bunfig.toml` or package.json `testMatch` exclusion is missing — see Recommendations.

## Recommendations

### Immediate (high ROI, low effort)

1. **Fix `bun test` to exclude e2e/** — Add to `package.json`:
   ```json
   "test": "bun test src/"
   ```
   or add a `bunfig.toml` with `preload = []` and `test.root = "src"`. Without this, `bun test` crashes on Playwright describe blocks.

2. **Add `@testing-library/react`** — Both component test files have a prominent TODO noting they use source-file string scanning instead of render tests. The tests are technically fragile (they break on formatting/refactor even when behavior is correct). Add `@testing-library/react` and rewrite them as render tests.

3. **Test `src/lib/schemas/proposal.ts`** — It's a Zod schema at a system boundary (API input validation). Schema tests like those in `agents.test.ts` can be written in minutes and catch regressions immediately.

4. **Test `src/lib/evaluation/storage.ts`** — The evaluation persistence layer interacts with IPFS and is testable in isolation with mocked fetch. Untested persistence is high-risk.

### Short term (next session)

5. **Test `src/lib/chain/reputation.ts`** — On-chain write logic (viem calls) should be tested with a local Anvil instance or mocked viem client. This is the most complex lib module with zero coverage.

6. **Add BDD scenarios for evaluation flow** — The `evaluation.feature` has only an idle-state check. Add: trigger evaluation, see streaming progress, view dimension scores, and view aggregate score scenarios.

7. **Test API routes with `bun test` + mock fetch** — The six API routes are entirely uncovered. Use `bun test` with `mock()` to test request parsing, validation errors, and response shapes without a running server.

### Long term

8. **Run Playwright E2E against a deployed dev server** — E2E specs exist and look well-structured, but they can't run in isolation (they require a live Next.js server). Set up CI to run `bun run test:e2e` against a started server.

9. **Add Solidity fuzz tests** — The Foundry tests are solid but deterministic. Add `testFuzz_giveFeedback_alwaysValidScore` and `testFuzz_register_neverExceedsMaxSupply` using Foundry fuzzing.
