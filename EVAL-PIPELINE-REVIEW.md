# Speckit Evaluation Pipeline — Deep Code Review

**Auditor:** Claude Opus 4.6 (agent-reviewer team)
**Date:** 2026-04-13
**Scope:** Scoring logic, aggregation, storage integrity, concurrency, edge cases, reputation multiplier math, dispute override logic

---

## 1. Architecture Overview

The pipeline follows a clean linear flow:

```
RawProposal → sanitize → pin proposal to IPFS → run 4 dimension agents (parallel)
→ compute weighted score → apply reputation multiplier → detect anomalies
→ pin evaluation to IPFS → encode chain tx → return result
```

**Orchestrator:** `src/evaluation/orchestrate.ts` coordinates the full pipeline with job tracking (create → in_progress → complete/failed). Idempotency is enforced via `findExistingEvaluationJob` and `getProposalById` checks.

---

## 2. Scoring Logic

### 2.1 Dimension Weights (schemas.ts:12-17)

| Dimension | Weight |
|-----------|--------|
| technical_feasibility | 0.25 |
| impact_potential | 0.30 |
| cost_efficiency | 0.20 |
| team_capability | 0.25 |

Weights sum to **1.0** — correct.

### 2.2 Weighted Score Computation (scoring.ts:17-40)

```
finalScore = sum(score_i * weight_i)  // rounded to 2 decimal places
adjustedScore = finalScore * reputationMultiplier  // rounded to 2 decimal places
```

**Finding [LOW]:** The `score.dimension as ScoringDimension` cast on line 24 is a type assertion (`as Type`). The CLAUDE.md coding standards explicitly prohibit `as Type`. While the Zod schema constrains the dimension to valid enum values at the boundary, this cast should use a type guard or the Zod enum's `.parse()` instead.

### 2.3 Score Range Analysis

- Individual dimension scores: 0-10 (enforced by Zod schema)
- finalScore: 0-10 (since weights sum to 1.0)
- reputationMultiplier: 1.0-1.05
- adjustedScore: 0-10.5
- Chain score (basis points): 0-1050 (via `score * 100`)

The IPFS EvaluationContentSchema correctly validates `adjustedScore` max as 10.5 and the chain uses `uint16` which can hold values up to 65535 — both accommodate the multiplied range.

---

## 3. Reputation Multiplier Math

### 3.1 On-Chain Lookup (reputation/multiplier.ts)

```typescript
lookupReputationIndex(agentId):
  summary = getReputationSummary(agentId)  // on-chain call
  if activeFeedback === 0: return 0
  return Math.floor(averageValueBps / BASIS_POINTS)  // BASIS_POINTS = 10_000
```

**Finding [HIGH] — Reputation index is almost always 0 or 1.** The `averageValueBps` from the ReputationRegistry is already in basis points (0-10000). Dividing by 10,000 and flooring means:
- averageValueBps = 9999 → reputationIndex = 0
- averageValueBps = 10000 → reputationIndex = 1
- averageValueBps = 19999 → reputationIndex = 1

This makes the reputation multiplier effectively binary: either 1.0 (index=0) or 1.0001 (index=1). The intended behavior was likely to use `averageValueBps` directly as the index (or scale it differently) to produce a meaningful range between 1.0 and 1.05.

### 3.2 Multiplier Computation (scoring.ts:42-47)

```typescript
computeReputationMultiplier(reputationIndex):
  raw = 1.0 + reputationIndex / 10_000
  return Math.min(raw, 1.05)
```

The formula is correct in isolation — a `reputationIndex` of 500 would yield 1.05 (capped). But combined with the lookup bug above, the multiplier is effectively dead code — it will never produce a value meaningfully above 1.0.

### 3.3 Duplicate Definition

`computeReputationMultiplier` exists in **two files**:
- `src/evaluation/scoring.ts:42-47`
- `src/reputation/multiplier.ts:26-31` (as `computeReputationMultiplierFromIndex`)

Both have identical logic. The orchestrator uses the one in `scoring.ts` (via `computeWeightedScore`), and the one in `multiplier.ts` is available but unused in the main pipeline. This is a maintenance hazard — changes to one won't propagate to the other.

### 3.4 Chain Encoding of Reputation Multiplier

In `evaluation-registry.ts:76-78`:
```typescript
scaleReputationToChain(multiplier):
  return Math.round(multiplier * 10_000)
```

For multiplier = 1.0 → chain value = 10000. For multiplier = 1.05 → chain value = 10500. The contract stores this as `uint16` (max 65535) — fits fine.

