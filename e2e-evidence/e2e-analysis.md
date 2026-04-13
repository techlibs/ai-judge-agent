# E2E Cross-Worktree Analysis — Agent Reviewer

**Date:** 2026-04-13
**Tested by:** 3 parallel E2E agents (gsd-e2e, speckit-e2e, superpower-e2e)
**Method:** `agent-browser` CLI (Playwright-based) + `curl` for API health
**Evidence:** 38 files across `e2e-evidence/{gsd,speckit,superpower}/`

---

## Executive Summary

Three independent implementations of the AI Judge grant evaluation system were tested against their production Cloud Run deployments and analyzed for localhost readiness. Each was built using a different Spec-Driven Development framework (GSD, Spec Kit, Superpowers) as part of a framework comparison experiment.

| Dimension | GSD | Spec Kit | Superpowers |
|-----------|-----|----------|-------------|
| **Overall Score** | **7/10** | **8/10** | **6.5/10** |
| Production Status | Deployed, functional | Deployed, most polished | Deployed, scaffold visible |
| Pages Working | 6/7 | 6/6 | 5/7 |
| API Routes | 6 working | 12 defined, 3 verified | 9 defined, 2 verified |
| Test Coverage | E2E + BDD configured | **24+ test files** (best) | E2E + BDD configured |
| On-Chain Integration | **Real data on Base Sepolia** | Configured, no data | Configured, no data |
| Form Validation | Zod server-side | **7 client-side errors** (best) | 21 form elements |
| Performance | 262ms load | **240ms load** (fastest) | 953ms load |
| Localhost Ready | YES | YES | YES |

### Winner by Category

| Category | Winner | Why |
|----------|--------|-----|
| **Most Feature-Complete** | Spec Kit | 6 pages, 12 API routes, 24+ tests, operator dashboard |
| **Best On-Chain Integration** | GSD | Real proposals on Base Sepolia with IPFS content, reputation scores |
| **Best Form UX** | Spec Kit | 7 distinct client-side validation messages, character counters |
| **Best Performance** | Spec Kit | 240ms load, 13 resources (leanest) |
| **Most Test Coverage** | Spec Kit | 4 unit + 20 E2E + integration + security tests |
| **Most Unique Features** | Superpowers | Chat, per-dimension eval with retry, verification page |
| **Best API Design** | GSD | Zod validation at boundaries, proper 400/405 error responses |

---

## Detailed Comparison

### 1. Page Load & Homepage

| Metric | GSD | Spec Kit | Superpowers |
|--------|-----|----------|-------------|
| HTTP Status | 307 -> /proposals | 200 | 200 |
| Page Title | "IPE City Grants" | "IPE City Grants - AI Judge System" | "Create Next App" (!) |
| Custom Homepage | No (redirects) | Yes (3 CTAs) | No (Next.js scaffold) |
| Load Time | 262ms | **240ms** | 953ms |
| Resources | 44 | **13** | 34 |

**Findings:**
- **Spec Kit** has the only proper homepage with intentional CTAs (Submit Proposal, View Proposals, Operator Dashboard)
- **GSD** skips the homepage entirely, redirecting to `/proposals` — functional but no landing experience
- **Superpowers** still shows the default Next.js "Get started by editing..." scaffold at `/` — the app lives at `/grants`

### 2. Navigation & Route Coverage

```
GSD Routes:                    Spec Kit Routes:              Superpowers Routes:
/ (307 -> /proposals)          / (homepage)                  / (Next.js scaffold)
/proposals                     /grants                       /grants
/proposals/new                 /grants/submit                /grants/submit
/proposals/[id]                /grants/[id]                  /grants/[id]
/proposals/[id]/evaluation     /grants/[id]/chat             /grants/[id]/evaluate
/proposals/[id]/reputation     /dashboard/operator           /grants/[id]/verify
/proposals/[id]/chat (404!)                                  /grants/[id]/chat
```

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| Proposal List | Yes (14 proposals) | Yes (empty, no data) | Yes |
| Submit Form | Yes | Yes (best validation) | Yes (most fields) |
| Detail View | Yes | Yes | Yes |
| Evaluation Page | Yes (Start Evaluation) | Via API only | Yes (per-dimension) |
| Reputation View | Yes (on-chain scores) | No dedicated page | No |
| Chat Interface | Route exists, 404 in prod | Route exists, needs data | Route exists |
| Operator Dashboard | No | Yes | No |
| Verification Page | No | No | Yes |

