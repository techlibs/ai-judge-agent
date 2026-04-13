# GSD Framework Code Review: Evaluation Module

**Reviewed:** 2026-04-13
**Depth:** standard (per-file analysis with cross-file tracing)
**Reviewer:** Claude (gsd-code-reviewer)
**Files Reviewed:** 12

## Files Reviewed

- `src/lib/evaluation/schemas.ts`
- `src/lib/evaluation/constants.ts`
- `src/lib/evaluation/prompts.ts`
- `src/lib/evaluation/agents.ts`
- `src/lib/evaluation/orchestrator.ts`
- `src/lib/evaluation/storage.ts`
- `src/lib/evaluation/use-evaluation.ts`
- `src/lib/evaluation/agents.test.ts`
- `src/lib/evaluation/orchestrator.test.ts`
- `src/app/api/evaluate/route.ts`
- `src/app/api/proposals/route.ts`
- `src/app/api/proposals/[tokenId]/route.ts`
- `src/app/api/proposals/submit/route.ts`

## Summary

The evaluation module is well-structured with good separation of concerns: schemas, constants, prompts, agents, orchestrator, storage, and a client hook. Zod validation is consistently applied at boundaries. TypeScript strict compliance is clean -- no `any`, no `as Type` casts, no `!` assertions. The anti-prompt-injection defenses in judge prompts are solid. However, there are several bugs and security issues that need attention.

---

## CRITICAL Issues

### CR-01: Race condition in concurrent evaluation tracking (evaluate/route.ts)

**File:** `src/app/api/evaluate/route.ts:15-19`
**Issue:** `activeEvaluations` is an in-memory `Set` tracked per serverless instance. On Vercel, each request may hit a different instance, so the duplicate-proposal guard (`activeEvaluations.has(proposalId)`) and the concurrent cap (`activeEvaluations.size >= MAX_CONCURRENT_EVALUATIONS`) provide no real protection. Two requests for the same proposalId hitting different instances will both proceed, causing duplicate on-chain transactions and IPFS pins.
**Impact:** Duplicate evaluations, wasted LLM costs, conflicting on-chain state.
**Fix:** The code has a TODO comment acknowledging this. For v1, add idempotency at the storage layer -- check on-chain whether the proposal already has feedback before writing. For production, use Vercel KV or Redis for distributed locking.

### CR-02: proposalId passed as user input to BigInt without sanitization (storage.ts)

**File:** `src/lib/evaluation/storage.ts:88-92`
**Issue:** `proposalId` is a free-form `z.string().min(1)` from user input (evaluate API). It is converted to `BigInt(proposalId)` for the on-chain call. While there is a `Number.isFinite` check, `BigInt()` can accept strings that `Number()` cannot represent accurately (e.g., `"999999999999999999999"`). The `Number.isFinite(numericValue)` check will pass for large strings because `Number("999999999999999999999")` returns `1e+21` which is finite, but the BigInt value will differ from the Number value. This is not a crash bug but could lead to unexpected token ID targeting.
**Fix:** Validate that proposalId matches a positive integer pattern before conversion:
```typescript
const PROPOSAL_ID_PATTERN = /^\d{1,18}$/;
if (!PROPOSAL_ID_PATTERN.test(proposalId)) {
  throw new Error(`Invalid proposalId: ${proposalId}`);
}
const tokenId = BigInt(proposalId);
```

### CR-03: Missing request body size limit on evaluate endpoint (evaluate/route.ts)

**File:** `src/app/api/evaluate/route.ts:24-30`
**Issue:** The evaluate endpoint validates `proposalText` max length as 50,000 characters via Zod, but the raw request body is parsed by `request.json()` first with no size limit. An attacker could send a 50MB JSON body that gets fully parsed before validation rejects it. The submit endpoint has `MAX_BODY_SIZE = 50 * 1024` but the evaluate endpoint does not. Requirement SEC-03 specifies "Request body max 256KB."
**Fix:** Add body size validation before JSON parsing, matching the pattern in `submit/route.ts`:
```typescript
const MAX_BODY_SIZE = 256 * 1024; // SEC-03
const rawBody = await request.text();
if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_SIZE) {
  return Response.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
}
const body: unknown = JSON.parse(rawBody);
```

