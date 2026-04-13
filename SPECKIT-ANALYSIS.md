# SPECKIT-ANALYSIS: Cross-Artifact Consistency Report

**Worktree:** `.worktrees/speckit/`
**Date:** 2026-04-13
**Scope:** Evaluation feature -- planning artifacts vs. implementation consistency

---

## 1. Spec Coverage Summary

| Area | Specified In | Implemented In | Coverage |
|------|-------------|----------------|----------|
| 4 Judge Dimensions + Weights | spec.md FR-002, FR-004, scoring-schema.md | schemas.ts, scoring.ts, prompts.ts | FULL |
| Weighted Score Formula | spec.md FR-004, scoring-schema.md | scoring.ts | FULL |
| Reputation Multiplier | spec.md FR-005, data-model.md | scoring.ts, multiplier.ts | FULL |
| PII Sanitization | spec.md FR-006, scoring-schema.md | sanitization.ts | FULL |
| Anomaly Detection (3-layer) | spec.md edge cases | anomaly.ts, prompts.ts | PARTIAL |
| Dispute Resolution | spec.md US5, data-model.md | dispute-override.ts, dispute-registry.ts, webhooks | PARTIAL |
| Monitor Agent | spec.md US4, data-model.md | monitoring/*.ts | FULL |
| On-Chain Fund Release | spec.md US3, data-model.md | milestone-manager.ts, orchestrate.ts | PARTIAL |
| Agent Registration (ERC-8004) | data-model.md | registration.ts, identity-registry.ts | FULL |
| Reputation Feedback | data-model.md, spec.md US6 | feedback.ts, reputation-registry.ts | FULL |
| Cache Schema | data-model.md Layer 3 | schema.ts | FULL |
| Evaluation Retry (FR-016) | spec.md FR-016: retry 3 times | runner.ts -- NO retry logic | MISSING |
| Chain Tx Retry (FR-017) | spec.md FR-017: exponential backoff 5 attempts | NO implementation found | MISSING |
| Layer 3 Anti-Injection | spec.md edge cases, scoring-schema.md | NOT FOUND | MISSING |

---

## 2. Drift Report

### DRIFT-1 (INFO): Anomaly Detection Thresholds

Spec uses 0-100 scale thresholds (>=95, <=5, >50 range). Implementation scores are 0-10 from judges, scaled by x10. After scaling, thresholds align correctly. No actual drift.

### DRIFT-2 (HIGH): ReputationRegistry ABI Mismatch

Spec (data-model.md): `giveFeedback()` takes `int128 value, uint8 valueDecimals` and 8 parameters.
Implementation (reputation-registry.ts ABI): `giveFeedback()` takes `uint256 value`, omits `valueDecimals` and `endpoint`. Only 6 parameters.

### DRIFT-3 (HIGH): Dispute Status Mapping

Spec: `{0:open, 1:voting, 2:upheld, 3:overturned, 4:expired}`
Implementation (sync.ts:345-349): `{0:open, 1:upheld, 2:overturned}` -- missing `voting` and `expired`. Status 1 (`voting`) incorrectly maps to `upheld`.

### DRIFT-4 (MEDIUM): Dispute Webhook Missing Time Window Check

Spec requires disputes within an allowed time window. Implementation accepts disputes at any time without checking deadlines.

### DRIFT-5 (CRITICAL): Reputation Lookup Uses Hardcoded Agent ID

Spec (FR-005): Reputation multiplier applies per-project based on team track record.
Implementation (orchestrate.ts:116): `lookupReputationIndex(0n)` -- hardcoded agent ID `0n`. Every proposal gets the same multiplier regardless of team history. This defeats the entire purpose of the reputation system.

### DRIFT-6 (MEDIUM): Score Sent to MilestoneManager

`scaleScoreToChain(adjustedScore)` passed to `prepareReleaseMilestone`. Spec does not clarify whether fund release should use `finalScore` or `adjustedScore`.

---

## 3. Underspecified Areas

### UNDERSPEC-1 (HIGH): No Retry Logic (FR-016)

Spec requires 3 retries for failed evaluations. `retryCount` column exists in DB but is never used. If any LLM call fails, the entire evaluation fails.

### UNDERSPEC-2 (HIGH): No Chain Tx Retry (FR-017)

Spec requires exponential backoff (1s initial, 2x multiplier, 30s max, 5 attempts). Transactions are only encoded/prepared, not actually submitted by the app.

### UNDERSPEC-3 (HIGH): Layer 3 Anti-Injection Missing

Spec specifies 3-layer defense. Layer 1 (prompt instructions) and Layer 2 (anomaly detection) are implemented. Layer 3 (input preprocessing to strip SYSTEM:/INSTRUCTION:/IGNORE/OVERRIDE patterns) is completely absent.

### UNDERSPEC-4 (HIGH): In-Memory Concurrency Counter

Spec (T030): "max 10 active via Upstash Redis counter."
Implementation: Module-level `let activeEvaluationCount = 0` -- resets on restart, doesn't work across serverless instances.

### UNDERSPEC-5 (MEDIUM): Optional Webhook Signature Verification

Signature verification runs only if both `X-Signature-256` header AND `keyValidation.webhookSecret` are present. Otherwise skipped entirely.

### UNDERSPEC-6 (LOW/INFO): platformSource From API Key

`platformSource` derived from API key lookup, not request body. Good security decision but undocumented -- contradicts webhook-api spec.

---

## 4. Consistency Issues Between Modules

### CROSS-1 (MEDIUM): Duplicate computeReputationMultiplier

Two identical implementations in `scoring.ts` and `reputation/multiplier.ts`. DRY violation.

### CROSS-2 (MEDIUM): `as ScoringDimension` Type Cast

`scoring.ts:24` uses `as Type` cast, violating project's zero type-escape convention.

### CROSS-3 (LOW): `as Hex` Type Cast

`orchestrate.ts:160` casts zero address constant. Convention violation.

### CROSS-4 (HIGH): Dispute Override Missing Fund Release Recalculation

Spec (US5): "milestone fund releases are recalculated" on overturn. Implementation updates scores but never triggers MilestoneManager recalculation.

### CROSS-5 (HIGH): Regex State Bug in PII Detection

`sanitization.ts` uses `g` flag patterns with `.test()`. The `lastIndex` state carries over between calls, causing PII detection to produce false negatives on alternating invocations.

---

## 5. Findings Table

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | CRITICAL | orchestrate.ts:116 | Reputation lookup hardcoded to agent ID `0n` -- every proposal gets same multiplier |
| 2 | HIGH | runner.ts | No retry logic for failed evaluations (FR-016 requires 3 retries) |
| 3 | HIGH | sanitization.ts:4-8,65-71 | Regex `g` flag + `.test()` causes PII detection false negatives |
| 4 | HIGH | -- | Layer 3 anti-injection defense not implemented (spec requires 3 layers) |
| 5 | HIGH | runner.ts:8-9 | In-memory concurrency counter instead of Upstash Redis (spec T030) |
| 6 | HIGH | sync.ts:345-349 | Dispute status map missing `voting`/`expired`; status 1 maps to wrong value |
| 7 | HIGH | dispute-override.ts | Dispute overturn does not recalculate fund releases (spec US5) |
| 8 | HIGH | reputation-registry.ts | ABI mismatches data-model.md (uint256 vs int128, missing params) |
| 9 | HIGH | -- | No chain tx retry with exponential backoff (FR-017) |
| 10 | MEDIUM | scoring.ts:24 | `as ScoringDimension` type cast violates project conventions |
| 11 | MEDIUM | orchestrate.ts:158-160 | Fund release uses adjustedScore; spec unclear which score |
| 12 | MEDIUM | proposals/route.ts:96-109 | Webhook signature verification optional |
| 13 | MEDIUM | scoring.ts + multiplier.ts | Duplicate `computeReputationMultiplier` implementations |
| 14 | LOW | orchestrate.ts:160 | `as Hex` type cast on zero address |
| 15 | INFO | proposals/route.ts:136 | `platformSource` from API key (good security, undocumented) |

---

## 6. Overall Assessment

The speckit worktree has thorough planning artifacts -- the spec, data model, scoring schema, and on-chain event contracts are detailed and internally consistent. Implementation follows specs closely in structure and most business logic.

**Most critical finding:** Reputation lookup (Finding #1) -- every proposal gets the same multiplier because the system uses hardcoded agent ID `0n` instead of project identity. This defeats the entire purpose of the reputation system.

**Most dangerous bug:** Regex `lastIndex` state issue (Finding #3) -- PII could leak into IPFS and LLM inputs.

**Biggest spec gaps:** Retry logic (FR-016, FR-017) was explicitly required and task-listed but never implemented. Layer 3 anti-injection defense is missing. In-memory concurrency counter won't work on Vercel serverless.
