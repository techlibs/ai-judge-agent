# Evaluation Pipeline Code Review — GSD Worktree

**Reviewer:** Agent Auditor (Claude Opus 4.6)
**Date:** 2026-04-13
**Scope:** Full evaluation pipeline — scoring logic, aggregation, storage integrity, concurrency, edge cases
**Worktree:** `.worktrees/full-vision-roadmap/`

---

## 1. Architecture Summary

The evaluation pipeline follows this flow:

```
Client (useEvaluation hook)
  → POST /api/evaluate (SSE streaming)
    → orchestrateEvaluation()
      → 4x evaluateDimension() in parallel via Promise.all
      → 1x evaluateNaive() in parallel (comparison baseline)
      → computeAggregateScore()
      → pinEvaluationToIPFS()
      → publishScoreOnChain()
    ← SSE progress events streamed back
```

**Key design decisions:**
- Vercel AI SDK `generateObject` with Zod schemas for structured LLM output (no Mastra despite CLAUDE.md mentioning it)
- 4 independent judge agents scoring in parallel, one per dimension
- Weighted aggregation with re-normalization for partial failures
- IPFS pinning (Pinata) + on-chain publication (ReputationRegistry) for storage
- SSE streaming for real-time progress to the client

---

## 2. Concrete Score Computation Walkthrough

**Scenario:** A proposal receives these scores from the 4 judges:

| Dimension | Score | Weight |
|-----------|-------|--------|
| Technical | 80 | 0.25 |
| Impact | 60 | 0.30 |
| Cost | 70 | 0.20 |
| Team | 90 | 0.25 |

**Computation in `computeAggregateScore()` (orchestrator.ts:35-49):**

```
weightedSum = 80*0.25 + 60*0.30 + 70*0.20 + 90*0.25
            = 20 + 18 + 14 + 22.5
            = 74.5

totalWeight = 0.25 + 0.30 + 0.20 + 0.25 = 1.0

result = 74.5 / 1.0 = 74.5
rounded = Math.round(74.5 * 10) / 10 = 74.5
```

**Partial failure scenario (Team judge fails):**

```
weightedSum = 80*0.25 + 60*0.30 + 70*0.20 = 20 + 18 + 14 = 52
totalWeight = 0.25 + 0.30 + 0.20 = 0.75
result = 52 / 0.75 = 69.333...
rounded = Math.round(69.333... * 10) / 10 = 69.3
```

The re-normalization (dividing by actual totalWeight instead of 1.0) ensures the aggregate stays on the 0-100 scale even when dimensions fail. This is correct.

**On-chain publication:**
The weighted score (e.g., 74.5) is converted via `BigInt(Math.round(74.5))` = `BigInt(75)` in `storage.ts:93`. This loses the decimal — the on-chain score is an integer. This is noted below as a finding.

---

## 3. Findings

### CRITICAL

**(C1) Race condition in `completedCount` tracking — orchestrator.ts:58-68**

The `results` array is shared across concurrent async callbacks. When multiple `evaluateDimension` calls resolve near-simultaneously, `results.push(result)` and `results.length` are not atomic. JavaScript's single-threaded event loop means individual `.push()` calls won't interleave, but the `completedCount` value reported in progress events may not match the true state because the push and the length read happen in the same microtask. In practice this is safe in Node.js/Bun single-threaded runtimes, but the pattern is fragile and confusing. A dedicated counter variable would be clearer and safer.

**Severity downgrade:** On reflection, this is **LOW** in practice due to JS single-threading, but the code communicates the wrong intent. The `results` array mixes completed and failed entries (nulls), so `results.length` reports total attempted, not total completed. The `completedCount` field name is misleading — it actually means "attempted so far."

**(C2) `activeEvaluations` set is per-instance — route.ts:17-19**

The duplicate-evaluation guard (`activeEvaluations.has(proposalId)`) and capacity limit (`MAX_CONCURRENT_EVALUATIONS`) use an in-memory `Set`. On Vercel (serverless), each cold start gets a fresh `Set`, so:
- The same proposal can be evaluated concurrently by different instances
- The capacity limit doesn't protect the system globally

The code has a TODO comment acknowledging this. For a production deployment this needs Redis/KV backing. For the current prototype stage, this is acceptable but should be tracked.

### HIGH

**(H1) On-chain score truncates decimal — storage.ts:93**

