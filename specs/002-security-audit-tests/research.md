# Research: Security Audit Regression Tests

**Feature**: 002-security-audit-tests | **Date**: 2026-04-13

## Research Tasks

### R1: How to test webhook signature bypass (H-01)

**Decision**: Send POST to `/api/webhooks/proposals` and `/api/webhooks/disputes` with a valid `X-API-Key` but omit the `X-Signature-256` header entirely. The current code at `src/app/api/webhooks/proposals/route.ts:89-99` only checks the signature IF the header is present (`if (signature && keyValidation.webhookSecret)`). Omitting the header skips verification entirely.

**Rationale**: The seed data already has `test-platform` with `webhookSecret: "test-webhook-secret"` and `apiKey: "test-api-key-..."`. The test proves the bypass by showing the request succeeds (201 or validation error) rather than returning 401 for missing signature.

**Alternatives considered**: Testing with an invalid signature (already covered in existing tests); testing with empty string signature (would also bypass the truthy check).

### R2: How to test finalize endpoint auth gap (H-02)

**Decision**: Send POST to `/api/evaluate/{id}/finalize` with zero auth headers. The route handler at `src/app/api/evaluate/[id]/finalize/route.ts` has no authentication check whatsoever — it immediately looks up the proposal by ID.

**Rationale**: Use `prop-funded-1` (has `evaluationContentCid` set) to get 409 ALREADY_FINALIZED, and `prop-pending-1` (has a pending evaluation job) to get 400 NOT_READY. Neither response is 401, proving no auth exists.

**Alternatives considered**: Testing with random auth headers to prove they're ignored — redundant since the code has no auth logic at all.

### R3: How to test rate limiting disabled (H-03)

**Decision**: Send 6 rapid POST requests to `/api/webhooks/proposals` with valid API key. The rate limiter at `src/lib/rate-limit.ts:33-35` returns `{ success: true }` when `UPSTASH_REDIS_REST_URL` is not set. In the test environment (`.env.test`), this env var is absent.

**Rationale**: The test sends 6 requests (limit is 5/hour) and asserts none return 429. Each request needs a valid API key but can have invalid payloads (400 responses still prove rate limiting was not applied).

**Alternatives considered**: Testing with exactly 5 requests (at the limit boundary) — less conclusive since it wouldn't exceed the configured limit.

### R4: How to test cron secret edge case (H-04)

**Decision**: Send GET to `/api/cron/monitoring` with `Authorization: "Bearer "` (trailing space, empty token). The code at `src/app/api/cron/monitoring/route.ts:15` compares `authHeader !== expectedToken` where `expectedToken = "Bearer test-cron-secret"`. An empty bearer value will fail this check and return 401 — this is the working case.

**Rationale**: Full H-04 testing (CRON_SECRET="" bypass) requires server restart with modified env, which isn't possible in e2e. We test the edge case of empty bearer token to verify the comparison logic handles it. The test documents the limitation.

**Alternatives considered**: Mocking process.env — not possible in e2e tests running against a real server.

### R5: How to test JSON.parse crash (M-04)

**Decision**: Add a seed data proposal `prop-corrupt-json` with `rubricApplied` set to `"not-valid-json{{"` in `dimension_scores`. Then request `GET /api/proposals/prop-corrupt-json` and expect 500.

**Rationale**: The proposal detail endpoint reads dimension scores and presumably parses JSON fields. Corrupt JSON will cause an unhandled `JSON.parse` or `JSON.stringify` error, resulting in a 500 response. Need to verify which field actually gets parsed — check the proposal detail route.

**Alternatives considered**: Corrupting other JSON fields — `rubricApplied` is specifically called out in the audit.

### R6: How to test origin validation dead code (M-05)

**Decision**: Send POST to `/api/evaluate/{id}/finalize` with `Origin: "https://evil.example.com"`. The `validateOrigin` function exists at `src/lib/validate-origin.ts` but is never called from middleware or route handlers. The request will succeed (get 409 ALREADY_FINALIZED) rather than 403.

**Rationale**: Testing against the finalize endpoint is ideal because it's a non-webhook mutating endpoint that `validateOrigin` is designed to protect. The test proves the function is dead code.

**Alternatives considered**: Testing against `/api/sync` — also valid but finalize is the higher-priority target (H-02).

### R7: How to test SQL LIKE wildcard injection (M-07)

**Decision**: Send `GET /api/proposals?search=%` and verify it returns all 25 proposals. Send `GET /api/proposals?search=_` and verify it returns proposals (since `_` matches any single character). The code at `src/cache/queries.ts:132` wraps the search term as `%${params.search}%` without escaping, so `%` becomes `%%%` (matches everything) and `_` becomes `%_%` (matches any title with at least 1 character).

**Rationale**: The seed data has 25 proposals with titles like "Community WiFi Network", "DeFi Lending Protocol", etc. No title contains a literal `%` or `_`, so any matches prove wildcard interpretation.

**Alternatives considered**: Testing with `[` or other regex characters — not relevant to SQL LIKE; testing escaping of `'` — parameterized queries already handle SQL injection, this is specifically about LIKE wildcards.

## Key Findings

1. **All tests can run against the existing test server** on port 3001 with local SQLite — no external dependencies needed.
2. **Seed data modification is minimal** — only one new proposal entry (`prop-corrupt-json`) needed.
3. **Tests should be in a single file** (`e2e/integration/security-audit.spec.ts`) grouped by `test.describe` blocks per finding ID for easy traceability.
4. **Placement in `integration/` project** is appropriate because these tests document cross-cutting security concerns, not individual API endpoint behavior.
5. **The Playwright `api` project** uses `baseURL: http://localhost:3001` and `request` context (no browser needed). But since we're placing in `integration/`, we use the integration project config which has a 120s timeout.
6. **Existing test patterns** use `request.post(url, { headers, data })` and assert on `response.status()` and `response.json()`.
