# GSD Code Review — Full Consolidated Report

**Date:** 2026-04-13
**Scope:** All 4 GSD phases reviewed by parallel agent team (4 Opus reviewers)
**Worktree:** `.worktrees/full-vision-roadmap/`

---

## Summary

| Severity | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|----------|---------|---------|---------|---------|-------|
| Critical | 1 | 3 | 2 | 0 | **6** |
| High | 3 | 5 | 3 | 2 | **13** |
| Medium | 6 | 6 | 4 | 4 | **20** |
| Low | 5 | 4 | 3 | 4 | **16** |
| | | | | | **55** |

---

## Phase 1: Foundation and Proposals

### CRITICAL (1)

**C1-1. `as Type` assertions violate TypeScript strict mode policy**
- File: `src/components/proposals/proposal-form.tsx:89,102`
- Code: `as { error: string }` and `as { tokenId: string }`
- Fix: Use Zod schemas or type narrowing

### HIGH (3)

**H1-1. Proposal submission registers ALL proposals under server wallet**
- File: `src/app/api/proposals/submit/route.ts:57`
- `register()` always passes deployer wallet as owner, not actual submitter
- Fix: Accept submitter address or derive from auth

**H1-2. `content-length` body size check is bypassable**
- File: `src/app/api/proposals/submit/route.ts:15-17`
- Client can omit header; body is fully read before size check
- Fix: Enforce size after parsing or at stream level

**H1-3. Proposal list API fetches ALL events from block 0 with no pagination**
- File: `src/app/api/proposals/route.ts:16-29`
- `fromBlock: 0n` + parallel IPFS fetches for every proposal
- Fix: Add pagination, caching, and block range limits

### MEDIUM (6)

**M1-1. IPFS CID not validated before use in gateway URL**
- File: `src/lib/ipfs/client.ts:40`
- Fix: Validate CID format (Qm.../bafy...) before interpolation

**M1-2. Server env vars all optional — silent misconfiguration**
- File: `src/lib/env.ts:4-9`
- Fix: Make critical vars (RPC_URL, DEPLOYER_PRIVATE_KEY) required

**M1-3. No rate limiting on proposal submission endpoint**
- File: `src/app/api/proposals/submit/route.ts`
- Fix: Add rate limiting (Redis-backed or KV)

**M1-4. `PROPOSAL_STATUS` uses `as const`**
- File: `src/lib/constants/proposal.ts:1-4`
- Note: `as const` may be acceptable; clarify project policy

**M1-5. Proposal detail links to owner address, labeled "On-chain TX"**
- File: `src/app/proposals/[id]/page.tsx:251-259`
- Fix: Link to actual transaction hash or fix label

**M1-6. Smart contract `getSummary()` unbounded loop**
- File: `contracts/src/ReputationRegistry.sol:97-99`
- Fix: Maintain running total for O(1) reads

### LOW (5)

**L1-1. `ProposalContent` interface duplicates `proposalContentSchema` shape**
- Fix: Derive type from schema via `z.infer`

**L1-2. No max supply test in IdentityRegistry tests**
- Fix: Add test for 1001st registration reverting

**L1-3. `setAgentURI` URI-too-long not tested when paused**
- Fix: Add pause + setAgentURI test

**L1-4. ReputationRegistry `contentHash` has no length limit**
- Fix: Add max length check in contract

**L1-5. Skeleton list layout doesn't match actual grid layout**
- Fix: Match skeleton to grid pattern

---

## Phase 2: AI Evaluation Pipeline

### CRITICAL (3)

**C2-1. Race condition on `completedCount` in orchestrator**
- File: `src/lib/evaluation/orchestrator.ts:58-71`
- Shared mutable counter mutated from parallel promises
- Fix: Compute count from accumulated results

**C2-2. `as Type` casts in use-evaluation hook**
- File: `src/lib/evaluation/use-evaluation.ts:191,218`
- `event.output as EvaluationOutput` and `event.evaluation as ProposalEvaluation`
- Fix: Fully type the Zod schema or use runtime parse

