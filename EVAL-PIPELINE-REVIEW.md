# Superpower Worktree — Evaluation Pipeline Code Review

**Reviewer:** Claude Opus 4.6 (automated audit)
**Date:** 2026-04-13
**Scope:** Scoring logic, aggregation, storage integrity, concurrency, edge cases, Mastra Agent structured output flow, API-level parallelism pattern

---

## 1. Architecture Overview

The Superpower worktree implements a **client-orchestrated, API-level parallelism** pattern for judge evaluation. Unlike the other worktrees that use server-side `Promise.all()`, here the frontend triggers 4 separate HTTP requests — one per dimension — and each API route independently instantiates a Mastra Agent, runs inference, uploads to IPFS, and persists to the DB. A separate `/finalize` endpoint aggregates results and publishes on-chain.

**Flow:**
1. `POST /api/evaluate/[id]` — validates proposal, sets status to `evaluating`, returns 4 dimension URLs
2. Client fires 4x `GET /api/evaluate/[id]/[dimension]` in parallel
3. Each dimension route: creates Mastra Agent -> structured output -> IPFS upload -> DB persist
4. `POST /api/evaluate/[id]/finalize` — checks all 4 complete, runs anomaly detection, computes aggregate, uploads aggregate to IPFS, publishes 6 on-chain transactions
5. `GET /api/evaluate/[id]/status` — polls current state

### Key Design Choices
- **Mastra Agent with Claude Sonnet 4** (not GPT-4o) via `@ai-sdk/anthropic`
- **Basis points (0-10000)** for scores, with `scoreDecimals: 2` literal
- **Per-dimension IPFS uploads** with prompt transparency metadata
- **Sequential on-chain transactions** (register -> 4x feedback -> aggregate)
- **SQLite via Turso/libsql** with Drizzle ORM

---

## 2. Scoring Logic

### 2.1 Schema Validation (`src/lib/judges/schemas.ts`)

**Strengths:**
- Clean Zod schema with proper `min(0).max(10000)` bounds on score
- `scoreDecimals: z.literal(2)` enforces consistent decimal representation
- IPE alignment scores bounded `0-100`
- `keyFindings` and `risks` arrays capped at 3 entries (prevents LLM verbosity)
- `justification` capped at 2000 chars

**Issue S-01 (Low): `scoreDecimals` as literal is redundant.** The `scoreDecimals: z.literal(2)` field forces the LLM to output `2` every time. This is metadata about the schema, not about the evaluation. If the LLM outputs `1` or `3`, the entire structured output fails validation and triggers a retry. This wastes a retry attempt on a field the LLM has no agency over. Consider removing it from the LLM schema and injecting it server-side after validation.

### 2.2 Judge Prompts (`src/lib/judges/prompts.ts`)

**Strengths:**
- Excellent anti-injection instructions (F-010) — explicitly tells judges to treat proposal text as DATA, not INSTRUCTIONS
- Anti-rationalization red flags section is a strong calibration technique
- Score calibration anchors with concrete ranges (8000-10000 = Exceptional, etc.)
- Each dimension prompt includes IPE City lens for value alignment
- Independent evaluation enforced ("MUST NOT reference other judges' evaluations")

**Issue S-02 (Medium): No anti-injection in `buildProposalContext`.** The proposal fields (title, description, problemStatement, etc.) are interpolated directly into the prompt string. While the system prompt warns against following instructions in proposal text, a more robust defense would be to wrap the proposal content in clear delimiters (e.g., `<proposal>...</proposal>`) to make the boundary between instructions and data visually unambiguous to the model.

**Issue S-03 (Low): `budgetAmount.toLocaleString()` is locale-dependent.** On a server with a non-US locale, this could produce `1.000` instead of `1,000`, potentially confusing the LLM's cost evaluation. Use a fixed formatter or `Intl.NumberFormat('en-US')`.

### 2.3 Weights & Aggregation (`src/lib/judges/weights.ts`)

**Strengths:**
- Weights sum to exactly 1.0 (0.25 + 0.30 + 0.20 + 0.25)
- `Math.round()` prevents floating-point drift in the aggregate
- Throws on missing dimension score (fail-fast)