---

## HIGH Issues

### HI-01: Model config hardcodes gpt-4o, contradicting CLAUDE.md stack decision

**File:** `src/lib/evaluation/constants.ts:31`
**Issue:** `MODEL_CONFIG.model` is hardcoded to `"gpt-4o"` and `agents.ts` imports from `@ai-sdk/openai`. The CLAUDE.md and tech stack specify Mastra + `@ai-sdk/anthropic` with Claude Sonnet as primary and OpenAI as failover. The implementation uses OpenAI as the sole provider with no Mastra integration.
**Impact:** Does not match the planned architecture. No failover if OpenAI is unavailable.
**Fix:** Either update the stack decision to reflect the actual implementation, or refactor to use Mastra with Anthropic as primary provider per the plan.

### HI-02: IPFS gateway JWT token leaked in URL query parameter (ipfs/client.ts)

**File:** `src/lib/ipfs/client.ts:50-51`
**Issue:** `fetchFromIPFS` appends the Pinata JWT as a query parameter: `?pinataGatewayToken=${env.PINATA_JWT}`. The JWT used for pinning (`Authorization: Bearer`) is the same secret being passed in the URL. URL query parameters are logged in server access logs, proxy logs, and CDN logs, which leaks the secret.
**Impact:** Credential exposure via log files.
**Fix:** Pinata dedicated gateways use a separate gateway access token, not the admin JWT. Use a dedicated `PINATA_GATEWAY_TOKEN` env var, or pass the token via an `Authorization` header instead of a query parameter.

### HI-03: Orchestrator does not set status to "failed" on partial success

**File:** `src/lib/evaluation/orchestrator.ts:107-116`
**Issue:** When some dimensions fail but at least one succeeds, the evaluation status is set to `"evaluated"`. There is no indication that the evaluation is partial. Downstream consumers (UI, on-chain) will treat a 1-of-4 dimension evaluation the same as a complete 4-of-4 evaluation.
**Impact:** Misleading evaluation quality. A proposal scored on only "impact" (weight 0.3) gets treated as fully evaluated.
**Fix:** Add a `"partial"` status or include a threshold:
```typescript
const status = successfulDimensions.length === DIMENSIONS.length
  ? "evaluated"
  : "partial";
```
This requires updating the `proposalEvaluationSchema` status enum.

### HI-04: proposals/route.ts silently swallows IPFS errors and returns incomplete data

**File:** `src/app/api/proposals/route.ts:69-79`
**Issue:** In the `enrichLog` function, if IPFS fetch fails, the catch block silently continues with `title: "Content unavailable"` and empty/zero values for description, budget, and submittedAt. The client has no way to distinguish between "content unavailable due to error" and "proposal with no description."
**Fix:** Include an `ipfsError: true` flag in the response when IPFS fetch fails:
```typescript
} catch {
  return {
    tokenId, owner, ipfsCID, status,
    feedbackCount: count, averageScore: Number(averageScore),
    title: "Content unavailable", description: "", budget: 0,
    submittedAt: "", ipfsError: true,
  };
}
```

### HI-05: submit/route.ts body size check happens after full JSON parsing

**File:** `src/app/api/proposals/submit/route.ts:15-19`
**Issue:** The body is first parsed with `request.json()` (unbounded), then re-serialized with `JSON.stringify(body)` to check its size. This means the full payload is already in memory before the size check. An attacker can send a very large JSON body and the size check provides no protection against memory exhaustion.
**Fix:** Read the raw body as text first, check size, then parse:
```typescript
const rawBody = await request.text();
if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_SIZE) {
  return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
}
const body: unknown = JSON.parse(rawBody);
```

---

## MEDIUM Issues

### MD-01: Duplicate DIMENSION_KEYS definition between schemas.ts and constants.ts

