# E2E Test Suite Analysis

**Date:** 2026-04-13
**Branch:** speckit
**Framework:** Playwright 1.59.1 + Chromium
**Runner:** `bun run test:e2e`

## Test Results

| Suite | Tests | Passed | Failed | Duration |
|-------|-------|--------|--------|----------|
| navigation.spec.ts | 3 | 3 | 0 | ~2.5s |
| grants-list.spec.ts | 3 | 3 | 0 | ~3.6s |
| proposal-detail.spec.ts | 3 | 3 | 0 | ~2.2s |
| operator-dashboard.spec.ts | 1 | 1 | 0 | ~1.6s |
| **Total** | **10** | **10** | **0** | **16.4s** |

## Coverage by Route

| Route | Tests | What's Covered |
|-------|-------|---------------|
| `/` | 1 | Heading renders, main element visible |
| `/grants` | 5 | Empty state, proposal cards, search form, heading, search input |
| `/grants/[id]` | 3 | 404 for missing ID, back link, metadata sections |
| `/dashboard/operator` | 1 | Auth redirect for unauthenticated users |

## Page Screenshots

| Screenshot | Description |
|-----------|-------------|
| `screenshots/01-landing.png` | Landing page — centered "IPE City Grants" heading with subtitle |
| `screenshots/02-grants-list-empty.png` | Grants list with empty DB — "No proposals found" card, search bar |
| `screenshots/03-grants-search.png` | Search query applied — URL params work correctly |
| `screenshots/04-proposal-404.png` | Default Next.js 404 for non-existent proposal |
| `screenshots/05-operator-auth-redirect.png` | Auth redirect — shows 404 (next-auth redirect chain) |

## Architecture Observations

### What Works Well

1. **Server Components render correctly** — `/grants` page uses `listProposals()` server-side query with drizzle/libsql; renders clean empty state when DB has no data.
2. **Search is server-driven** — form submits as query params, page re-renders server-side. No client-side state management needed.
3. **Auth guard works** — `/dashboard/operator` properly redirects unauthenticated users via `next-auth`.
4. **404 handling** — `notFound()` in `grants/[id]/page.tsx` correctly returns 404 for missing proposals.

### Issues Found

1. **No shared navigation** — Landing page has no nav bar or links to `/grants`. Users must know the URL. The superpower worktree had a proper nav with "IPE City Grants" brand and "Submit Proposal" CTA.
2. **No proposal submission flow** — Unlike the superpower worktree which has `/grants/submit`, speckit has no form to create proposals. The only data entry path is via API webhooks.
3. **Operator dashboard auth UX** — Redirects to a 404-like page rather than a styled sign-in page. `next-auth` default pages are unstyled.
4. **No global layout chrome** — `layout.tsx` is minimal (just font + body wrapper). No header, footer, or navigation.

### Comparison with Other Worktrees

| Aspect | Speckit | Superpower | Full-Vision-Roadmap |
|--------|---------|------------|---------------------|
| E2E test style | Modular per-feature | Single golden-path serial | Modular per-feature |
| Test count | 10 | 8 | ~15 |
| Proposal submission | No UI form | Full multi-step form | Full form with validation |
| Navigation | None | Header with nav | Header with nav |
| Auth testing | Redirect check | N/A | N/A |
| DB setup | Global setup with local SQLite | N/A (in-memory) | N/A |

### Test Infrastructure

- **Global setup** (`e2e/global-setup.ts`): Creates SQLite tables via raw SQL before tests run. This ensures the Next.js dev server can start without a remote Turso connection.
- **`.env.test`**: Minimal env using `file:./test.db` for local SQLite. No external service dependencies.
- **Serial execution**: `fullyParallel: false` + `workers: 1` ensures tests run in order. Important because the dev server shares state across all tests.

## Recommendations

1. **Add shared layout with navigation** — Header component linking `/` -> `/grants` -> `/grants/submit`
2. **Add proposal submission page** — `/grants/submit` with form matching the schema
3. **Style auth pages** — Custom next-auth sign-in page at `/auth/signin`
4. **Expand e2e coverage** — Add tests for API routes (`/api/proposals`, `/api/sync`) and evaluation flow once AI integration is wired
5. **Add CI integration** — Wire `bun run test:e2e` into GitHub Actions with `playwright install --with-deps chromium`
