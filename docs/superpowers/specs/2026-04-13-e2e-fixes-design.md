# E2E Fix Spec — Cross-Worktree Issue Resolution

**Date:** 2026-04-13
**Status:** Draft
**Scope:** 16 fixes across 3 worktrees (GSD, Spec Kit, Superpowers)
**Evidence:** `e2e-evidence/` (38 files from parallel agent testing)
**Approach:** Shared-first (3 common fixes), then per-worktree fixes in parallel

---

## Context

Three independent implementations of the AI Judge grant evaluation system were E2E tested against production Cloud Run deployments. Testing used `agent-browser` (Playwright CLI) with 3 parallel agents — one per worktree. Results:

- **Spec Kit:** 8/10 — most polished UI, best test coverage, fastest performance
- **GSD:** 7/10 — only worktree with real on-chain data, best API validation
- **Superpowers:** 6.5/10 — most ambitious feature set, but scaffold homepage visible

16 issues were identified: 3 shared across all worktrees, 5 GSD-specific, 5 Spec Kit-specific, 3 Superpowers-specific.

---

## Execution Strategy

**Phase 1 — Shared fixes (S1-S3):** Implement the same pattern in all 3 worktrees. These establish operational baseline (health checks, error tracking).

**Phase 2 — Per-worktree fixes (G1-G7, SK1-SK5, SP1-SP3):** Run 3 parallel agents, each owning one worktree. Agents work in isolation — no cross-worktree dependencies.

**Phase 3 — Verify:** Re-run E2E tests against all 3 prod deployments to confirm fixes.

---

## Phase 1: Shared Fixes

### S1. Add/Fix `/api/health` Endpoint

**Affected:** ALL 3 worktrees
**Severity:** HIGH
**Complexity:** Low

**Problem:**
- GSD: No health endpoint exists
- Spec Kit: Endpoint exists but returns 503 when IPFS is unconfigured (breaks Cloud Run liveness)
- Superpowers: No health endpoint exists

**Design:**

Create `src/app/api/health/route.ts` in each worktree:

```typescript
// Response shape
interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  checks: {
    db?: { status: "ok" | "error" | "unconfigured"; latencyMs: number };
    chain: { status: "ok" | "error"; latencyMs: number };
    ipfs: { status: "ok" | "error" | "unconfigured"; latencyMs: number };
  };
}
```

**Rules:**
- ALWAYS return HTTP 200 — Cloud Run needs this for liveness probes
- Set `status: "degraded"` if any check fails, but still return 200
- Individual check reports its own status — callers decide what matters
- Each check has a 5s timeout — don't let a hung dependency block the health response
- No authentication required

**Per-worktree adaptation:**
- GSD: Add `db: "unconfigured"` (no local DB), check chain via viem `getBlockNumber()`, check IPFS via Pinata gateway HEAD
- Spec Kit: Fix existing endpoint — change `return Response(503)` to `return Response(200)` with degraded status. Keep the existing check logic.
- Superpowers: Add `db` check (Drizzle/libsql), chain check, IPFS check. Pattern matches existing `colosseum/health` structure.

**Success criteria:** `curl /api/health` returns 200 on all 3 prod deployments.

---

### S2. Fix `/api/colosseum/health` Route Deployment

**Affected:** ALL 3 worktrees
**Severity:** MEDIUM
**Complexity:** Medium

**Problem:** Route exists in source code but returns 404 in production on all 3 deployments.

**Root cause:** The route imports `checkColosseumHealth()` from `@/lib/colosseum/client`. If the colosseum client module fails to initialize at build time (missing env var, unreachable endpoint), Next.js drops the entire route from the production bundle silently.

**Fix pattern (all 3):**

1. Wrap the colosseum client import in a dynamic/lazy pattern:

```typescript
// Before (breaks at build time)
import { checkColosseumHealth } from "@/lib/colosseum/client";

// After (safe at build time)
export async function GET() {
  try {
    const { checkColosseumHealth } = await import("@/lib/colosseum/client");
    const health = await checkColosseumHealth();
    return Response.json(health, { status: health.healthy ? 200 : 503 });
  } catch {
    return Response.json(
      { healthy: false, message: "Colosseum client unavailable" },
      { status: 503 }
    );
  }
}
```