**Finding [MEDIUM] — Mismatch between `prepareSubmitScore` and orchestrator.** In `orchestrate.ts:148-156`, `prepareSubmitScore` receives `finalScore` (the pre-multiplier score), but on-chain the contract also computes/stores `adjustedScore`. Meanwhile, `scaleScoreToChain(adjustedScore)` is computed on line 158 but only used for `prepareReleaseMilestone`, not for the chain submission. This means the on-chain `submitScore` gets the **un-adjusted** finalScore while the milestone release gets the **adjusted** score — an intentional separation or a bug depending on whether the contract applies the multiplier itself.

---

## 4. Concurrency and Race Conditions

### 4.1 Module-Level Counter (agents/runner.ts:8)

```typescript
let activeEvaluationCount = 0;
```

**Finding [MEDIUM] — Not safe in serverless/multi-instance environments.** This counter is module-level state. In Vercel serverless, each function invocation may run in a separate isolate, making this counter meaningless for global concurrency limiting. Two simultaneous requests to different isolates would both see `activeEvaluationCount === 0`. This is only effective within a single long-lived process (e.g., `bun run dev`).

### 4.2 Promise.all Without Partial Failure Handling (runner.ts:83-87)

All 4 dimension evaluations run via `Promise.all`. If one dimension times out or fails, the entire evaluation fails. There is no partial result recovery — a single dimension failure discards all other completed dimension scores. For a 90-second timeout on GPT-4o calls, this is a real risk.

**Finding [MEDIUM]:** Consider `Promise.allSettled` with a minimum threshold (e.g., 3 of 4 dimensions required) or retry logic for individual dimensions.

### 4.3 TOCTOU Race in Duplicate Check (orchestrate.ts:71-74)

```typescript
const existingJob = await findExistingEvaluationJob(proposalId);
if (existingJob && existingJob.status === "complete") {
  throw new DuplicateEvaluationError(proposalId);
}
```

Between the check and the `createEvaluationJob` call on line 77, another concurrent request could create a job for the same proposal. There is a second check at line 143-145 (`getProposalById`), but both are non-atomic. In a database with unique constraints this would be caught; in SQLite with Drizzle the behavior depends on the schema.

### 4.4 Timeout Handling (runner.ts:34-35)

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
```

Uses `AbortController` with `clearTimeout` in `finally` — correctly implemented. The 90-second timeout is reasonable for GPT-4o structured output calls.

---

## 5. Anomaly Detection (anomaly.ts)

### 5.1 Threshold Analysis

| Flag | Condition | Effective Score Range |
|------|-----------|----------------------|
| ALL_SCORES_SUSPICIOUSLY_HIGH | All scores >= 9.5 (scaled: 95/100) | Very narrow — only scores 9.5-10.0 |
| ALL_SCORES_SUSPICIOUSLY_LOW | All scores <= 0.5 (scaled: 5/100) | Very narrow — only scores 0-0.5 |
| EXTREME_SCORE_DIVERGENCE | max - min > 5.0 (scaled: 50/100) | Reasonable gap detection |

**Finding [LOW]:** Anomaly detection runs on the raw dimension scores (0-10 scale, multiplied by 10 to get 0-100), not on the weighted/adjusted scores. This is correct behavior — you want to flag when individual judges diverge, not when the weighted aggregate looks unusual.

### 5.2 Detection is Informational Only

Anomaly flags are returned in the `OrchestrationResult` but do **not** block the evaluation from completing or being submitted on-chain. The flags are not stored in the IPFS evaluation content either. They exist only in the API response.

**Finding [LOW]:** If anomaly flags are meant to trigger human review, they should be persisted (either in the IPFS evaluation content or the cache DB) so they aren't lost after the API call returns.

---

## 6. Sanitization and PII Protection (sanitization.ts)

### 6.1 Redaction Coverage

Redacts: emails, URLs, phone numbers, CPF numbers (Brazilian tax ID). Does not redact: names, street addresses, social security numbers (non-Brazilian), wallet addresses.

**Finding [LOW]:** The `containsResidualPii` function (line 65) checks for IPs (`IP_ADDRESS_PATTERN`) but `sanitizeText` (line 56) does not redact IPs. So if a proposal contains an IP address, `assertNoPii` will throw `PiiDetectedError` even though no sanitization was attempted for IPs. This is either a deliberate fail-safe (reject proposals with IPs) or an inconsistency.

### 6.2 Regex Statefulness Bug

**Finding [HIGH] — Regex with `g` flag retains `lastIndex` state.** The patterns `EMAIL_PATTERN`, `PHONE_PATTERN`, `CPF_PATTERN`, and `IP_ADDRESS_PATTERN` use the `g` (global) flag and are declared at module scope. In JavaScript, calling `.test()` on a global regex advances its `lastIndex`. The `containsResidualPii` function calls `.test()` on these patterns — if called multiple times, the regex may alternate between matching and not matching the same input.

Example: `EMAIL_PATTERN.test("a@b.com")` returns `true` the first time, but calling `EMAIL_PATTERN.test("a@b.com")` again immediately returns `false` because `lastIndex` moved past the match.

This means `containsResidualPii` can **miss PII on every other invocation**. The `sanitizeText` function uses `.replace()` which always resets `lastIndex`, so redaction itself is not affected — but the post-sanitization check (`assertNoPii`) is unreliable.

**Fix:** Either reset `lastIndex = 0` before each `.test()` call, or use non-global patterns for `.test()`, or use `string.match(pattern) !== null` instead.

### 6.3 Team Profile Hashing

Team members are hashed via SHA-256 with role+experience, sorted and joined. The hash is truncated to 16 hex characters (64 bits). This is sufficient for de-identification but is not collision-resistant at 64 bits — for a system evaluating millions of proposals, birthday collisions become likely around 2^32 (~4 billion) entries. Acceptable for current scale.

---

## 7. Dispute Override Logic (dispute-override.ts)

### 7.1 Score Override

```typescript
applyDisputeScoreOverride(params):
  oldScore = proposal.finalScore
  newScore = params.newChainScore / 100  // SCORE_PRECISION = 100
  update proposal: finalScore = newScore, adjustedScore = newScore, status = "disputed_overturned"
  update dispute: status = "overturned", newScore, resolvedAt