### 3. API Routes

| Endpoint Pattern | GSD | Spec Kit | Superpowers |
|------------------|-----|----------|-------------|
| `/api/health` | 404 | 503 (IPFS missing) | 404 |
| `/api/proposals` | 200 (14 items, 2.63s) | 200 (empty, fast) | 405 |
| `/api/evaluate` | 400 (Zod validation) | Via `/api/evaluate/[id]/finalize` | Via `/api/evaluate/[id]` |
| `/api/chat` | Exists | 404 in prod | Exists |
| `/api/colosseum/health` | 404 in prod | 404 in prod | 404 in prod |
| `/api/sync` | N/A | 405 (POST only) | N/A |
| `/api/reputation/[id]` | 200 | N/A | N/A |

**Critical finding:** `/api/colosseum/health` returns 404 on ALL THREE deployments despite existing in source code. This suggests a build/deploy mismatch or route compilation issue on Cloud Run.

**Health endpoint status:**
- GSD: No health endpoint at all
- Spec Kit: Has one but returns 503 (PINATA_GATEWAY not configured in prod env)
- Superpowers: No health endpoint at all

### 4. Form & Validation

| Aspect | GSD | Spec Kit | Superpowers |
|--------|-----|----------|-------------|
| Form Fields | Title, Description, Team Info, Budget, Links | Title, Category, Description, Tech Description, Budget, Currency, Team Members | Title, Description, Problem, Solution, Team, Budget, Timeline, Category, Demo Day, Community, Links |
| Field Count | 5 groups | 8 groups | **11 groups** (most comprehensive) |
| Interactive Elements | ~5 | 20 | **21** |
| Client Validation | Server-side Zod | **7 distinct error messages** | Not tested |
| Character Counter | No | Yes (0/10000) | No |
| Dynamic Sections | No | Yes (Add Member, Add Budget Item) | Yes (Team members) |

### 5. Responsive Design

All three worktrees implement responsive design:

| Breakpoint | GSD | Spec Kit | Superpowers |
|------------|-----|----------|-------------|
| Mobile (375x667) | 1-col cards | CSS classes confirm | Single column |
| Tablet (768x1024) | 2-col grid | Responsive prefixes | Adapts |
| Desktop (1440x900) | 3-col grid | Full width | Full width |

Screenshots captured for all viewports across GSD and Superpowers. Spec Kit resize was unavailable but CSS analysis confirms responsive implementation.

### 6. Performance

| Metric | GSD | Spec Kit | Superpowers |
|--------|-----|----------|-------------|
| Page Load | 262ms | **240ms** | 953ms |
| DOM Complete | 262ms | **240ms** | 953ms |
| Resources | 44 | **13** | 34 |
| API Latency (proposals) | 2.63s (slow!) | Fast (empty) | 1.75s |
| Initial curl | 0.54s | 0.61s | N/A |

**Analysis:**
- **Spec Kit** is the leanest (13 resources, Turbopack dev build)
- **GSD** has the most API latency (2.63s for proposals) because it fetches from chain + IPFS for each proposal
- **Superpowers** has the slowest page load (953ms) — likely heavier client bundle

### 7. On-Chain Integration

| Aspect | GSD | Spec Kit | Superpowers |
|--------|-----|----------|-------------|
| Real chain data | **YES (Base Sepolia)** | Configured, no data | Configured, no data |
| Proposals on-chain | 14 with IPFS CIDs | 0 | 0 |
| Reputation scores | 49/100 avg on #14 | Not tested | Not tested |
| Identity tokens | Registered | N/A | N/A |
| viem integration | Working | Present in deps | Present in deps |

