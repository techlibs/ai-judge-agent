# Cross-Worktree Test Coverage Comparison

**Date:** 2026-04-13
**Audited by:** test-coverage-audit agent team (3 Sonnet teammates + Opus lead)
**Worktrees:** GSD (full-vision-roadmap), Spec Kit (speckit), Superpowers (superpower)

---

## Executive Summary

**No worktree is at 100% coverage.** None are production-ready from a testing standpoint.

| Verdict | Worktree |
|---------|----------|
| Best unit test foundation | **Superpowers** (14 test files, 112/122 passing, ~40% logic coverage) |
| Best E2E coverage | **Spec Kit** (105 E2E tests across 22 specs + 101 Solidity tests) |
| Best BDD scenarios | **Superpowers** (79 scenarios across 9 features) |
| Best Solidity tests | **Spec Kit** (101 tests, 6/6 contracts covered) |
| Worst unit coverage | **Spec Kit** (literally 0 unit tests) |
| Most test failures | **Superpowers** (10 failing tests from 3 root causes) |

---

## Side-by-Side Coverage

| Metric | GSD | Spec Kit | Superpowers |
|--------|-----|----------|-------------|
| Source files | 67 | 64 | 54 |
| **Unit test files** | **4** | **0** | **14** |
| Unit tests passing | 47/47 | N/A | 112/122 |
| Unit pass rate | 100% | N/A | 91.8% |
| Unit file coverage | ~6% | 0% | ~26% |
| E2E spec files | 9 | 22 | 6 |
| E2E test() calls | ~30 | 105 | ~25 |
| BDD feature files | 6 | 7 | 9 |
| BDD scenarios | 14 | 36 | 79 |
| BDD implemented % | ~100% | ~40% | ~83% (73/79 active, 6 skipped) |
| Solidity test files | 2 | 6 | 3 |
| Solidity test count | 28 | 101 | 33 |
| Solidity contracts covered | 2/2 | 6/6 | 3/3 |
| `bun test` works? | NO (crashes) | NO (exits code 1) | YES (with path) |
| CI pipeline exists? | NO | NO | NO |

---

## BDD Scenario Coverage Matrix

| Scenario Category | GSD | Spec Kit | Superpowers |
|-------------------|-----|----------|-------------|
| Navigation / routing | 3 scenarios | via E2E | 8 (grants-listing) |
| Proposal submission | 5 scenarios | via E2E (no BDD) | 3 + 10 (validation) |
| Proposal detail | 2 scenarios | via E2E | 11 scenarios |
| Grants listing | 2 (proposals-list) | via E2E | 8 scenarios |
| Evaluation pipeline | 1 (idle only) | 5 (3 implemented) | 10 (4 active, 6 skipped) |
| On-chain verification | via E2E only | 5 (4 implemented) | 8 scenarios |
| Reputation | 1 (render only) | via E2E only | -- |
| IPFS storage | -- | 5 (2 implemented) | -- |
| Dispute workflow | -- | 5 (1 implemented) | -- |
| Duplicate detection | -- | 4 (1 implemented) | -- |
| Security audit | -- | 10 (10 implemented) | -- |
| Operator dashboard | -- | 2 (1 implemented) | -- |
| Golden path (E2E) | 1 E2E spec | -- | 2 scenarios |
| API proposals | -- | -- | 8 (skipped, covered by API specs) |
| API evaluation | -- | -- | 19 (skipped, covered by API specs) |
| Chat/Q&A | -- | -- | -- |
| Mobile | 1 E2E spec | -- | -- |
| **TOTAL** | **14 BDD + 9 E2E** | **36 BDD + 105 E2E** | **79 BDD + 6 E2E** |

---

## Test Layer Strengths by Worktree

### GSD (full-vision-roadmap)

**Strengths:**
- All 47 unit tests pass (100% pass rate)
- Solid Solidity coverage (28 tests, IdentityRegistry + ReputationRegistry)
- Evaluation schema/constant/prompt validation is thorough
- Orchestrator weighted score math has good edge case coverage

**Weaknesses:**
- Only 4 unit test files covering 6 of 67 source files
- Zero API route tests
- Zero chain/IPFS/chat tests
- Component tests use fragile source-string scanning instead of render tests
- `bun test` crashes without path scoping (picks up Playwright specs)

### Spec Kit (speckit)

**Strengths:**
- Strongest Solidity suite: 101 tests across all 6 contracts (1:1 contract coverage)
- Most E2E tests: 105 across 22 spec files covering API, browser, and integration layers
- Security audit BDD is the only fully-implemented feature (10/10 scenarios)
- Integration tests exercise real IPFS pinning and on-chain reads