**Issue S-04 (Low): Duplicate weight definitions.** `DIMENSION_WEIGHTS` is defined in both `src/lib/constants.ts:4-8` and `src/lib/judges/weights.ts:3-8`. If someone updates one and not the other, aggregation would silently use wrong weights. The `computeAggregateScore` function imports from `weights.ts`, but constants are exported from both files. A single source of truth should be established.

---

## 3. Aggregation & Orchestration (`src/lib/evaluation/orchestrator.ts`)

### 3.1 Idempotency

**Strength:** The idempotency check at line 33-38 is correct — queries for existing aggregate before computing. This prevents duplicate on-chain publishes if finalize is called twice.

### 3.2 Anomaly Detection

**Strengths:**
- Three anomaly classes: ALL_SCORES_SUSPICIOUSLY_HIGH (>=9500), ALL_SCORES_SUSPICIOUSLY_LOW (<=500), EXTREME_SCORE_DIVERGENCE (>5000)
- Anomalies are logged but do not block finalization — good for auditing without blocking legitimate edge cases
- Thresholds are extracted into named constants

**Issue S-05 (Medium): Anomaly detection proceeds even with missing scores.** At line 41-46, the orchestrator builds a `scores` record from `completeEvals`, but only includes evaluations where `score !== null`. If an evaluation has `status: "complete"` but `score: null` (a defensive impossibility but not schema-enforced at the DB level since `score` is nullable), the anomaly detection would run on fewer than 4 scores. Worse, `computeAggregateScore` would throw because the dimension key would be missing. The `scores` object is cast with `as Record<JudgeDimension, number>` at line 65-67 — this `as` cast violates the project's TypeScript rules and masks the potential for undefined values.

**Issue S-06 (Medium): Race condition window in finalize.** Between the idempotency check (line 33) and the aggregate insert (line 85), there is no database-level lock. If two concurrent finalize calls pass the idempotency check simultaneously, both will compute, upload to IPFS, and attempt to insert. The second insert would either create a duplicate or fail depending on DB constraints. The `aggregateScores` table has no unique constraint on `proposalId` — only a primary key on `id`. This means duplicates can be inserted silently.

### 3.3 On-Chain Publishing

**Issue S-07 (Medium): IPFS aggregate uploaded before chain publish, but chain failure leaves orphaned IPFS data.** If on-chain publishing fails (line 100-143), the aggregate IPFS CID is already uploaded and the aggregate score is already in the DB, but the proposal status is set to `"failed"`. The aggregate score record persists in the DB with an IPFS CID that has no corresponding chain record. A subsequent retry via the finalize endpoint would hit the idempotency check and return the stale aggregate score without retrying the chain publish.

**Issue S-08 (Low): `proposal?.ipfsCid ?? ""` at line 107.** If the proposal has no IPFS CID, an empty string is passed to `publishEvaluationOnChainDetailed` as `proposalIpfsCid`. This would register an identity with an empty URI on-chain — a valid but meaningless transaction that wastes gas.

---

## 4. On-Chain Publishing (`src/lib/evaluation/publish-chain.ts`)

### 4.1 Transaction Flow

The chain publish executes 6 sequential transactions:
1. `register()` on IdentityRegistry — mints an ERC-8004 identity for the proposal
2. 4x `giveFeedback()` on ReputationRegistry — one per dimension
3. 1x `giveFeedback()` for aggregate milestone marker

**Strengths:**
- Zero-address guard checks before any transactions
- Receipt status checked for every transaction (reverted = throw)
- 60-second timeout per transaction receipt
- Content hashes computed with `keccak256` for on-chain integrity verification

**Issue S-09 (Medium): Sequential feedback transactions are slow and not atomic.** The 4 feedback transactions are sent sequentially (line 85-109), then receipts are awaited sequentially (line 113-121). If transaction 3 of 4 reverts, the first 2 are already confirmed on-chain with no rollback. The proposal would be in a partially-published state. Consider: (a) sending all 4 `writeContract` calls in parallel (they are independent), then awaiting all receipts; (b) documenting the partial-publish risk.

**Issue S-10 (Low): `as \`0x\${string}\`` cast in receipt wait.** At line 115, the hash is cast to `0x${string}`. The `writeContract` return type should already be `0x${string}`, making this cast unnecessary. However, this is stored in a `Record<string, string>` (line 83) which loses the hex prefix type. This is a minor type-safety gap.