```

**Finding [MEDIUM] — Dispute override bypasses reputation multiplier.** When a dispute overturns a score, `adjustedScore` is set equal to `newScore` (line 39). The original pipeline computes `adjustedScore = finalScore * reputationMultiplier`. After a dispute, the reputation multiplier is ignored. This may be intentional (dispute resolution is authoritative) but it is undocumented and means the on-chain `reputationMultiplier` field becomes stale/misleading for disputed proposals.

### 7.2 Non-Transactional Updates

The dispute override performs two separate database updates (proposal + dispute) without a transaction. If the second update fails, the proposal score is updated but the dispute record is not marked as resolved — creating an inconsistent state.

**Finding [MEDIUM]:** Wrap both updates in a database transaction.

### 7.3 Missing Proposal Handling

If `proposal` is null (line 34), the code skips the proposal update but still updates the dispute to "overturned" and returns `oldScore: null`. This means a dispute can be resolved for a non-existent proposal without error. Should this throw?

---

## 8. IPFS Pinning (ipfs/pin.ts)

### 8.1 Canonical JSON

```typescript
const canonicalJson = JSON.stringify(
  validated,
  Object.keys(validated as Record<string, unknown>).sort()
);
```

**Finding [MEDIUM] — `as Record<string, unknown>` violates coding standards.** This is a type assertion. Beyond the style violation, `JSON.stringify` with a replacer array only includes keys in that array. `Object.keys()` only returns own enumerable string keys at the top level — nested object keys are not sorted. This means the "canonical" form is only canonical at the top level; nested objects retain insertion order. For content-addressed storage (IPFS), two logically identical objects with different nested key order would produce different CIDs.

### 8.2 Double Parse

```typescript
const result = await pinata.upload.json(JSON.parse(canonicalJson));
```

The data is stringified then parsed back — this works but is wasteful. Could pass the sorted object directly if the Pinata SDK serializes deterministically, though the current approach does guarantee top-level key ordering.

---

## 9. Chain Integration (evaluation-registry.ts)

### 9.1 Score Scaling

- `scaleScoreToChain(score)`: `Math.round(score * 100)` — score 7.85 becomes 785
- `scaleReputationToChain(multiplier)`: `Math.round(multiplier * 10000)` — multiplier 1.03 becomes 10300

Both fit within `uint16` (max 65535).

### 9.2 Proposal ID Determinism

```typescript
computeProposalId(platformSource, externalId):
  return keccak256(toHex(`${platformSource}:${externalId}`))
