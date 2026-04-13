# Breadth-First Test Suite Design

**Date:** 2026-04-13
**Scope:** Cover all testable behaviors across the agent-reviewer TypeScript application layer
**Approach:** Breadth-first — focused tests for every module, ~97 tests across 15 files
**Runner:** bun:test (native Bun test runner)
**Target:** ~70% behavior coverage (up from ~25%)

## Current State

- **Solidity contracts:** 39 tests, well covered (not in scope)
- **TypeScript app:** 3 schema validation tests + 1 Playwright E2E suite
- **Critical gaps:** orchestrator, chain publisher, judge execution, IPFS, rate limiting, PII detection, prompts — all at 0 tests

## Test Architecture

### File Structure

```
src/__tests__/
├── api/
│   ├── proposals.test.ts          (extend existing, +8 tests)
│   ├── evaluate-trigger.test.ts   (new, 8 tests)
│   ├── evaluate-dimension.test.ts (new, 10 tests)
│   ├── evaluate-status.test.ts    (new, 5 tests)
│   ├── evaluate-finalize.test.ts  (new, 4 tests)
│   └── evaluate-retry.test.ts     (new, 4 tests)
├── lib/
│   ├── orchestrator.test.ts       (new, 17 tests)
│   ├── publish-chain.test.ts      (new, 10 tests)
│   ├── ipfs-client.test.ts        (new, 6 tests)
│   ├── rate-limit.test.ts         (new, 4 tests)
│   ├── weights.test.ts            (new, 5 tests)
│   ├── sanitize.test.ts           (new, 4 tests)
│   ├── security-log.test.ts       (new, 3 tests)
│   ├── judge-schemas.test.ts      (new, 4 tests)
│   └── judge-prompts.test.ts      (new, 5 tests)
└── helpers/
    └── mocks.ts                   (shared mock factories)
```

### Mocking Strategy

- **bun:test built-ins:** `mock()`, `spyOn()`, `mock.module()` for deep dependencies
- **Shared mock factories** in `helpers/mocks.ts` for reusable fixtures:
  - `mockDb()` — in-memory database stubs with proposals, evaluations, aggregateScores tables
  - `mockIpfs()` — fake uploadJson, fetchJson, verifyContentIntegrity
  - `mockChain()` — fake viem walletClient.writeContract, publicClient.waitForTransactionReceipt
  - `mockRateLimiter()` — controllable limit/success responses
  - `mockJudgeAgent()` — fake Mastra agent with configurable structured output
  - `createProposalFixture()` — valid proposal with all fields populated
  - `createEvaluationFixture(dimension)` — valid evaluation for a given dimension
  - `createAggregateFixture()` — valid aggregate score

### Dependency Injection Points

| Module | Dependencies to Mock |
|--------|---------------------|
| orchestrator | getDb, uploadJson, publishEvaluationOnChainDetailed, logSecurityEvent, computeAggregateScore |
| publish-chain | getWalletClient, getPublicClient, contract addresses |
| ipfs/client | PinataSDK (upload.public.json, gateways.public.get) |
| rate-limit | Redis.fromEnv, Ratelimit constructor |
| API routes | getDb, all limiters, uploadJson, logSecurityEvent, Mastra Agent |

## Test Specifications

### Tier 1 — Critical (Core Pipeline)

#### orchestrator.test.ts (17 tests)

```
describe("checkAndFinalizeEvaluation")
  ✓ all 4 dimensions complete → computes aggregate + publishes chain
  ✓ only 3/4 complete → returns {complete: false}, no side effects
  ✓ idempotency: existing aggregate → returns early, no duplicate publish
  ✓ anomaly: all scores ≥9500 → flags ALL_MAX, logs security event
  ✓ anomaly: all scores ≤500 → flags ALL_MIN
  ✓ anomaly: divergence >5000 → flags MAX_DIVERGENCE
  ✓ no anomaly for normal score spread → no security event logged
  ✓ IPFS upload failure → status set to "failed", throws
  ✓ chain publish failure → status set to "failed", throws
  ✓ verifies correct weighted score stored in DB
  ✓ verifies per-dimension tx hashes stored in evaluations table
  ✓ verifies proposal status transitions: evaluating → publishing → published
  ✓ IPFS payload includes all dimension scores + aggregate + anomaly flags
  ✓ concurrent calls → only first publishes (idempotency under race)
  ✓ dimension→finalize handoff: complete eval triggers finalization check
  ✓ invalid status transition (published → evaluating) → rejected
  ✓ chain publish returns tx hashes → stored on aggregate record
```

#### publish-chain.test.ts (10 tests)

```
describe("publishEvaluationOnChainDetailed")
  ✓ happy path: register → 4 feedbacks → aggregate milestone, returns all hashes
  ✓ contract addresses zero → throws "not configured" error
  ✓ identity register tx reverts → throws with tx hash context
  ✓ feedback tx reverts → throws with dimension info
  ✓ milestone tx reverts → throws
  ✓ verifies keccak256 content hashing of feedback data
  ✓ verifies 60s timeout on waitForTransactionReceipt
  ✓ verifies agentId extracted from register tx logs
  ✓ each feedback tx sends correct dimension + score + content hash
  ✓ aggregate milestone sends total weighted score

describe("publishEvaluationOnChain")
  (thin wrapper — covered by integration via orchestrator tests)
```

#### evaluate-dimension.test.ts (10 tests)

```
describe("GET /api/evaluate/[id]/[dimension]")
  ✓ valid proposal + dimension → 200 with judge evaluation
  ✓ invalid dimension (e.g., "vibes") → 400
  ✓ proposal not found → 404
  ✓ already complete evaluation → returns cached result
  ✓ evaluation in progress (streaming) → 409
  ✓ judge agent fails → retries 2x with backoff, then 500
  ✓ judge output fails JudgeEvaluationSchema → treated as failure
  ✓ IPFS upload includes promptTransparency metadata
  ✓ correct DB status transitions: pending → streaming → complete
  ✓ failed evaluation → DB status set to "failed"
```

