# E2E Testing Analysis — 2026-04-13

**Project:** agent-reviewer (IPE City Grants AI Judge)
**Branch:** full-vision-roadmap
**Framework:** Playwright 1.59 + playwright-bdd 8.5
**Runner:** Bun

---

## Test Suite Overview

### Playwright Specs (deterministic regression suite)

21 tests across 6 files — **all passing**.

| File | Tests | What it covers |
|------|-------|----------------|
| `proposals-list.spec.ts` | 3 | Page title, empty state, proposal cards |
| `proposal-submit.spec.ts` | 7 | Form fields, external links, 4 validation rules (title, description, team, budget) |
| `proposal-detail.spec.ts` | 2 | Content/error state handling, back navigation |
| `evaluation.spec.ts` | 3 | Page heading, idle/error state, back link |
| `reputation.spec.ts` | 2 | Tristate (error/empty/history), heading |
| `navigation.spec.ts` | 4 | Root redirect, submit link, click navigation, app nav |

### BDD Feature Files (Gherkin scenarios)

16 scenarios across 6 feature files in `e2e/features/`.

| Feature | Scenarios |
|---------|-----------|
| `proposals-list.feature` | 3 — view page, empty state, data state |
| `proposal-submit.feature` | 5 — form view, 4 validation rules |
| `proposal-detail.feature` | 2 — not found, found with metadata |
| `evaluation.feature` | 1 — idle state with button/link checks |
| `reputation.feature` | 2 — tristate view, heading |
| `navigation.feature` | 3 — redirect, submit nav, back nav |

Step definitions in `e2e/steps/` (common, proposals, evaluation, reputation).

### Commands

```bash
bun run test:e2e          # Playwright specs (21 tests)
bun run test:e2e:ui       # Playwright UI mode
bun run test:bdd          # BDD feature files (generate + run)
bun run test:bdd:generate # Generate specs from .feature files only
bun test src/             # Unit tests (47 tests)
```

---

## Screenshot References

21 reference screenshots stored in `e2e/screenshots/reference/`.

Each screenshot captures the final state of the page after the test assertion. These serve as visual baselines for:
- Regression detection (compare against future runs)
- Documentation (show stakeholders what each page looks like)
- Debugging (understand page state when tests were written)

Key screenshots by page:

| Page | Screenshot | What it shows |
|------|-----------|---------------|
| Proposals list | `proposals-list-*-page-title` | Empty state with "No proposals yet" |
| Submit form | `proposal-submit-*-form-fields` | Full form with Title, Description, Team, Budget, Links |
| Submit validation | `proposal-submit-*-title-minimum-length` | Validation errors (red text below fields) |
| Proposal detail | `proposal-detail-*-error-state` | Error state when chain is unavailable |
| Evaluation | `evaluation-*-idle-state` | "Ready for evaluation" with Brain icon |
| Reputation | `reputation-*-reputation-page` | Reputation heading with error/empty state |
| Navigation | `navigation-*-root-redirects` | Proposals list after redirect from `/` |

---

## Design Decisions

### Why Playwright over agent-browser

| Dimension | Playwright | agent-browser |
|-----------|-----------|---------------|
| Determinism | Same test, same result | AI may interpret differently per run |
| Speed | 11.5s for 21 tests | Minutes (each step involves LLM) |
| Cost | Free after setup | API tokens per run |
| CI/CD | Native (JUnit XML, HTML reports) | No built-in CI |
| Assertions | Rich built-in library | No assertion framework |
| Best for | Regression suite, CI gates | Exploratory testing, dogfooding |

**Decision:** Use Playwright for the deterministic regression suite. agent-browser is complementary for exploratory/smoke testing where AI adaptability adds value.

### Why both .spec.ts and .feature files

- **`.spec.ts` files** are the source of truth for CI — they run fast, are simple to maintain, and produce clear pass/fail results.
- **`.feature` files** provide business-readable documentation in Gherkin syntax. They bridge the gap between developers and stakeholders by describing behavior in plain English.
- Both coexist — `test:e2e` runs specs, `test:bdd` runs features. Same page interactions, different audiences.

### Test resilience to chain state

Tests are designed to handle variable chain/API state gracefully:
- Proposal detail: accepts "found" OR "not found" OR "error" states
- Evaluation: accepts "ready" OR "failed to load" states
- Reputation: accepts "error" OR "empty" OR "populated" states

This means tests pass whether running against a fresh chain (no data) or a populated testnet.

---

## Security Fixes Applied

During this session, 3 HIGH and 3 MEDIUM audit findings were fixed:

| ID | Fix applied |
|----|-------------|
| HIGH-01 | Removed `NEXT_PUBLIC_API_KEY` from client bundle — evaluate endpoint no longer needs client-side auth |
| HIGH-02/03 | Created `src/middleware.ts` with per-IP rate limiting on all `/api/*` routes |
| MEDIUM-04 | Removed redundant in-memory rate limiter from submit route (middleware handles it) |
| MEDIUM-05 | Removed `unsafe-eval` from CSP in production (kept for dev mode where React requires it) |
| MEDIUM-06 | Created centralized middleware |
| MEDIUM-07 | Middleware uses `x-real-ip` header, rejects requests with no determinable IP |

Full audit report: `docs/audit-report-2026-04-13.md`

---

## Spec Coverage Status (Updated)

| Status | Count | Requirements |
|--------|-------|-------------|
| IMPLEMENTED | 18 | PROP-01-04, STORE-01-03, EVAL-01-08, CHAIN-01-04, UI-01/03/04 |
| PARTIAL | 4 | STORE-04, CHAIN-05, UI-02, UI-05 |
| MISSING | 0 | -- |

Changes from previous audit:
- **EVAL-08**: Moved from MISSING → IMPLEMENTED (real naive vs structured comparison wired)
- **CHAIN-05**: Moved from MISSING → PARTIAL (pagination + sorting added, The Graph subgraph still deferred)
- **UI-02**: Moved from MISSING → PARTIAL (radar chart fully implemented, receives real data, but visual polish pending)

---

## Next Steps

1. **CI integration** — Add GitHub Actions workflow to run `bun run test:e2e` on PRs
2. **Visual regression** — Use Playwright's `toHaveScreenshot()` for pixel-diff comparison against `e2e/screenshots/reference/`
3. **agent-browser smoke tests** — Set up exploratory tests for manual QA sessions
4. **The Graph subgraph** — Index reputation events for CHAIN-05 full completion
5. **Upstash Redis** — Replace in-memory middleware rate limiting with Redis-backed solution for production (credentials already in `.env.local`)

---

*Generated: 2026-04-13*
*Tests: 21 passing (11.5s), 47 unit tests passing*
*Screenshots: 21 reference images stored*