**C2-3. `as const` used throughout constants and schemas**
- Files: `constants.ts:31`, `schemas.ts:3-8`
- Note: Clarify if `as const` is exempt from project rule

### HIGH (5)

**H2-1. No input size limit on `proposalText`**
- File: `src/app/api/evaluate/route.ts:13`
- Only `.min(1)`, no `.max()`
- Fix: Add `.max(50000)` or similar

**H2-2. SSE stream has no timeout or heartbeat**
- File: `src/app/api/evaluate/route.ts:55-78`
- Fix: Add periodic heartbeat and timeout

**H2-3. `activeEvaluations` Set is per-instance, not durable**
- File: `src/app/api/evaluate/route.ts:15`
- In-memory Set doesn't survive Vercel cold starts
- Fix: Use external store or acknowledge limitation

**H2-4. `proposalId` used as BigInt without validation**
- File: `src/lib/evaluation/storage.ts:89`
- Fix: Validate proposalId is numeric before conversion

**H2-5. DIMENSIONS exported from two modules with different shapes**
- `schemas.ts:19` (string tuple) vs `constants.ts:18-23` (object array)
- Fix: Single canonical source

### MEDIUM (6)

**M2-1. Anomaly thresholds defined but never used**
- File: `src/lib/evaluation/prompts.ts:65-69`
- Dead code — remove or implement

**M2-2. `evaluateNaive` function never called**
- File: `src/lib/evaluation/agents.ts:48-58`
- Dead code — remove or implement

**M2-3. No authentication on evaluate endpoint**
- File: `src/app/api/evaluate/route.ts`
- Fix: Add auth middleware or API key check

**M2-4. Error details leaked to SSE client**
- File: `src/app/api/evaluate/route.ts:69-71`
- Fix: Sanitize error messages before sending

**M2-5. `use-evaluation.ts` doesn't handle AbortController/cleanup**
- Fix: Add AbortController to fetch, clean up on unmount

**M2-6. Hardcoded sample proposal text in evaluation page**
- File: `src/app/proposals/[id]/evaluation/page.tsx:17-22`
- Fix: Fetch actual proposal content

### LOW (4)

**L2-1. Component tests use source-string-matching, not rendering**
- Fix: Add @testing-library/react render tests

**L2-2. EvaluationProgress assumes sequential completion**
- Fix: Show all 4 dimensions as "running" during parallel eval

**L2-3. `getScoreBand` duplicates `SCORE_BANDS` logic**
- Fix: Derive from single source

**L2-4. Evaluation page accessibility table has hardcoded weights**
- Fix: Use DIMENSION_WEIGHTS constant

---

## Phase 3: On-Chain Reputation

### CRITICAL (2)

**C3-1. `as Type` assertion in reputation page**
- File: `src/app/proposals/[id]/reputation/page.tsx:22`
- `return data as ReputationResponse`
- Fix: Use `reputationResponseSchema.parse(data)`

**C3-2. Sequential N+1 RPC calls — DoS amplification**
- File: `src/lib/chain/reputation.ts:33-67`
- N + N sequential calls with no cap
- Fix: Add MAX_FEEDBACK_ENTRIES cap, batch with Promise.all

### HIGH (3)

**H3-1. Event ABI duplicated — diverges from canonical ABI**
- File: `src/lib/chain/reputation.ts:9-11`
- Fix: Extract event from REPUTATION_REGISTRY_ABI

**H3-2. BigInt precision loss and possible field misuse**
- File: `src/lib/chain/reputation.ts:27,43`
- `Number()` on BigInt; "timestamp" field may be block number
- Fix: Verify contract return values, use BigInt throughout

**H3-3. Optional env vars parsed as required — confusing errors**
- File: `src/lib/chain/contracts.ts:110-111` + `src/lib/env.ts:14-15`
- Fix: Make env vars required or add descriptive guard