### Tier 2 — High (Security & API)

#### proposals.test.ts (extend existing, +8 tests)

```
describe("POST /api/proposals")
  (existing 3 schema tests)
  ✓ content-length > 256KB → 413
  ✓ rate limited → 429 with Retry-After header
  ✓ PII: email address detected → 422 PII_DETECTED
  ✓ PII: phone number detected → 422
  ✓ PII: SSN pattern detected → 422
  ✓ PII: IP address detected → 422
  ✓ valid proposal → IPFS upload called with correct payload shape
  ✓ valid proposal → DB insert with status "pending"
```

#### evaluate-trigger.test.ts (8 tests)

```
describe("POST /api/evaluate/[id]")
  ✓ proposal pending → 200, status updated to "evaluating"
  ✓ response includes stream URLs for all 4 dimensions
  ✓ proposal not found → 404
  ✓ already evaluating → 409
  ✓ already published → 409
  ✓ rate limited (per-IP) → 429
  ✓ global capacity exceeded → 429
  ✓ invalid status transition rejected (published → evaluating)
```

#### evaluate-status.test.ts (5 tests)

```
describe("GET /api/evaluate/[id]/status")
  ✓ proposal with no evaluations → status present, dimensions empty
  ✓ proposal with partial evaluations (2/4) → shows completed only
  ✓ proposal with all evaluations + aggregate → full response with scores
  ✓ aggregate includes chainTxHash when published
  ✓ proposal not found → 404
```

#### evaluate-finalize.test.ts (4 tests)

```
describe("POST /api/evaluate/[id]/finalize")
  ✓ all evals complete → 200 with aggregate score + published status
  ✓ not all complete → 202 not_ready
  ✓ chain publish fails → 500 with failed status
  ✓ proposal not found → 404
```

#### evaluate-retry.test.ts (4 tests)

```
describe("POST /api/evaluate/[id]/[dimension]/retry")
  ✓ failed evaluation → deletes old record, returns 200
  ✓ non-failed evaluation (complete) → 409
  ✓ invalid dimension → 400
  ✓ proposal not found → 404
```

#### ipfs-client.test.ts (6 tests)

```
describe("uploadJson")
  ✓ upload succeeds first try → returns {cid, uri}
  ✓ upload fails 2x then succeeds → retries work, returns cid
  ✓ upload fails 3x → throws after exhausting retries
  ✓ verification fails (gateway lag) → still returns (graceful degradation)

describe("fetchJson")
  ✓ valid data + matching schema → parsed result

describe("verifyContentIntegrity")
  ✓ content mismatch → returns {valid: false, reason}
```

#### rate-limit.test.ts (4 tests)

```
describe("rate limiters")
  ✓ request under limit → success
  ✓ request over limit → returns reset time
  ✓ no Redis configured (env vars missing) → graceful fallback, no crash
  ✓ global limiter independent of per-IP limiter
```

### Tier 3 — Medium (Supporting)

#### weights.test.ts (5 tests)

```
describe("computeAggregateScore")
  ✓ all dimensions 5000 → 5000
  ✓ weighted: {tech:10000, impact:0, cost:0, team:0} → 2500
  ✓ weighted: {tech:0, impact:10000, cost:0, team:0} → 3000
  ✓ missing dimension → throws "Missing score for dimension: X"
  ✓ fractional rounding → nearest integer
```

#### sanitize.test.ts (4 tests)

```
describe("sanitizeDisplayText")
  ✓ strips all HTML tags
  ✓ preserves plain text unchanged

describe("sanitizeRichText")
  ✓ keeps allowed tags (p, strong, em, a, code, pre)
  ✓ strips dangerous tags (script, iframe, onclick)
```

#### security-log.test.ts (3 tests)

```
describe("logSecurityEvent")
  ✓ logs correct JSON structure with timestamp
  ✓ includes event type and metadata fields
  ✓ level is always "SECURITY"
```

#### judge-schemas.test.ts (4 tests)

```
describe("JudgeEvaluationSchema")
  ✓ valid evaluation passes schema
  ✓ score > 10000 → fails validation
  ✓ missing required field (justification) → fails
  ✓ ipeAlignment values > 100 → fails
```

#### judge-prompts.test.ts (5 tests)

```
describe("getJudgePrompt")
  ✓ returns string containing anti-injection guard (F-010)
  ✓ each dimension has unique evaluation criteria
  ✓ all prompts include calibration anchors (8000-10000 range)
  ✓ all prompts include IPE City alignment lens

describe("buildProposalContext")
  ✓ includes all proposal fields (title, description, budget, team, links)
```

## Implementation Order

Build tests bottom-up (dependencies first):

1. **Wave 1 — Foundations:** helpers/mocks.ts, weights.test.ts, sanitize.test.ts, security-log.test.ts, judge-schemas.test.ts, judge-prompts.test.ts
2. **Wave 2 — Infrastructure:** ipfs-client.test.ts, rate-limit.test.ts, publish-chain.test.ts
3. **Wave 3 — Core Pipeline:** orchestrator.test.ts
4. **Wave 4 — API Routes:** proposals.test.ts (extend), evaluate-trigger, evaluate-dimension, evaluate-status, evaluate-finalize, evaluate-retry

## Success Criteria

- All ~97 tests pass with `bun test src/__tests__/`
- No tests depend on external services (Anthropic, Pinata, Redis, Base Sepolia)
- Each test file runs independently
- Shared mocks cover all external dependencies
- Tests complete in <10 seconds total