```typescript
const scoreRounded = BigInt(Math.round(score));
```

The aggregate score is computed to 1 decimal place (e.g., 74.5), but the on-chain score loses that precision. A score of 74.5 becomes 75 on-chain. This means the IPFS content (which has 74.5) and the on-chain score (75) can differ. This is a data integrity concern — the on-chain score is the "official" one but doesn't match the detailed evaluation.

**Recommendation:** Either (a) store scores as basis points (multiply by 100, so 74.5 becomes 7450) on-chain, or (b) document that on-chain scores are rounded integers and IPFS is the source of truth for precise scores.

**(H2) No retry logic for LLM calls — agents.ts:17-24**

Each `evaluateDimension` call makes a single attempt. If the OpenAI API returns a transient error (rate limit, timeout, 500), the dimension is permanently marked as failed. With 4 parallel calls to the same model, rate limiting is plausible.

**Recommendation:** Add 1-2 retries with exponential backoff for transient errors (429, 500, 503).

**(H3) Storage failures crash the entire evaluation — orchestrator.ts:118-124**

After all 4 judges complete and the aggregate is computed, `pinEvaluationToIPFS` and `publishScoreOnChain` are called sequentially. If either throws, the entire evaluation is lost — the client gets a `failed` event despite all judge scores being successfully computed.

**Recommendation:** Wrap storage in try/catch, emit the `complete` event with the evaluation regardless, and emit a separate `storage_failed` event if IPFS/chain fails. The evaluation results should not be lost due to storage issues.

**(H4) `publishScoreOnChain` silently skips without `simulateContract` error handling — storage.ts:96-105**

