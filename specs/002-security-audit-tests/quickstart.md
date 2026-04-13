# Quickstart: Security Audit Regression Tests

**Feature**: 002-security-audit-tests | **Date**: 2026-04-13

## Prerequisites

- Bun installed (1.3+)
- Dependencies installed (`bun install`)
- `.env.test` configured (already present in repo)

## Run the Tests

```bash
# Run only the security audit regression tests
bun run test:e2e -- --grep "Security Audit"

# Run the full test suite (includes security audit tests)
bun run test:e2e

# Run with verbose output
bun run test:e2e -- --grep "Security Audit" --reporter=list
```

## What the Tests Verify

Each test documents a **current vulnerability** from AUDIT-REPORT.md. Tests assert the vulnerable behavior exists today, with `// AUDIT:` comments explaining what the expected behavior should be after the fix is applied.

| Finding | Test | Current Result | Expected After Fix |
|---------|------|----------------|-------------------|
| H-01 | Unsigned webhook request | Accepted (201/400) | Rejected (401) |
| H-02 | Unauthenticated finalize | Processed (409/400) | Rejected (401) |
| H-03 | 6 rapid requests | All succeed | 6th returns 429 |
| H-04 | Empty bearer token | Rejected (401) | Rejected (401) |
| M-04 | Corrupt JSON proposal | 500 crash | Graceful error |
| M-05 | Evil origin header | Not rejected | Rejected (403) |
| M-07 | `%` search wildcard | Matches all | Matches literal `%` |

## Files Modified

| File | Change |
|------|--------|
| `e2e/integration/security-audit.spec.ts` | New — all regression tests |
| `e2e/features/security-audit.feature` | New — BDD Gherkin documentation |
| `e2e/fixtures/seed-data.ts` | Modified — add corrupt JSON proposal |

## Flipping Tests After Fixes

When a vulnerability fix lands, update the corresponding test assertion:

```typescript
// Before fix (documents vulnerability):
expect(response.status()).not.toBe(401);

// After fix (validates remediation):
expect(response.status()).toBe(401);
```

Each test's `// AUDIT:` comment block specifies the exact assertion change needed.
