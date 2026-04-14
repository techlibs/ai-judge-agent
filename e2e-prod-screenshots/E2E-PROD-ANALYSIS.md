# E2E Production Analysis — Agent Reviewer Worktrees

**Date:** 2026-04-13
**Tester:** Claude Opus 4.6 (automated browser + API testing)
**Method:** Browser automation via `agent-browser` + `curl` API probing
**Scope:** Full golden-path E2E flow on all three Cloud Run deployments

---

## Executive Summary

| Dimension | GSD | Spec Kit | Superpowers |
|-----------|-----|----------|-------------|
| **Overall Readiness** | **Low** | **Medium-High** | **Low-Medium** |
| Homepage | Redirect to /proposals | Clean landing page with 3 CTAs | Default Next.js starter template |
| Proposal Submission | Form renders, submit fails silently | Rich form, clear IPFS error on submit | Most comprehensive form, client validation works |
| Grants Listing | Error: "Failed to load proposals" | Works (empty state + search) | Default starter template (no content) |
| API Layer | Broken (no health, proposals fail) | Functional (health, proposals, webhooks) | Non-existent (404 on all API routes) |
| Security Headers | None observed | Excellent (CSP, HSTS, X-Frame, etc.) | Excellent (identical CSP to Spec Kit) |
| On-Chain Integration | Not testable | DB + Chain OK, IPFS missing | Not testable |
| Error Handling | Poor (silent failures) | Good (clear error banners) | Moderate (native HTML validation) |

**Winner: Spec Kit** — the only worktree with a functioning backend, proper error handling, and production-grade security. Superpowers has the best UI form design but no backend. GSD is the most broken.

---

## Detailed Findings by Worktree

### 1. GSD (Get Shit Done)

**URL:** `https://agent-reviewer-gsd-1010906320334.us-central1.run.app`

#### What Works
- Root URL redirects (307) to `/proposals` — shows routing intent
- Submit form at `/proposals/new` renders correctly with all fields (Title, Description, Team Info, Budget, External Links)
- Character counters work (0/200, 0/5000, 0/2000)
- Form fields accept input properly
- Clean, minimal light-theme UI with header navigation

#### What's Broken
- **Proposals API returns error:** `GET /api/proposals` → `{"error":"Failed to fetch proposals"}`
- **Homepage shows red error:** "Failed to load proposals. Try refreshing the page."
- **Submit redirects to 404:** After filling and submitting, redirects to `/proposals/13` which shows "Proposal not found"
- **No health endpoint:** `/api/health` returns a Next.js 404 page
- **Missing routes:** `/evaluation` → 404, `/reputation` → 404
- **No security headers** (no CSP, no HSTS, no X-Frame-Options)

#### Screenshots
| # | File | Description |
|---|------|-------------|
| 1 | `gsd/01-homepage.png` | Proposals list with error state |
| 2 | `gsd/02-submit-proposal.png` | Submission form (empty) |
| 3 | `gsd/03-form-filled.png` | Form filled with test data |
| 4 | `gsd/04-after-submit.png` | "Proposal not found" after submit |
| 5 | `gsd/05-proposals-list.png` | Listing page error persists |

#### BDD Scenario Results

| Scenario | Status | Notes |
|----------|--------|-------|
| View proposals list | FAIL | API error, no proposals load |
| Submit proposal form | FAIL | Form renders but submit → 404 |
| View proposal detail | FAIL | Redirects to "not found" |
| Evaluation flow | FAIL | Route doesn't exist |
| Navigation | PARTIAL | Header links work, but pages are broken |

---

### 2. Spec Kit

**URL:** `https://agent-reviewer-speckit-1010906320334.us-central1.run.app`

#### What Works
- **Landing page:** Clean hero with "IPE City Grants" title, subtitle, and 3 action buttons (Submit, View, Operator Dashboard)
- **Grants listing:** Proper "Grant Proposals" page with search bar, "No proposals found" empty state, Submit button
- **API layer fully functional:**
  - `GET /api/health` → structured health check with DB, IPFS, Chain status and latency
  - `GET /api/proposals` → proper paginated response `{data: [], pagination: {page, pageSize, total, totalPages}, source: "cache"}`
  - `POST /api/webhooks/proposals` with bad API key → `{"error":"UNAUTHORIZED"}` (auth works)
  - `GET /api/webhooks/proposals` → 405 (correct method enforcement)
  - `GET /api/cron/monitoring` → 401 (auth protected)