**Weaknesses:**
- **Zero unit tests** despite vitest being configured
- `bun run test` exits with code 1 (will break CI)
- 22 of 36 BDD scenarios unimplemented
- Business logic (scoring, anomaly, sanitization, multiplier) untested at unit level
- All "coverage" is behavioral via HTTP, not structural

### Superpowers (superpower)

**Strengths:**
- Most unit test files (14) covering lib + API routes
- Best API route unit coverage: 6 of 8 routes tested
- Most BDD scenarios (79) with 83% implementation rate
- Mastra integration tested (scorers, workflow, agents)
- Test-to-implementation mapping is cleanest

**Weaknesses:**
- 10 failing tests from 3 root causes (scorer mocks, orchestrator error semantics, fixture mismatch)
- Zero UI component tests (24 TSX files untested)
- Chat subsystem entirely untested
- Chain contract interaction (`contracts.ts`) untested

---

## Shared Gaps (Missing Across ALL Worktrees)

| Gap | Impact | Effort to Fix |
|-----|--------|---------------|
| **No CI/CD pipeline** | Tests never run automatically; regressions invisible | 2-4 hours per worktree |
| **No coverage reporting** | Can't track or enforce coverage thresholds | 1-2 hours (vitest coverage or c8) |
| **No component tests** | UI logic untested (forms, SSE streaming, score display) | 4-8 hours per worktree |
| **Chat route untested** | AI chat feature has zero coverage in all 3 worktrees | 2-4 hours |
| **No performance/load tests** | Unknown behavior under concurrent evaluations | 4-8 hours |
| **No accessibility tests** | WCAG compliance unverified | 4-8 hours |
| **`bun test` broken** | GSD crashes, Speckit exits 1, Superpowers needs path arg | 30 min each |
| **No Solidity fuzz tests** | Edge cases in scoring math not explored | 2-4 hours |

---

## What Would 100% Coverage Take?

"100% coverage" means: every source file has at least one direct unit test, all BDD scenarios are implemented, E2E covers all user flows, Solidity covers all contract functions, and CI enforces it.

### Per-Worktree Estimates

| Worktree | Unit Tests Needed | BDD Gaps | E2E Gaps | Solidity Gaps | CI Setup | Total Effort |
|----------|-------------------|----------|----------|---------------|----------|-------------|
| **GSD** | ~63 files need tests | +8-10 scenarios | +2-3 specs | +2 edge cases | New | ~40-60 hours |
| **Spec Kit** | ~64 files need tests (from zero) | +22 scenarios | +2 specs (chat, submit) | Minor | New | ~50-70 hours |
| **Superpowers** | ~30 files need tests (UI + chat) | +6 skipped scenarios | +1 spec (chat) | +5 edge cases | New | ~25-40 hours |

### Recommended Priority (All Worktrees)

1. **Fix `bun test`** in all 3 worktrees (30 min total)
2. **Fix 10 failing tests** in Superpowers (2 hours)
3. **Add unit tests for scoring math** in all worktrees (2-3 hours each)
4. **Add CI workflow** (GitHub Actions) (2 hours, shared across worktrees)
5. **Add chat route tests** (2 hours each)
6. **Add component tests** with @testing-library/react (4-8 hours each)
7. **Implement remaining BDD scenarios** (ongoing)

---

## Best Practices to Adopt Cross-Worktree

| Practice | Source Worktree | What to Copy |
|----------|----------------|-------------|
| API route unit testing pattern | Superpowers | `src/__tests__/api/*.test.ts` — mock request/response, test validation + error paths |
| Evaluation schema validation | GSD | `agents.test.ts` — Zod schema property tests, weight sum invariants |
| Security regression BDD | Spec Kit | `security-audit.feature` + `security-audit.spec.ts` — 1:1 finding-to-test mapping |
| Solidity contract coverage | Spec Kit | 6 test files, 101 tests, every contract has a 1:1 test file |
| Mastra scorer testing | Superpowers | `scorers.test.ts` — tests Mastra eval scorer integration (once mocks are fixed) |

---

## Conclusion

**Superpowers has the best test foundation** for reaching production quality — it has the most unit tests, the most BDD scenarios, and the cleanest source-to-test mapping. But it needs its 10 failures fixed and UI components tested.

**Spec Kit has the strongest E2E and Solidity layers** but the zero-unit-test situation is a critical gap that makes it fragile for development velocity.

**GSD has the most reliable tests** (100% pass rate) but the fewest of them — it's trustworthy but thin.

None are production-ready without CI/CD, coverage enforcement, and closing the shared gaps listed above.