**File:** `src/lib/evaluation/schemas.ts:19-24` and `src/lib/evaluation/constants.ts:1-6`
**Issue:** Dimension keys are defined in two places: `DIMENSION_KEYS` in `schemas.ts` and `DIMENSIONS` array in `constants.ts`. If someone adds a dimension to one but not the other, the system silently breaks. The `DIMENSION_WEIGHTS` in constants.ts is a third source that must also stay in sync.
**Fix:** Define `DIMENSION_KEYS` once in `schemas.ts` and derive `DIMENSIONS` and `DIMENSION_WEIGHTS` from it:
```typescript
// constants.ts
import { DIMENSION_KEYS } from "./schemas";
// Derive DIMENSIONS from DIMENSION_KEYS
```

### MD-02: Missing Origin header validation on mutating API routes

**File:** `src/app/api/evaluate/route.ts`, `src/app/api/proposals/submit/route.ts`
**Issue:** Requirement SEC-19 states: "Mutating API routes must validate Origin header against allowed origins list." Neither the evaluate POST nor the submit POST checks the Origin header. This makes CSRF attacks possible.
**Fix:** Add Origin validation middleware or check `request.headers.get("origin")` against an allowlist at the top of each POST handler.

### MD-03: No rate limiting on evaluate or submit endpoints

**File:** `src/app/api/evaluate/route.ts`, `src/app/api/proposals/submit/route.ts`
**Issue:** Requirement SEC-02 requires "per-IP and global rate limits via persistent Redis-backed rate limiting" on cost-generating API endpoints. The evaluate endpoint triggers 5 LLM calls per request (4 dimensions + 1 naive). Neither endpoint has any rate limiting.
**Impact:** An attacker can trigger unlimited LLM API calls and on-chain transactions.
**Fix:** Add rate limiting. For v1 without Redis, use Vercel's built-in rate limiting or a simple in-memory token bucket per IP.

### MD-04: storage.ts does not simulate contract before writing (no dry-run)

**File:** `src/lib/evaluation/storage.ts:96-104`
**Issue:** The `publishScoreOnChain` function correctly uses `simulateContract` before `writeContract`, which is good. However, it does not implement retry with exponential backoff as required by SEC-37: "Chain transaction retries must use exponential backoff: initial 1s, multiplier 2x, max 30s, 5 attempts."
**Fix:** Wrap the simulate+write in a retry loop with exponential backoff.

### MD-05: [tokenId] route does not validate tokenId format

**File:** `src/app/api/proposals/[tokenId]/route.ts:15`
**Issue:** The `tokenId` from URL params is passed directly to `BigInt(tokenId)` without validation. A malformed tokenId (e.g., `"abc"`, `"-1"`, or very large numbers) will throw an unhandled error that gets caught by the generic catch block and returns a 500 instead of a 400.
**Fix:** Validate tokenId is a positive integer string before using it:
```typescript
if (!/^\d{1,18}$/.test(tokenId)) {
  return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
}
```

### MD-06: use-evaluation.ts does not handle fetch throwing (network error)

**File:** `src/lib/evaluation/use-evaluation.ts:122`
**Issue:** The `fetch()` call is not wrapped in try/catch. If the network is unreachable or the request is aborted, the promise rejects with an unhandled error. The `AbortController` abort on line 108 will cause a `DOMException: The user aborted a request` that propagates as an unhandled rejection.
**Fix:** Wrap the entire fetch+stream block in try/catch:
```typescript
try {
  const response = await fetch(...);
  // ... stream handling
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") return;
  setError(err instanceof Error ? err.message : "Network error");
  setStatus("failed");
}
```

---

## LOW Issues

### LO-01: Pinata response schema duplicated

**File:** `src/lib/evaluation/storage.ts:12-13` and `src/lib/ipfs/client.ts` (via `pinataResponseSchema` from `./types`)
**Issue:** `storage.ts` defines its own `pinataResponseSchema` locally, while `src/lib/ipfs/types.ts` exports one used by `ipfs/client.ts`. Two schemas for the same external API response.
**Fix:** Import the schema from `@/lib/ipfs/types` in `storage.ts`.