2. Verify the route is present in `.next/server/app/api/colosseum/health/` after `bun run build`

**Success criteria:** `curl /api/colosseum/health` returns JSON (200 or 503) instead of 404 HTML on all 3 deployments.

---

### S3. Add Client-Side Console Error Tracking

**Affected:** ALL 3 worktrees
**Severity:** LOW
**Complexity:** Low

**Problem:** No mechanism to surface client-side JS errors during E2E testing or debugging.

**Fix:** Create a lightweight error boundary + global error handler as a client component.

File: `src/components/error-tracker.tsx`

```typescript
"use client";
// On mount:
// - window.onerror handler -> push to window.__console_errors[]
// - window.onunhandledrejection handler -> push to window.__console_errors[]
// - Cap at 50 entries (ring buffer)
// Renders nothing (invisible tracking component)
```

Add `<ErrorTracker />` in root `layout.tsx` inside `<body>`.

Also add a React Error Boundary wrapper in the layout for component-level crashes.

**Success criteria:** `window.__console_errors` is an array accessible from E2E tests. Any uncaught JS error appears in it.

---

## Phase 2: GSD Worktree Fixes

Worktree: `.worktrees/full-vision-roadmap/`

### G1. Fix Client-Side Navigation on Proposal Cards

**Severity:** MAJOR
**Complexity:** Medium

**Problem:** Clicking proposal cards on `/proposals` doesn't navigate. Direct URL works.

**Root cause:** `src/components/proposals/proposal-card.tsx` wraps the card in `<Link>`. Likely a nested interactive element (button, badge, or another anchor) inside the Link that captures the click event and prevents navigation.

**Fix (recommended: option 2):**
1. Read `proposal-card.tsx` and identify nested interactive elements
2. **Option 1:** Keep `<Link>` wrapper, add `e.stopPropagation()` on any nested interactive elements (badges, buttons)
3. **Option 2 (recommended):** Replace `<Link>` with a `<div role="link" onClick={() => router.push(...)}>` on the card, and ensure nested interactives have their own click handlers with `e.stopPropagation()`. This avoids the nested-anchor HTML validation issue entirely.

**Verification:** Use `agent-browser` to click a proposal card and confirm navigation occurs.

### G2. Fix Chat Route 404 in Production

**Severity:** MAJOR
**Complexity:** Medium

**Problem:** `/proposals/[id]/chat` returns 404 in prod despite existing in source.

**Root cause:** Same as S2 — build-time import failure. The chat page likely imports AI SDK modules that fail to resolve without API keys at build time.

**Fix:**
1. Check `src/app/proposals/[id]/chat/page.tsx` for top-level AI SDK imports
2. Move AI-dependent logic to API routes (already exist at `/api/chat`)
3. The page component should be a pure client component that calls the API — no server-side AI imports
4. Verify page appears in build output after fix

**Verification:** `curl /proposals/1/chat` returns HTML, not 404.

### G3. No `/api/health`

**Covered by S1.**

### G4. Cache `/api/proposals` Response

**Severity:** MINOR
**Complexity:** Medium

**Problem:** 2.63s response time. Every request rescans chain event logs + fetches IPFS for each proposal.

**Fix:**
1. Add module-level in-memory cache in `src/app/api/proposals/route.ts`:

```typescript
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

// In GET handler:
// 1. Build cache key from query params (page, pageSize)
// 2. If cache hit and not expired, return cached data
// 3. Otherwise, fetch from chain+IPFS, store in cache, return
```

2. Invalidate cache in `src/app/api/proposals/submit/route.ts` after successful submission:
```typescript
cache.clear(); // Simple — just clear all cached pages
```

**Target:** < 500ms for cached responses (first request still ~2.6s).

### G5. Clean Root Route Redirect

**Severity:** MINOR
**Complexity:** Low

**Problem:** Root `/` returns 404 HTML before redirecting to `/proposals`.

**Fix:** Replace `src/app/page.tsx` content with:

```typescript
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/proposals");
}
```

