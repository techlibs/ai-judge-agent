# Test Interface Contract: Security Audit Regression Tests

**Feature**: 002-security-audit-tests | **Date**: 2026-04-13

## Test File Structure

All security audit regression tests live in a single Playwright test file:

**File**: `e2e/integration/security-audit.spec.ts`
**Project**: `integration` (120s timeout, no browser)

### Test Organization

```typescript
test.describe("Security Audit Regression Tests", () => {

  test.describe("[H-01] Webhook Signature Bypass", () => {
    test("proposals endpoint accepts unsigned request when secret exists");
    test("disputes endpoint accepts unsigned request when secret exists");
  });

  test.describe("[H-02] Finalize Endpoint Auth Gap", () => {
    test("finalize processes already-finalized proposal without auth");
    test("finalize processes pending proposal without auth");
  });

  test.describe("[H-03] Rate Limiting Disabled", () => {
    test("6 rapid requests all succeed without 429");
  });

  test.describe("[H-04] Cron Secret Edge Case", () => {
    test("empty bearer token is rejected");
  });

  test.describe("[M-04] JSON.parse Crash on Corrupt Data", () => {
    test("corrupt rubricApplied causes 500");
  });

  test.describe("[M-05] Origin Validation Dead Code", () => {
    test("evil origin not rejected on mutating endpoint");
  });

  test.describe("[M-07] SQL LIKE Wildcard Injection", () => {
    test("percent wildcard matches all proposals");
    test("underscore wildcard matches proposals");
  });

});
```

### Annotation Convention

Each test includes a comment block linking to the audit finding:

```typescript
// AUDIT: H-01 — Webhook signature verification is optional
// Current: Request succeeds without signature (bypass exists)
// Expected after fix: 401 UNAUTHORIZED when X-Signature-256 is missing and webhookSecret is configured
```

### BDD Feature File

**File**: `e2e/features/security-audit.feature`

Documents all 7 findings in Gherkin syntax for non-technical stakeholders. Not executed by Playwright — serves as specification documentation.

## Request Patterns

All tests use Playwright's `request` API context:

```typescript
const response = await request.post(`${BASE_URL}/api/webhooks/proposals`, {
  headers: { "X-API-Key": TEST_API_KEY },
  data: { /* payload */ },
});
expect(response.status()).not.toBe(401);
```

## Constants Required from Seed Data

| Constant | Value | Used By |
|----------|-------|---------|
| `TEST_API_KEY` | `"test-api-key-..."` | H-01, H-03 |
| `TEST_WEBHOOK_SECRET` | `"test-webhook-secret"` | H-01 (context) |
| `CORRUPT_JSON_PROPOSAL_ID` | `"prop-corrupt-json"` | M-04 |
| `BASE_URL` | `"http://localhost:3001"` | All tests |