- **Submit form** is the richest among worktrees: Category dropdown (Infrastructure/Education/Community/Research/Governance), Description with character counter (0/10000), Technical Description, Budget with Currency selector, Team Members (add/remove), Budget Breakdown
- **Error handling:** Clear red banner "PINATA_GATEWAY environment variable is required" when IPFS isn't configured
- **Security headers (comprehensive):**
  - `x-frame-options: DENY`
  - `x-content-type-options: nosniff`
  - `referrer-policy: strict-origin-when-cross-origin`
  - `content-security-policy` with proper `connect-src`, `img-src` for Pinata/IPFS
  - `strict-transport-security: max-age=31536000; includeSubDomains`
- **Health check breakdown:** DB OK (255ms), Chain OK (172ms), IPFS error (expected — Pinata not configured)

#### What's Broken
- **IPFS not configured:** Proposal submission fails because `PINATA_GATEWAY` env var is missing on the Cloud Run deployment
- **Operator Dashboard:** `/operator` → 404 (linked from homepage but route doesn't exist)
- **On-chain verification:** `/verify` → 404
- **Dispute workflow:** `/dispute` → 404
- **Form state after error:** After failed submit, form partially resets (title/category cleared, description preserved, budget reverts to 10000)

#### Screenshots
| # | File | Description |
|---|------|-------------|
| 1 | `speckit/01-homepage.png` | Landing page with 3 CTAs |
| 2 | `speckit/02-proposals-list.png` | Grants listing with search |
| 3 | `speckit/03-submit-proposal.png` | Rich submission form |
| 4 | `speckit/04-form-filled.png` | Form with test data filled |
| 5 | `speckit/05-after-submit.png` | Form state post-submit (partial reset) |
| 6 | `speckit/06-submit-result-top.png` | PINATA_GATEWAY error banner |
| 7 | `speckit/07-operator-dashboard.png` | Operator dashboard 404 |
| 8 | `speckit/08-grants-page.png` | Grants page (same as #2) |

#### BDD Scenario Results

| Scenario | Status | Notes |
|----------|--------|-------|
| View homepage | PASS | Clean landing with clear navigation |
| View grants listing | PASS | Empty state with search functionality |
| Submit proposal form | PARTIAL | Form works, submit fails (IPFS config) |
| API health check | PASS | Structured health with DB/IPFS/Chain status |
| Webhook auth | PASS | Rejects invalid API keys correctly |
| Cron security | PASS | Returns 401 without auth |
| Security headers | PASS | Full suite (CSP, HSTS, X-Frame, etc.) |
| Operator Dashboard | FAIL | 404 |
| On-chain verification | FAIL | Route not implemented |
| Dispute workflow | FAIL | Route not implemented |

---

### 3. Superpowers

**URL:** `https://agent-reviewer-superpower-1010906320334.us-central1.run.app`

#### What Works
- **Submit form** is the most comprehensive of all three: Title, Description, Problem Statement, Proposed Solution, Team (Name + Role + add more), Budget (USDC), Budget Breakdown, Timeline, Business Domain dropdown, Category dropdown, Demo Day Deliverable, Community Contribution, Past IPE Participation dropdown, External Links
- **Dark theme** with consistent styling throughout the app
- **Client-side validation** works (native HTML5 — minlength enforcement with tooltip)
- **Navigation** works between pages (IPE City brand, Grants link, Submit link)
- **Security headers** identical to Spec Kit (CSP, HSTS, X-Frame-Options, etc.)
- Good **SEO metadata:** title "IPE City Grants — AI-Evaluated, On-Chain Verified"

#### What's Broken
- **Homepage is the default Next.js starter:** "To get started, edit the page.tsx file" with Vercel/Next.js branding
- **Grants listing page** renders the same Next.js starter template (no actual content)
- **No API layer at all:** `/api/health` → 404, `/api/proposals` → empty, `/api/evaluate` → 404
- **No backend:** Proposal submission has no server-side handler — form validates client-side but can't actually submit
- **Mixed page content:** Header shows "IPE City" brand correctly, but main content area shows default Next.js template on non-form pages

#### Screenshots
| # | File | Description |
|---|------|-------------|
| 1 | `superpower/01-homepage.png` | Default Next.js template with IPE City nav |
| 2 | `superpower/02-grants-list.png` | Grants "page" (same default template) |
| 3 | `superpower/03-submit.png` | Comprehensive dark-theme submission form |
| 4 | `superpower/04-form-filled.png` | Form filled with test data (full page) |
| 5 | `superpower/05-after-submit.png` | Validation error on submit attempt |
| 6 | `superpower/06-submit-validation.png` | Client-side validation tooltip |

#### BDD Scenario Results

| Scenario | Status | Notes |
|----------|--------|-------|
| View homepage | FAIL | Shows Next.js default starter |
| Grants listing | FAIL | Shows Next.js default starter |
| Submit proposal form | PARTIAL | Form renders with all fields, validation works, but no backend |
| Evaluation flow | FAIL | No API routes |
| Navigation | PASS | Links work between pages |
| On-chain verification | FAIL | Not implemented |

---

## Comparative Analysis

### Feature Completeness Matrix

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| Landing page | No (redirect) | Yes (hero + CTAs) | No (default template) |
| Proposal form | Basic (5 fields) | Rich (8 fields + categories) | Comprehensive (15+ fields) |
| Grants listing | Broken | Working + search | Not implemented |
| API health check | Missing | Full (DB/IPFS/Chain) | Missing |
| Proposals API | Broken | Working + pagination | Missing |
| Webhook auth | N/A | Working (API-Key + rejection) | N/A |
| Security headers | None | Full suite | Full suite |
| Error handling | Silent failures | Clear error banners | HTML5 validation |
| Dark mode | No | No | Yes (system-level) |
| On-chain reads | N/A | DB + Chain OK | N/A |
| IPFS integration | N/A | Configured (needs env var) | N/A |
| Operator dashboard | N/A | 404 (linked but not built) | N/A |

### UX Quality

| Dimension | GSD | Spec Kit | Superpowers |
|-----------|-----|----------|-------------|
| Visual polish | Minimal, functional | Clean, professional | Dark theme, polished form |
| Information architecture | Flat (proposals only) | Hierarchical (home → grants → detail) | Flat (nav works, pages empty) |
| Form design | Basic fieldset | Rich with categories + counters | Most comprehensive, section grouping |
| Empty states | Error message | "No proposals found" | Default template (bad) |
| Loading states | Not observed | Not observed | Not observed |
| Mobile responsiveness | Not tested | Not tested | Not tested |

### Backend & Infrastructure

| Dimension | GSD | Spec Kit | Superpowers |
|-----------|-----|----------|-------------|
| API routes | Broken | 5+ working endpoints | None |
| Database | Not connected | Connected (OK, 255ms) | Not connected |
| IPFS | N/A | Configured (needs env) | N/A |
| Chain connection | N/A | Connected (OK, 172ms) | N/A |
| Auth/Security | None | Webhook auth + cron auth | None |
| Health monitoring | None | Structured health check | None |

### Production Readiness Score (0-10)

| Criteria | GSD | Spec Kit | Superpowers |
|----------|-----|----------|-------------|
| UI renders correctly | 4 | 8 | 5 |
| Core flow works end-to-end | 1 | 6 | 2 |
| API reliability | 0 | 7 | 0 |
| Security posture | 1 | 9 | 7 |
| Error handling | 2 | 7 | 4 |
| Data persistence | 0 | 6 | 0 |
| **Total (out of 60)** | **8** | **43** | **18** |

---

## Blockers to Full E2E Flow

None of the three worktrees can complete the full golden path (Submit → IPFS Pin → AI Evaluate → Display Scores → On-Chain Publish) in production. The specific blockers:

### GSD
1. No working database connection
2. No working API routes
3. Submit creates invalid record

### Spec Kit
1. **Missing `PINATA_GATEWAY` env var** on Cloud Run — this is the single blocker. If configured, the write path (submit → IPFS → evaluate) would likely work since DB and Chain are both connected.
2. Operator Dashboard not implemented
3. Verification/Dispute pages not implemented

### Superpowers
1. No API routes implemented
2. No database connection
3. Homepage/listing pages not implemented (still default template)
4. Submit form has no server-side handler

---

## Recommendations

1. **Spec Kit is closest to production** — add `PINATA_GATEWAY` and `PINATA_JWT` env vars to the Cloud Run service to unblock the full write path
2. **Superpowers has the best form UX** — if the backend were connected, it would offer the most comprehensive proposal experience
3. **GSD needs fundamental backend work** — API routes are broken, database isn't connected
4. **All three share the same security headers config** (CSP + HSTS) — this is likely from a shared base configuration, which is good
5. **None have the evaluation flow working end-to-end** — this is expected since it requires AI provider keys + IPFS + chain, but Spec Kit is 1 env var away

---

## Test Artifacts

All screenshots are stored in:
```
e2e-prod-screenshots/
├── gsd/           (5 screenshots)
├── speckit/       (8 screenshots)
├── superpower/    (6 screenshots)
└── E2E-PROD-ANALYSIS.md  (this file)
```

Total: **19 screenshots** captured across 3 worktrees.