### LO-02: evaluateNaive has no structured output or error handling

**File:** `src/lib/evaluation/agents.ts:47-57`
**Issue:** `evaluateNaive` returns raw text with no schema validation. The naive prompt has no anti-injection defenses, unlike the structured prompts. While this is intentionally naive (for EVAL-08 before/after comparison), the complete lack of sanitization means injected content flows directly to the UI.
**Fix:** At minimum, truncate the naive output to prevent excessively large responses from being sent to the client. Consider HTML-sanitizing before display (SEC-09).

### LO-03: No request ID tagging (SEC-30)

**File:** All API routes
**Issue:** SEC-30 requires "All API requests must be tagged with a unique request ID for end-to-end tracing." No route generates or propagates a request ID.
**Fix:** Add a middleware that generates a UUID per request and includes it in response headers and log entries.

---

## INFO Items

### IN-01: No Mastra framework integration

**File:** `src/lib/evaluation/agents.ts`
**Note:** The tech stack specifies Mastra (`@mastra/core`, `@mastra/evals`) for agent orchestration, scorer pipeline, retry logic, and tracing. The current implementation uses raw Vercel AI SDK (`generateObject`, `generateText`) directly. This is functional but misses the planned benefits: built-in retry, scorer normalization, structured tracing, and workflow engine.

### IN-02: NAIVE_PROMPT serves EVAL-08 requirement

**File:** `src/lib/evaluation/prompts.ts:62-63`
**Note:** The naive prompt for before/after comparison (EVAL-08) is implemented and integrated into the orchestrator. Good requirement coverage.

### IN-03: Test coverage is limited to pure functions

**File:** `src/lib/evaluation/agents.test.ts`, `orchestrator.test.ts`
**Note:** Tests cover schemas, constants, prompt generation, and `computeAggregateScore`. No integration tests for the actual LLM calls, SSE streaming, or storage operations. This is acceptable for v1 given the time constraint but should be expanded.

### IN-04: SSE heartbeat pattern is well-implemented

**File:** `src/app/api/evaluate/route.ts:70-71`
**Note:** The 15-second heartbeat keeps connections alive through proxies. The 90-second timeout with AbortController is correctly paired with `maxDuration = 60`. Good defensive pattern.

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| EVAL-01 | Met | 4 independent judges via `evaluateAllDimensions` / orchestrator |
| EVAL-02 | Met | Structured output with score, justification, recommendation, keyFindings |
| EVAL-03 | Met | `computeAggregateScore` with weight normalization |
| EVAL-04 | Met | `IPE_CITY_VALUES` embedded in every judge prompt |
| EVAL-05 | Met | Calibrated rubric bands per dimension in `DIMENSION_RUBRICS` |
| EVAL-06 | Partial | Audit trail stored (prompt, model, response, timestamp) but model version not captured precisely |
| EVAL-07 | Met | SSE streaming with progress events in evaluate API |
| EVAL-08 | Met | Naive vs structured comparison via `evaluateNaive` |
| SEC-02 | Not met | No rate limiting on any endpoint |
| SEC-03 | Partial | proposalText has Zod max, but no raw body size check on evaluate endpoint |
| SEC-10 | Partial | Anti-injection in prompts; no score anomaly detection |
| SEC-11 | Partial | Evaluate is POST (correct); no idempotency guard |
| SEC-12 | Partial | maxDuration=60 and AbortController present; concurrent cap is per-instance only |
| SEC-19 | Not met | No Origin header validation |
| SEC-30 | Not met | No request ID tagging |

---

## TypeScript Compliance

**Status: PASS**

No violations of strict TypeScript rules:
- Zero `any` usage
- Zero `as Type` assertions (only `as const` which is legitimate)
- Zero `!` non-null assertions
- Zero `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`
- Zod validation at all external boundaries (API inputs, IPFS responses, Pinata responses, env vars)

---

_Reviewed: 2026-04-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