**Issue S-11 (Medium): `agentId` extraction assumes log structure.** At line 79-80, `agentId` is extracted from `registerReceipt.logs[0]?.topics[1]`. This assumes the `Registered` event is the first log in the receipt and that `agentId` is the first indexed parameter (topic[1]). If the contract emits other events (e.g., ERC-721 Transfer) before Registered, or if the contract is upgraded, this would silently extract the wrong value. Use `decodeEventLog` from viem for type-safe event parsing.

### 4.2 Chain Configuration (`src/lib/chain/config.ts`)

**Issue S-12 (Medium): Hardcoded to `baseSepolia`.** The chain config imports `baseSepolia` and uses it unconditionally. The CLAUDE.md documents switching between testnet (84532) and mainnet (8453) via `NEXT_PUBLIC_CHAIN_ID`, but the code ignores this env var entirely. Deploying to mainnet with this code would still send transactions to Base Sepolia.

**Issue S-13 (Low): `as \`0x\${string}\`` on private key.** At line 17, `privateKey as \`0x\${string}\`` is a type cast that violates the project's no-`as` rule. Should validate the hex prefix at runtime.

---

## 5. API-Level Parallelism Pattern

### 5.1 Dimension Route (`src/app/api/evaluate/[id]/[dimension]/route.ts`)

**Strengths:**
- Rate limiting per IP (10/hour via Upstash) + global rate limit (10/minute)
- Idempotency: returns existing complete evaluation without re-running
- Conflict detection: returns 409 if evaluation is already streaming
- Mastra Agent instantiated fresh per request (no shared state contamination)
- Exponential backoff retry (3 attempts, 2s * 2^attempt)
- 90-second AbortController timeout per attempt
- Full prompt transparency metadata stored in IPFS payload
- Model and prompt version tracked in DB

**Issue S-14 (High): GET method for a mutating operation.** The dimension evaluation route uses `GET` (line 62) but creates database records, calls an LLM, uploads to IPFS, and mutates evaluation state. This violates HTTP semantics — GET must be safe and idempotent. Caches, CDNs, and browser prefetch can trigger GET requests unexpectedly. This should be POST. The current "idempotency" check (returning existing complete eval) mitigates re-execution, but a browser prefetching the URL or a CDN caching a 200 response would cause problems.

**Issue S-15 (Medium): Stuck "streaming" evaluations.** If the server crashes or the request times out after the evaluation record is inserted (line 99-107) but before completion, the evaluation will be stuck in `"streaming"` status forever. Subsequent requests return 409 ("already in progress"). There is no TTL or cleanup mechanism. The retry endpoint (`/retry`) only handles `"failed"` status, not `"streaming"`.

**Issue S-16 (Low): `clearTimeout` not called on abort path.** In `runJudgeWithRetry` (line 49), `clearTimeout(timeout)` is called in the catch block, which is correct. However, if `controller.abort()` fires, the AbortError propagates to the catch block where the timeout is cleared — this is fine. But the `AbortController` signal is not checked between retries, so a timed-out attempt will still retry. This is acceptable behavior but worth documenting.

### 5.2 Trigger Route (`src/app/api/evaluate/[id]/route.ts`)

**Strengths:**
- Origin check against `NEXT_PUBLIC_APP_URL` (CSRF-like protection)
- Status guard: only `pending` proposals can be evaluated
- Returns all 4 dimension URLs for client to call

**Issue S-17 (Medium): Origin check is bypassable.** The `Origin` header check (line 27-30) is not a security boundary — the `Origin` header can be set by any HTTP client. This provides no protection against API abuse beyond rate limiting. For server-side CSRF protection, consider a signed token or session-based approach.

**Issue S-18 (Low): No validation of `id` parameter.** The `id` is used directly in a database query. While Drizzle ORM parameterizes queries (preventing SQL injection), validating that `id` matches an expected format (UUID) would provide defense in depth.

### 5.3 Finalize Route (`src/app/api/evaluate/[id]/finalize/route.ts`)

**Issue S-19 (Medium): No authentication or authorization.** The finalize endpoint is a POST with no auth check. Anyone who knows a proposal ID can trigger finalization (and the on-chain publish that spends gas). The trigger route has origin checking and rate limiting; finalize has neither.