The code calls `simulateContract` then `writeContract`, but does not wait for the transaction receipt. The caller gets back a `txHash` but has no confirmation the transaction succeeded. If the transaction reverts (e.g., the caller doesn't have permission on the ReputationRegistry), the evaluation pipeline reports success with an invalid txHash.

### MEDIUM

**(M1) Naive evaluation runs in parallel but serves no purpose in the pipeline — orchestrator.ts:82-88**

`evaluateNaive()` runs alongside the 4 dimension judges. Its output is sent as an SSE event (`naive_complete`) but is never stored in the `ProposalEvaluation` object, never pinned to IPFS, and never published on-chain. The `proposalEvaluationSchema` has no field for it. It exists only for UI comparison display.

This is fine architecturally (comparison feature), but the naive output is discarded after the SSE stream closes. If it should be persisted for audit/comparison purposes, it needs to be added to the evaluation schema or stored separately.

**(M2) `maxOutputTokens: 1500` may be tight — constants.ts:32**

The structured output must fit within 1500 tokens, including the score, justification, recommendation, and up to 3 key findings. For a thorough justification, 1500 tokens (~1100 words) should generally suffice, but if the model is verbose, the response may be truncated. Since `generateObject` uses structured output mode, truncation would cause a Zod validation failure (the JSON would be incomplete), which would fail the dimension.

**(M3) Schema allows `.min(1).max(4)` dimensions but pipeline always expects exactly 4 — schemas.ts:43**

The `proposalEvaluationSchema` allows 1-4 dimensions in the `dimensions` array, which correctly handles partial failures. However, there's no indication to the consumer whether a dimension was skipped due to failure or intentionally omitted. The `failedDimensions` information exists in the SSE stream but is not persisted in the final `ProposalEvaluation` object.

**(M4) Proposal text passed directly as the user prompt — agents.ts:20**

The proposal text is passed as the entire `prompt` field to `generateObject`. There's no framing like "Here is the proposal to evaluate:" — the system prompt ends with "Evaluate the following proposal:" and the user message is the raw proposal text. This works but makes the boundary between instruction and data fuzzy. The anti-injection preamble helps, but a clearer delimiter (e.g., wrapping the proposal in XML tags like `<proposal>...</proposal>`) would strengthen the boundary.

**(M5) `as const` assertion on ABI arrays — contracts.ts:42, 98**

The ABI arrays use `as const` which is a type assertion. The CLAUDE.md forbids `as Type` but `as const` is a different construct (const assertion for literal types, not a type cast). This is standard viem practice and is correct, but worth noting the distinction for code review purposes. **Not a violation.**

### LOW

**(L1) `getScoreBand` falls through to "Insufficient" for out-of-range scores — constants.ts:36-41**

If `score` is negative or > 100, `getScoreBand` returns "Insufficient" as a fallback. The Zod schema constrains scores to 0-100 at the boundary, so this shouldn't happen, but the function itself doesn't validate its input.

**(L2) Heartbeat interval (15s) vs. timeout (90s) — route.ts:18-19**

With a 90-second timeout and 4 parallel LLM calls, the timing is tight. Each `generateObject` call to GPT-4o can take 10-30 seconds. If all 4 run in parallel, the typical case is 10-30s total. But if there are retries or slow responses, 90s could be exceeded. The heartbeat at 15s intervals is reasonable for keeping the SSE connection alive.

**(L3) `DEPLOYER_PRIVATE_KEY` used for all on-chain writes — client.ts:20-28, storage.ts:85**

The server wallet (deployer) signs all evaluation score publications. This means all evaluations appear to come from the same address on-chain, making it impossible to distinguish different evaluator agents by address. For v1 this is acceptable, but for the multi-evaluator vision, each judge agent should have its own signing key.

**(L4) Client hook doesn't handle stream errors gracefully — use-evaluation.ts:151-227**

If the SSE stream disconnects mid-evaluation (network error), the `reader.read()` loop will throw. The `startEvaluation` callback doesn't have a try/catch around the streaming loop, so the error propagates to the caller. The status will remain "evaluating" indefinitely since the `finally` block is missing.

**Correction:** Looking again, there's no try/catch at all around the fetch+stream logic in `startEvaluation`. If `fetch` throws (network error) or `reader.read()` throws (stream disconnect), the promise rejects but the status is never set to "failed". This is a genuine bug.

---

## 4. Test Coverage Assessment

**Existing tests (4 files):**

| File | Coverage |
|------|----------|
| `agents.test.ts` | Schema validation, constants integrity, prompt content, NAIVE_PROMPT shape. **No actual LLM call tests** (expected — these are unit tests). |
| `orchestrator.test.ts` | `computeAggregateScore` with all-4, 3-of-4, single, empty, all-zero, all-100 cases. **Good coverage of the aggregation logic.** |
| `score-radar-chart.test.tsx` | UI component tests (not reviewed). |
| `score-summary-card.test.tsx` | UI component tests (not reviewed). |

**Missing test coverage:**
- `orchestrateEvaluation` — no integration test for the full flow with mocked agents
- `storage.ts` — no tests for IPFS pinning or on-chain publication
- `route.ts` — no API route tests
- `use-evaluation.ts` — no hook tests
- Error/partial-failure paths in orchestrator (e.g., 2 of 4 dimensions fail)
- SSE event ordering and completeness

---

## 5. Security Assessment

**Strengths:**
- Anti-injection preamble in all judge prompts (prompts.ts:4-8)
- Zod validation at every boundary (request body, LLM output, Pinata response, env vars, addresses)
- Proposal text size limited to 50,000 chars (route.ts:7) and 50KB (submit/route.ts:16)
- No `any` or `as Type` (except `as const` for literal types)
- Private key handling validates hex format before use

**Concerns:**
- Anti-injection relies on prompt instructions only — no structural separation (e.g., tool use, XML tags) between instructions and user data
- The deployer private key is loaded on every `getWalletClient()` call from env vars. Standard practice, but key rotation is not possible without redeployment
- No rate limiting beyond the in-memory `activeEvaluations` set (bypassable in serverless)

---

## 6. Summary

| Category | Count |
|----------|-------|
| Critical | 0 (C1 downgraded to Low) |
| High | 4 |
| Medium | 5 |
| Low | 4 |

**Overall assessment:** The evaluation pipeline is well-structured with good separation of concerns, proper Zod validation at boundaries, and a clean SSE streaming architecture. The scoring logic is mathematically correct with proper re-normalization for partial failures. The main risks are: (1) storage failures can lose computed evaluations (H3), (2) no LLM retry logic (H2), (3) on-chain score precision loss (H1), and (4) the client hook missing error handling for stream disconnects (L4, arguably High).

**Top 3 recommendations:**
1. Wrap storage calls in try/catch so evaluation results survive IPFS/chain failures
2. Add retry logic (1-2 attempts) for transient LLM errors
3. Add try/catch around the SSE streaming loop in `useEvaluation` to handle network failures gracefully