This returns a clean 307 without rendering any HTML body.

### G6. Handle Test Data Pollution in UI

**Severity:** MINOR
**Complexity:** Low

**Problem:** 9 duplicate "Solar-Powered WiFi" proposals + 1 garbage entry. On-chain, so can't delete.

**Fix:** Add a testnet banner to the proposals page:

```tsx
{chainId === 84532 && (
  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
    Base Sepolia Testnet — includes test proposals
  </div>
)}
```

No filtering — keep all data visible for transparency. The banner sets expectations.

### G7. Resolve Block Timestamps in Reputation History

**Severity:** MINOR
**Complexity:** Medium

**Problem:** Reputation history shows "Unknown" dates and "Pending" tx hashes.

**Fix:**
1. In the reputation data fetcher (likely `src/app/api/reputation/[tokenId]/route.ts` or a lib function):
   - After fetching events, extract unique `blockNumber` values
   - Batch call `publicClient.getBlock({ blockNumber })` for each
   - Map `block.timestamp` (Unix seconds) to ISO date strings
2. Transaction hashes should already be in the event log entry as `transactionHash` — verify the field is being read and passed to the UI
3. In the reputation component, display:
   - Date: formatted from block timestamp
   - Tx: linked to `basescan.org/tx/{hash}` (or `sepolia.basescan.org` for testnet)

---

## Phase 2: Spec Kit Worktree Fixes

Worktree: `.worktrees/speckit/`

### SK1. Configure PINATA_GATEWAY in Production

**Severity:** HIGH
**Complexity:** Low (infrastructure only)

**Problem:** `/api/health` returns 503 because PINATA_GATEWAY env var is missing from Cloud Run.

**Fix:**
```bash
gcloud run services update agent-reviewer-speckit \
  --region us-central1 \
  --project ipe-city \
  --set-env-vars "PINATA_GATEWAY=<gateway-url>"
```

Also verify `PINATA_JWT` is set. Check `.env.local` in the worktree for the correct values.

**Code fix:** Covered by S1 — health endpoint should return 200 with `ipfs: "unconfigured"` instead of 503 even if this env var is missing.

### SK2. Fix Chat and Colosseum Routes in Production

**Severity:** MEDIUM
**Complexity:** Medium

**Problem:** `/api/chat` and `/api/colosseum/health` return 404 in prod.

**Fix:**
- Colosseum: Covered by S2 (dynamic import pattern)
- Chat: Same pattern — the route uses `streamText()` from Vercel AI SDK with Anthropic provider. If `ANTHROPIC_API_KEY` is missing at build, the import chain breaks.

Fix for chat:
1. Move provider initialization to runtime (inside the POST handler)
2. Use dynamic import for `@ai-sdk/anthropic` and `@ai-sdk/openai`
3. Return 503 with message if no API keys are configured instead of failing to build

### SK3. Add Friendly Not-Found Page for Invalid Grant IDs

**Severity:** MEDIUM
**Complexity:** Low

**Problem:** `/grants/test-id-123` shows raw SSR error instead of friendly message.

**Fix:** Create `src/app/grants/[id]/not-found.tsx`:

```tsx
import Link from "next/link";

export default function GrantNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Proposal Not Found</h1>
      <p className="text-muted-foreground">
        The proposal you're looking for doesn't exist or has been removed.
      </p>
      <Link href="/grants" className="text-primary underline">
        Back to all proposals
      </Link>
    </main>
  );
}
```

The existing `notFound()` call in `page.tsx` (line 25) automatically renders this component.

### SK4. Add Global Navigation Bar

**Severity:** LOW
**Complexity:** Medium

**Problem:** No persistent navigation. Users must know URLs.

**Fix:**

1. Create `src/components/nav-bar.tsx`:
   - Logo/brand: "IPE City Grants" linking to `/`
   - Links: Grants (`/grants`), Submit (`/grants/submit`), Dashboard (`/dashboard/operator`)
   - Responsive: horizontal on desktop, hamburger menu on mobile
   - Use existing Tailwind classes + shadcn Button/Sheet for mobile drawer

2. Add to `src/app/layout.tsx`:
   ```tsx
   <body>
     <NavBar />
     {children}
   </body>
   ```