### 5.4 Status Route (`src/app/api/evaluate/[id]/status/route.ts`)

Clean implementation. No issues found.

---

## 6. IPFS Client (`src/lib/ipfs/client.ts`)

**Strengths:**
- 3-retry with exponential backoff
- Post-upload content verification (fetches back and compares JSON)
- Singleton Pinata client (no re-initialization per request)
- `fetchJson` validates against a Zod schema
- Separate `verifyContentIntegrity` function for external verification

**Issue S-20 (Medium): Verification silently returns true on failure.** At line 77-78 in `verifyUploadedContent`, if the gateway fetch fails (network error, timeout, 404), the function returns `true` — treating unverifiable content as verified. The comment explains this is to avoid blocking on gateway propagation delay, but this defeats the purpose of verification. A better approach: return a `{ verified: boolean; deferred: boolean }` result, or skip verification on the first attempt and verify asynchronously.

**Issue S-21 (Low): JSON comparison is order-dependent.** The verification uses `JSON.stringify(data, null, 0)` for comparison (line 71-72). If the IPFS gateway returns keys in a different order than the original (valid per JSON spec), verification would fail and trigger a retry. `JSON.stringify` with no replacer uses insertion order, which should match for round-tripped JSON, but this is a fragile assumption.

---

## 7. Database Schema (`src/lib/db/schema.ts`)

**Strengths:**
- Foreign key references from evaluations -> proposals and aggregateScores -> proposals
- Proper enum constraints on status, dimension, confidence, recommendation
- JSON columns for complex types (teamMembers, links, keyFindings, risks)
- Timestamps stored as integers (epoch)

**Issue S-22 (Medium): No unique constraint on (proposalId, dimension) in evaluations.** Without this constraint, the same proposal could have multiple evaluations for the same dimension. The application-level idempotency check in the dimension route (line 88-95) prevents this under normal conditions, but concurrent requests or the stuck-streaming recovery scenario (S-15) could create duplicates.

**Issue S-23 (Low): No unique constraint on proposalId in aggregateScores.** Related to S-06 — without this constraint, duplicate aggregates can be inserted.

**Issue S-24 (Low): `score` is nullable in evaluations table.** This allows `complete` evaluations with null scores, which would break the orchestrator's score aggregation. Adding a CHECK constraint or making score non-null (with a default of 0 for pending evaluations) would be safer.

---

## 8. Test Coverage

14 test files covering:
- Unit: weights, schemas, prompts, sanitization, security logging, IPFS client, rate limiting
- Integration: orchestrator, chain publishing
- API: evaluate trigger, finalize, status, retry

**Strengths:**
- Orchestrator tests cover: happy path, partial completion, idempotency, all 3 anomaly types, IPFS failure, chain failure, correct weighted computation, tx hash storage, status transitions
- Chain publish tests: happy path, correct call count (6 txs), zero-address guards, register revert, feedback revert
- Custom mock DB that parses Drizzle's internal `eq()` condition structure — sophisticated and correct

**Issue S-25 (Low): No test for concurrent finalize calls.** The race condition described in S-06 is not tested. A concurrent test would help validate the behavior.

**Issue S-26 (Low): No integration test for the full end-to-end flow.** The orchestrator test mocks IPFS and chain. The chain test mocks viem clients. There is no test that exercises the real composition. This is acceptable for unit tests but worth noting.

---

## 9. Security Assessment

### Positive Security Features
- **Anti-prompt-injection:** System prompts explicitly instruct judges to treat proposal text as data (F-010)
- **Rate limiting:** Per-IP (10/hr) and global (10/min) limits on evaluation triggers
- **Anomaly detection:** Flags suspiciously uniform or divergent scores
- **Input sanitization:** DOMPurify-based sanitization available for display text
- **Content integrity:** IPFS upload verification, on-chain content hashes via keccak256
- **Security event logging:** Structured JSON logging for rate limits, anomalies, PII detection, injection attempts

### Security Concerns
- **S-14 (reiterated):** GET for mutating operations is the highest-severity finding
- **S-19 (reiterated):** Unauthenticated finalize endpoint can drain gas
- **S-17 (reiterated):** Origin header check provides false sense of security
- **S-12 (reiterated):** Chain config ignores `NEXT_PUBLIC_CHAIN_ID`, locked to testnet

---