**GSD is the only worktree with live on-chain data.** It has 14 proposals registered on Base Sepolia with IPFS-stored content and at least one complete evaluation cycle with reputation scores.

### 8. Test Infrastructure

| Aspect | GSD | Spec Kit | Superpowers |
|--------|-----|----------|-------------|
| Unit Tests | `bun test` configured | **4 vitest files** | None found |
| E2E Tests | Playwright configured | **20+ Playwright specs** | Playwright configured |
| BDD Tests | `playwright-bdd` configured | Feature tests | `playwright-bdd` configured |
| Integration Tests | None | **4 files** (eval pipeline, IPFS, on-chain, security) | None |
| Security Tests | None | **1 security audit spec** | None |
| Test Database | None | **local.db + test.db** | None |
| Total Test Files | ~2-3 | **24+** | ~2-3 |

**Spec Kit dominates test coverage** with 24+ test files spanning unit, E2E, integration, and security layers.

### 9. Localhost Readiness

All three worktrees are **READY TO RUN** locally:

| Check | GSD | Spec Kit | Superpowers |
|-------|-----|----------|-------------|
| node_modules | Yes | Yes | Yes |
| .env.local | Yes | Yes | Yes |
| .env.example | Yes | Yes | Yes |
| Scripts defined | Yes | Yes | Yes |
| Database | N/A | SQLite (local.db) | N/A |
| Start command | `bun run dev` | `bun run dev` (Turbopack) | `bun run dev` |

All require valid API keys (OpenAI/Anthropic) for AI features and RPC URLs for on-chain features.

---

## Issues Found Across All Worktrees

### Shared Issues (All 3)

| # | Severity | Issue | Affected |
|---|----------|-------|----------|
| 1 | HIGH | `/api/colosseum/health` returns 404 on all prod deployments despite existing in source | ALL |
| 2 | MEDIUM | No console error tracking instrumented | ALL |
| 3 | LOW | Chat routes exist in source but are non-functional or untested in prod | ALL |

### Per-Worktree Issues

#### GSD (7 issues)
| # | Severity | Issue |
|---|----------|-------|
| 1 | MAJOR | Chat route (`/proposals/[id]/chat`) returns 404 in prod |
| 2 | MAJOR | Client-side navigation broken on proposal cards (hydration issue) |
| 3 | MAJOR | No `/api/health` endpoint |
| 4 | MINOR | API `/proposals` response slow (2.63s) |
| 5 | MINOR | Root route (/) returns 404 HTML before redirect |
| 6 | MINOR | Test data pollution (9 duplicate proposals + 1 garbage entry) |
| 7 | MINOR | Reputation history shows "Unknown" dates and "Pending" tx hashes |

#### Spec Kit (5 issues)
| # | Severity | Issue |
|---|----------|-------|
| 1 | HIGH | IPFS not configured in prod (missing PINATA_GATEWAY) — blocks proposal pipeline |
| 2 | MEDIUM | `/api/chat` and `/api/colosseum/health` return 404 despite existing in source |
| 3 | MEDIUM | Grant detail page shows raw SSR error on invalid ID |
| 4 | LOW | No global navigation bar |
| 5 | LOW | Operator dashboard shows "Unknown" user |

#### Superpowers (3 issues)
| # | Severity | Issue |
|---|----------|-------|
| 1 | MAJOR | Homepage shows Next.js scaffold (not custom content) |
| 2 | MAJOR | No `/api/health` endpoint |
| 3 | MINOR | API routes require params — bare endpoints return 404 (expected but not self-documenting) |

---

## Evidence Inventory

### Screenshots (31 image files)

#### GSD (`e2e-evidence/gsd/prod/`)
| File | Description |
|------|-------------|
| `01-homepage.png` | Proposals listing (viewport) |
| `02-homepage-full.png` | Proposals listing (full page, 14 cards) |
| `05-nav-submit-proposal.png` | Submit Proposal form |
| `05-nav-proposal-14-detail.png` | Proposal #14 detail page |
| `05-nav-proposal-detail.png` | Proposal detail navigation |
| `05-nav-proposal-detail-direct.png` | "Proposal not found" error state |
| `05-nav-evaluation.png` | Evaluation page (ready state) |
| `05-nav-reputation.png` | Reputation page with on-chain data |
| `06-mobile.png` | Mobile responsive (375x667) |
| `07-tablet.png` | Tablet responsive (768x1024) |
| `08-desktop.png` | Desktop responsive (1440x900) |