3. Keep the existing homepage CTAs — the nav bar is supplementary, not a replacement.

### SK5. Fix Operator Dashboard User Display

**Severity:** LOW
**Complexity:** Low

**Problem:** Shows "User: Unknown" when auth isn't configured.

**Fix:** In `src/app/dashboard/operator/page.tsx`:

```typescript
// Before
const userName = session?.user?.email;

// After
const userName = session?.user?.email ?? "Not authenticated";
```

If auth is intentionally disabled in prod, this is accurate. If auth should be enabled, add the missing `AUTH_SECRET` env var to Cloud Run.

---

## Phase 2: Superpowers Worktree Fixes

Worktree: `.worktrees/superpower/`

### SP1. Replace Next.js Scaffold Homepage

**Severity:** MAJOR
**Complexity:** Low

**Problem:** Root `/` shows "Get started by editing page.tsx" — default Next.js boilerplate.

**Fix:** Replace `src/app/page.tsx` with a landing page:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          IPE City Grants
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          AI-powered grant evaluation with transparent, on-chain scoring
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/grants/submit"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium"
        >
          Submit Proposal
        </Link>
        <Link
          href="/grants"
          className="border border-input px-6 py-3 rounded-lg font-medium"
        >
          View Grants
        </Link>
      </div>
    </main>
  );
}
```

Matches the Spec Kit pattern (tested best in E2E) while using the existing layout header/nav.

### SP2. No `/api/health`

**Covered by S1.**

### SP3. Add GET Handler to `/api/proposals`

**Severity:** MINOR
**Complexity:** Medium

**Problem:** Route only exports POST. GET returns 405.

**Fix:** Add GET handler to `src/app/api/proposals/route.ts`:

```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

  // Query from Drizzle DB (same source as grants page server component)
  const proposals = await db
    .select()
    .from(proposalsTable)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .orderBy(desc(proposalsTable.createdAt));

  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(proposalsTable);

  return Response.json({
    data: proposals,
    pagination: { page, pageSize, total: Number(count), totalPages: Math.ceil(Number(count) / pageSize) },
  });
}
```

Uses the same Drizzle DB already used by the grants page component. Adapt table/column names to match the actual schema.

---

## Phase 3: Verification

After all fixes are deployed, re-run the E2E test suite:

```bash
# Per-worktree verification
agent-browser --session gsd-verify open https://agent-reviewer-gsd-1010906320334.us-central1.run.app/api/health
agent-browser --session speckit-verify open https://agent-reviewer-speckit-1010906320334.us-central1.run.app/api/health
agent-browser --session superpower-verify open https://agent-reviewer-superpower-1010906320334.us-central1.run.app/api/health
```

**Exit criteria:**
- All `/api/health` endpoints return 200
- All `/api/colosseum/health` endpoints return JSON (not 404)
- GSD proposal card navigation works
- Spec Kit grant not-found shows friendly page
- Superpowers homepage shows custom landing (not scaffold)
- `window.__console_errors` accessible on all 3 deployments
- No regressions in existing passing tests

---

## Dependency Graph

```
S1 (health) ─────────┐
S2 (colosseum fix) ───┤── Phase 1 (sequential, all worktrees)
S3 (error tracking) ──┘
                       │
          ┌────────────┼────────────┐
          v            v            v
     GSD Fixes    SK Fixes    SP Fixes     ── Phase 2 (parallel, per-worktree)
     (G1-G7)     (SK1-SK5)   (SP1-SP3)
          │            │            │
          └────────────┼────────────┘
                       v
                 E2E Re-test                ── Phase 3 (verify all)
```

---

## Estimated Effort

| Phase | Work | Agents | Time |
|-------|------|--------|------|
| Phase 1 | 3 shared fixes x 3 worktrees | 1 (sequential) | ~45 min |
| Phase 2 | 5 + 5 + 3 per-worktree fixes | 3 (parallel) | ~60 min |
| Phase 3 | E2E re-test all 3 deployments | 3 (parallel) | ~15 min |
| **Total** | **16 fixes** | | **~2 hours** |