## 10. Comparison Notes: API-Level vs Promise.all Parallelism

The Superpower worktree's API-level parallelism (client fires 4 HTTP requests) vs the other worktrees' server-side `Promise.all` has these tradeoffs:

| Aspect | API-Level (Superpower) | Promise.all (GSD/Speckit) |
|--------|----------------------|--------------------------|
| Client complexity | Higher — must manage 4 requests | Lower — single request |
| Observability | Better — each dimension has its own HTTP status | Worse — all-or-nothing |
| Retry granularity | Per-dimension retry possible | All dimensions retry together |
| Failure isolation | One dimension failing doesn't block others | One failure can fail the batch |
| Resource usage | 4 concurrent API route invocations | Single server process |
| Timeout handling | Per-route timeouts (maxDuration=120s) | Single timeout for all |
| Rate limit surface | 4x the rate limit hits per evaluation | 1x rate limit hit |

The API-level approach is architecturally stronger for this use case — it provides better failure isolation and client-visible progress. However, it shifts orchestration complexity to the client and introduces the race conditions noted above.

---

## 11. Summary of Findings

| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| S-01 | Low | Schema | `scoreDecimals` literal wastes retry attempts |
| S-02 | Medium | Security | No delimiter wrapping for proposal content in prompts |
| S-03 | Low | Bug | `toLocaleString()` locale-dependent formatting |
| S-04 | Low | Maintenance | Duplicate weight definitions across files |
| S-05 | Medium | Type Safety | `as Record<JudgeDimension, number>` cast masks potential undefined |
| S-06 | Medium | Concurrency | Race condition in finalize — no DB lock or unique constraint |
| S-07 | Medium | Data Integrity | Failed chain publish leaves orphaned IPFS + DB aggregate |
| S-08 | Low | Data Integrity | Empty IPFS CID passed to chain registration |
| S-09 | Medium | Performance | Sequential chain transactions are slow and non-atomic |
| S-10 | Low | Type Safety | Unnecessary `as` cast on tx hash |
| S-11 | Medium | Reliability | Fragile event log parsing for agentId extraction |
| S-12 | Medium | Config | Chain config hardcoded to baseSepolia, ignores env var |
| S-13 | Low | Type Safety | `as` cast on private key |
| S-14 | **High** | HTTP Semantics | GET method used for mutating evaluation operation |
| S-15 | Medium | Reliability | Stuck "streaming" evaluations with no cleanup/TTL |
| S-16 | Low | Reliability | AbortController signal not checked between retries |
| S-17 | Medium | Security | Origin header check is not a security boundary |
| S-18 | Low | Validation | No format validation on proposal ID |
| S-19 | Medium | Security | Finalize endpoint has no auth or rate limiting |
| S-20 | Medium | Data Integrity | IPFS verification silently returns true on fetch failure |
| S-21 | Low | Data Integrity | JSON key order comparison is fragile |
| S-22 | Medium | Data Integrity | No unique constraint on (proposalId, dimension) |
| S-23 | Low | Data Integrity | No unique constraint on proposalId in aggregateScores |
| S-24 | Low | Schema | Nullable score column allows inconsistent state |
| S-25 | Low | Testing | No concurrent finalize test |
| S-26 | Low | Testing | No end-to-end integration test |

**High: 1 | Medium: 12 | Low: 13**

---

## 12. Top Recommendations (Priority Order)

1. **Change dimension evaluation route from GET to POST** (S-14) — highest impact, lowest effort
2. **Add unique constraints** on `(proposalId, dimension)` in evaluations and `proposalId` in aggregateScores (S-06, S-22, S-23)
3. **Add auth/rate-limiting to finalize endpoint** (S-19)
4. **Make chain config respect `NEXT_PUBLIC_CHAIN_ID`** (S-12)
5. **Add stuck-evaluation cleanup** — TTL on streaming status or a cron that resets stale entries (S-15)
6. **Wrap proposal content in XML delimiters** in `buildProposalContext` for stronger prompt injection defense (S-02)
7. **Use viem's `decodeEventLog`** instead of raw log parsing for agentId extraction (S-11)
8. **Fix the finalize idempotency gap** — either use a DB transaction with SELECT FOR UPDATE or add a unique constraint that prevents duplicate aggregates (S-06, S-07)