#### Spec Kit (`e2e-evidence/speckit/prod/`)
| File | Description |
|------|-------------|
| `01-homepage.png` | Homepage with 3 CTAs |
| `02-homepage-full.png` | Full page homepage |
| `05-nav-submit.png` | Proposal submission form |
| `05-nav-grants.png` | Grants list page |
| `05-nav-operator.png` | Operator dashboard |
| `09-form-empty-submit.png` | Validation errors on empty submit |

#### Superpowers (`e2e-evidence/superpower/prod/`)
| File | Description |
|------|-------------|
| `01-homepage.png` | Homepage viewport |
| `02-homepage-full.png` | Homepage full page |
| `05-nav-grants.png` | Grants navigation page |
| `05-nav-submit.png` | Submit page viewport |
| `05-nav-submit-full.png` | Submit page full page |
| `06-mobile.png` | Mobile responsive (375x667) |
| `07-tablet.png` | Tablet responsive (768x1024) |
| `08-desktop.png` | Desktop responsive (1440x900) |

### Text Evidence (7 files)
- `{worktree}/prod/03-interactive-elements.txt` — Accessibility tree snapshots
- `{worktree}/prod/04-page-content.txt` — Full page text content
- `speckit/prod/05a-submit-interactive-elements.txt` — Form element inventory

### Localhost Analysis (3 files)
- `{worktree}/localhost/analysis.txt` — Dependency, route, and readiness audit

### Test Results (3 files)
- `{worktree}/test-results.md` — Structured pass/fail results per worktree

---

## Recommendations

### Immediate (All Worktrees)
1. **Add `/api/health` endpoint** returning `{ status: "ok", timestamp, version }` — required for Cloud Run health checks
2. **Fix `/api/colosseum/health` deployment** — route exists in source but 404s in prod on all 3 deployments
3. **Configure PINATA_GATEWAY** in Spec Kit prod environment variables

### Per-Worktree

#### GSD
- Fix client-side navigation on proposal cards (hydration/event handler issue)
- Add caching layer for `/api/proposals` (2.63s is too slow for production)
- Clean up test data pollution (duplicate proposals)
- Complete on-chain event indexing (timestamps, tx hashes)

#### Spec Kit
- Add global navigation bar (currently no persistent nav)
- Wire up authentication (next-auth configured but not active)
- Deploy chat and colosseum/health routes (exist in code, missing in prod)
- Add friendly error page for invalid proposal IDs

#### Superpowers
- Replace Next.js scaffold homepage with custom landing page
- Implement GET handler for `/api/proposals`
- Add health check endpoint

### For the Framework Comparison
- **Spec Kit** produced the most polished, testable, and feature-complete implementation
- **GSD** produced the only implementation with real on-chain data and working evaluation pipeline
- **Superpowers** produced the most architecturally ambitious feature set (chat, per-dimension eval, verification) but left scaffolding visible

---

## Methodology

Each worktree was tested by an independent agent using:
- **`agent-browser` CLI** (Playwright-based headless browser) for page loads, screenshots, interactive element audits, responsive testing
- **`curl`** for API endpoint health checks with timing
- **File system analysis** for localhost readiness (package.json, env files, route structure, node_modules)

Tests covered:
1. Page load and health (HTTP status, title, URL)
2. Interactive elements audit (accessibility tree snapshot)
3. Page content extraction (text dump)
4. Navigation testing (all discoverable routes)
5. Responsive design (mobile 375px, tablet 768px, desktop 1440px)
6. API health checks (all `/api/*` endpoints)
7. Console error detection
8. Performance metrics (load timing, resource count)
9. Form validation (Spec Kit only — empty submit test)
10. Localhost readiness (dependencies, env, scripts, routes)