### MEDIUM (4)

**M3-1. No Zod validation on `readFeedback` contract result**
- File: `src/lib/chain/reputation.ts:41`
- Fix: Add Zod schema for expected tuple

**M3-2. `as const` used in on-chain-status-badge**
- File: `src/components/reputation/on-chain-status-badge.tsx:8,13,18,21`
- Note: Borderline — consider `satisfies` pattern

**M3-3. Errors silently swallowed in reputation functions**
- File: `src/lib/chain/reputation.ts:71-74,96-98`
- Fix: Return discriminated union or rethrow unexpected errors

**M3-4. Page fetches own API route via HTTP unnecessarily**
- File: `src/app/proposals/[id]/reputation/page.tsx:17`
- Fix: Call chain functions directly from server component

### LOW (3)

**L3-1. `formatRelativeTime` doesn't handle zero/future timestamps**
- Fix: Guard timestamp === 0 with "Unknown" label

**L3-2. OnChainStatusBadge always renders "confirmed"**
- Fix: Derive status from data or simplify component

**L3-3. Cache-Control `public` on potentially user-specific data**
- Fix: Add code comment documenting why public is safe

---

## Phase 4: Visualization and Polish

### HIGH (2)

**H4-1. `as ProposalDetail` type cast**
- File: `src/app/proposals/[id]/page.tsx:82`
- Fix: Use Zod validation on API response

**H4-2. `as Record<string, unknown/string>` casts in use-evaluation hook**
- File: `src/lib/evaluation/use-evaluation.ts:135-136`
- Fix: Use Zod or type guard

### MEDIUM (4)

**M4-1. Tests are source-string-matching only**
- Files: `score-radar-chart.test.tsx`, `score-summary-card.test.tsx`
- Fix: Add @testing-library/react render tests

**M4-2. `as string` casts in chart.tsx (shadcn vendored)**
- File: `src/components/ui/chart.tsx:352,360`
- Note: Vendored component — may be acceptable

**M4-3. IIFE pattern unnecessarily complex in evaluation page**
- File: `src/app/proposals/[id]/evaluation/page.tsx:132-147`
- Fix: Extract to variable or sub-component

**M4-4. Hardcoded weight strings duplicated across files**
- Fix: Derive from DIMENSIONS constant

### LOW (4)

**L4-1. No `role="img"` on radar chart SVG**
- Fix: Add role="img" or aria-hidden="true" on SVG

**L4-2. `as const` in score-summary-card — acceptable**
- File: `score-summary-card.tsx:21`
- No action needed

**L4-3. Recharts is a large dependency for one chart**
- Note: Standard with shadcn — low priority

**L4-4. `SAMPLE_PROPOSAL_TEXT` hardcoded in evaluation page**
- Fix: Fetch actual proposal content

---

## Cross-Cutting Patterns

### Recurring: `as Type` Violations
Found in: Phase 1 (proposal-form), Phase 2 (use-evaluation), Phase 3 (reputation page), Phase 4 (proposal detail, use-evaluation)
**Root cause**: API responses parsed as `unknown` then cast instead of Zod-validated.
**Systemic fix**: Create a `safeFetch<T>(url, schema)` utility that fetches + validates in one step.

### Recurring: Missing Rate Limiting / Auth
Found in: Phase 1 (proposal submission), Phase 2 (evaluate endpoint)
**Root cause**: Rate limiting deferred; `@upstash/ratelimit` not installed.
**Systemic fix**: Install rate limiting library, add middleware.

### Recurring: Unbounded Queries
Found in: Phase 1 (proposal list from block 0), Phase 3 (N+1 RPC calls)
**Root cause**: No pagination design.
**Systemic fix**: Add pagination params to all list endpoints.

---

*Generated by gsd-review agent team (4 parallel Opus reviewers)*
*Reviewers: reviewer-phase-1, reviewer-phase-2, reviewer-phase-3, reviewer-phase-4*