```

Deterministic and collision-resistant. Same platform+externalId always produces the same proposalId. The colon separator prevents ambiguity (e.g., "github:123" vs "github1:23").

**Finding [LOW]:** If `platformSource` or `externalId` could contain colons, the separator is ambiguous. E.g., `computeProposalId("a:b", "c")` equals `computeProposalId("a", "b:c")` since both produce `keccak256("a:b:c")`. In practice, platform sources are controlled values, so this is unlikely.

---

## 10. Rate Limiting (lib/rate-limit.ts)

### 10.1 Graceful Degradation

```typescript
if (!process.env.UPSTASH_REDIS_REST_URL) {
  return { success: true, retryAfter: 0 };
}
```

If Upstash is not configured, rate limiting is silently bypassed. This is correct for local dev but **dangerous for production** — a missing env var disables all rate limiting.

**Finding [MEDIUM]:** In production, the absence of `UPSTASH_REDIS_REST_URL` should either throw or log a warning, not silently permit all requests.

---

## 11. API Key Validation (lib/api-key.ts)

### 11.1 HMAC Webhook Verification

The `verifyWebhookSignature` function implements constant-time comparison manually via XOR on hex-encoded characters. This is correct and prevents timing attacks.

### 11.2 API Key Hashing

Uses `crypto.subtle.digest("SHA-256", ...)` — a single round of SHA-256 without salt. This is acceptable for API keys (which are high-entropy random strings) but would be insufficient for passwords.

---

## 12. Judge Prompts (agents/prompts.ts)

### 12.1 Anti-Injection Instructions

The shared preamble includes explicit anti-injection instructions telling the model to treat proposal text as data, not instructions. This is good practice. However, the proposal data is passed as a JSON string directly in the user prompt (runner.ts:45):

```typescript
prompt: `... ${JSON.stringify(proposal, null, 2)} ...`
```

**Finding [LOW]:** The JSON serialization provides some protection (special characters are escaped), but a determined attacker could craft proposal text containing JSON that closes the template and injects new instructions. The system prompt anti-injection instructions are the primary defense — this is a defense-in-depth concern, not a critical vulnerability.

### 12.2 Prompt-Score Consistency

Each prompt includes a scoring reference (0-2, 3-4, 5-6, 7-8, 9-10) but the Zod schema allows continuous scores 0-10. The model is free to return scores like 6.7 — which is fine, but the rubric only describes integer ranges. This could lead to inconsistent scoring granularity across evaluations.

### 12.3 Team Capability Limitation

The team_capability prompt says "Team data is anonymized (hashed profiles)" and asks the model to "evaluate based on described roles and experience levels." But after sanitization, the model only receives `teamSize` (number) and `teamProfileHash` (hex string). The actual role descriptions and experience text are **not passed through** — they're hashed away. The model has almost no data to score team capability meaningfully.

**Finding [HIGH]:** The sanitization step hashes team members into a single opaque string, then the prompt asks the model to evaluate team experience, track record, and composition. The model cannot do this with only a team count and a hash. Either the team role/experience descriptions should be passed through (redacted of PII), or the prompt should acknowledge the limited data available.

---

## 13. Summary of Findings

### Critical / High Severity

| # | Location | Finding |
|---|----------|---------|
| H1 | `reputation/multiplier.ts:19` | Reputation index division truncates to 0-1, making multiplier effectively dead |
| H2 | `sanitization.ts:4-9` | Global regex `g` flag causes `containsResidualPii` to miss PII on alternating calls |
| H3 | `agents/prompts.ts:142-163` + `sanitization.ts` | Team capability judge receives only teamSize and hash — cannot evaluate team skills |

### Medium Severity

| # | Location | Finding |
|---|----------|---------|
| M1 | `orchestrate.ts:148-158` | finalScore (un-adjusted) goes to chain submission; adjustedScore goes to milestone — may be intentional but undocumented |
| M2 | `agents/runner.ts:8` | Module-level concurrency counter is per-isolate, ineffective in serverless |
| M3 | `agents/runner.ts:83-87` | Promise.all fails entirely if one dimension times out — no partial recovery |
| M4 | `dispute-override.ts:38-39` | Dispute override sets adjustedScore = newScore, bypassing reputation multiplier |
| M5 | `dispute-override.ts:34-52` | Two DB updates without transaction — inconsistent state on partial failure |
| M6 | `ipfs/pin.ts:10` | `as Record<string, unknown>` type assertion violates coding standards; canonical JSON only at top level |
| M7 | `lib/rate-limit.ts:35-36` | Missing Upstash env var silently disables rate limiting in production |

### Low Severity

| # | Location | Finding |
|---|----------|---------|
| L1 | `scoring.ts:24` | `as ScoringDimension` type assertion violates coding standards |
| L2 | `anomaly.ts` | Anomaly flags are not persisted — lost after API response |
| L3 | `sanitization.ts:56-63` vs `65-72` | `sanitizeText` doesn't redact IPs, but `containsResidualPii` checks for IPs — mismatch |
| L4 | `evaluation-registry.ts:68-69` | Colon separator in proposalId could be ambiguous if platform names contain colons |
| L5 | `agents/prompts.ts` | Scoring rubric describes integer ranges but schema allows continuous floats |

---

## 14. Positive Observations

- **Clean separation of concerns**: sanitization, scoring, anomaly detection, chain encoding are all independent modules
- **Zod validation at boundaries**: IPFS schemas validate data before pinning and after fetching
- **Anti-injection in prompts**: Explicit instructions to treat proposal text as data
- **Constant-time HMAC comparison**: Proper timing-attack prevention in webhook verification
- **Idempotency checks**: Both job-level and proposal-level duplicate detection
- **Abort controller for timeouts**: Correct pattern with cleanup in finally block
- **Type-safe chain encoding**: viem's `encodeFunctionData` with typed ABIs
- **Content-addressed storage**: IPFS CIDs provide tamper-evident audit trail
