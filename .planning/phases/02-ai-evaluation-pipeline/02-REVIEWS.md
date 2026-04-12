---
phase: 02
reviewers: [claude, coderabbit]
reviewed_at: 2026-04-12
plans_reviewed: [02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md]
---

# Cross-AI Plan Review — Phase 2

## Claude Review

### Summary

This is a well-structured, thoughtfully decomposed phase. The three-wave approach (core schemas/agents -> orchestration/storage -> UI) creates clean dependency boundaries. The plans are unusually detailed with inline code snippets, explicit acceptance criteria, threat models, and interface contracts between waves. The biggest risks are not in the plans themselves but in their dependency on Phase 1 (which hasn't been executed yet) and in some architectural assumptions that may create friction during execution.

### Plan 02-01: AI Core

**Risk: LOW**

Strengths:
- Zod as single source of truth for OpenAI structured output, validation, and TypeScript types eliminates type drift
- Audit trail baked into DimensionEvaluation schema from day one
- Calibrated 5-band rubrics per dimension with dimension-specific scoring language
- Prompt injection mitigated by proposal text as user message only
- TDD approach with concrete test cases

Concerns:
- **MEDIUM** — `DIMENSIONS` exported from both `schemas.ts` and `constants.ts` with different shapes (string tuple vs object array). Will cause import confusion.
- **LOW** — `as const` on `MODEL_CONFIG.model` may conflict with project's "no `as Type`" rule (though `as const` is a const assertion, not a type assertion)
- **LOW** — `getScoreBand` duplicates `SCORE_BANDS` logic rather than deriving from it

Suggestions:
- Rename `DIMENSIONS` in schemas.ts to `DIMENSION_KEYS` to avoid collision
- Derive `getScoreBand` from iterating `SCORE_BANDS` object
- Add barrel export (`src/lib/evaluation/index.ts`)

### Plan 02-02: Orchestration API + Storage

**Risk: MEDIUM**

Strengths:
- `Promise.allSettled` for fault tolerance — partial evaluation (3 of 4) more useful than total failure
- Re-normalization for partial results mathematically sound
- Graceful degradation for missing env vars (`"ipfs-disabled"`, `"chain-disabled"`) excellent DX
- Explicit interface contracts copied from Plan 01

Concerns:
- **HIGH** — In-memory `activeEvaluations` Set doesn't survive Vercel cold starts or cross-instance. Two requests could bypass rate limiting.
- **HIGH** — SSE stream may be terminated by Vercel's default function timeout (10s, up to 60s on Pro). Need `export const maxDuration = 60` in route.ts.
- **MEDIUM** — `tokenId` derivation from `proposalId` undefined — Phase 1 coupling risk
- **MEDIUM** — No explicit cleanup of `activeEvaluations` on orchestration failure (rate limiter could permanently block a proposalId)
- **MEDIUM** — No retry for IPFS/chain failures after successful evaluation (expensive AI computation lost)
- **LOW** — `keccak256("evaluation-score")` should be a pre-computed constant

Suggestions:
- Add `export const maxDuration = 60` to route.ts
- Wrap orchestration in try/finally that removes proposalId from activeEvaluations
- Consider a `storage_failed` event type for IPFS/chain failures
- Define `METRIC_KEY_EVALUATION_SCORE` as a constant

### Plan 02-03: Evaluation UI

**Risk: LOW-MEDIUM**

Strengths:
- SSE via ReadableStream reader (correct for POST, not EventSource which only supports GET)
- Line buffering for SSE parsing explicitly addressed
- Comprehensive accessibility: `aria-live`, `aria-expanded`, `aria-label`, `motion-safe:animate-pulse`
- 4 page states explicitly enumerated with distinct UI compositions
- Human verification checkpoint appropriate for UI-heavy plan

Concerns:
- **MEDIUM** — No proposal text source for "Start Evaluation" (TODO stub). Human checkpoint may be untestable without Phase 1.
- **MEDIUM** — `useEvaluation` hook manages 8 pieces of state with `useState`. A `useReducer` with event-driven dispatch would be safer.
- **LOW** — EVAL-08 prompt comparison is static demo, not live comparison of actual proposal
- **LOW** — `lucide-react` dependency not listed in install steps (likely included via shadcn/ui)
- **LOW** — No input size limit on `proposalText` — could generate very large OpenAI requests

Suggestions:
- Add a hardcoded SAMPLE_PROPOSAL constant for the verification checkpoint
- Consider `useReducer` for the evaluation hook (events map 1:1 to state changes)
- Add `z.string().max(10000)` bound in the route's Zod validation

### Cross-Plan Assessment

**Overall Phase Risk: MEDIUM**

The wave structure (01 -> 02 -> 03) is sound with explicit interface contracts between waves. Coverage is complete for all 12 requirements. Security posture appropriate for v1 public-access.

Primary risks are external:
1. Phase 1 not yet executed (integration uncertainty for on-chain publication and proposal text)
2. `activeEvaluations` cleanup gap (potential stuck rate limiter)
3. Vercel function timeout for SSE streams

None are architectural problems — all addressable with specific fixes during execution.

---

## CodeRabbit Review

CodeRabbit reviewed the git diff (RESEARCH.md changes) rather than the plan files directly. Its feedback is scoped to the research document.

### Findings

1. **Refactor Suggestion — Assumption A3 validation** (RESEARCH.md:507): Add an empirical test plan for the "cross-contamination prevented by separate agent calls" assumption. Suggests defining test cases with intentionally skewed dimension profiles, computing pairwise score correlations, and failing if any exceed 0.7 threshold.

2. **Potential Issue — Cost abuse mitigations** (RESEARCH.md:549-561): Update threat patterns to include concrete controls: per-IP rate limiting, maximum proposal length in tokens with Zod validation, global concurrent evaluations cap, and optional wallet connection as Sybil resistance.

---

## Consensus Summary

### Agreed Strengths
- Zod-as-single-source-of-truth pattern for schemas (Claude)
- Promise.allSettled for fault tolerance with weight re-normalization (Claude)
- Graceful degradation for missing env vars (Claude)
- SSE via ReadableStream reader instead of EventSource (Claude)
- Comprehensive accessibility in UI components (Claude)

### Agreed Concerns
- **Rate limiting / cost abuse controls need strengthening** — Both Claude and CodeRabbit flagged that the in-memory rate limiter is insufficient and that additional controls (input size limits, concurrent evaluation caps) are needed
- **Phase 1 dependency creates integration risk** — Claude noted this across all 3 plans; the token ID scheme and proposal text sourcing are undefined

### Divergent Views
- CodeRabbit focused on empirical testing of cross-contamination assumptions (testing the AI evaluation quality itself), while Claude focused on the code architecture and deployment concerns
- CodeRabbit suggested wallet-based Sybil resistance; Claude accepted no-auth as appropriate for v1

### Priority Fixes for Execution
1. Add `export const maxDuration = 60` to route.ts (prevents Vercel timeout)
2. Add try/finally cleanup for `activeEvaluations` Set
3. Add `z.string().max(10000)` input size limit on proposalText
4. Rename dual `DIMENSIONS` export to avoid import confusion
5. Add hardcoded SAMPLE_PROPOSAL for human verification checkpoint
