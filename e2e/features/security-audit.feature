Feature: Security Audit Regression Tests
  As a security auditor
  I want regression tests documenting all findings from AUDIT-REPORT.md
  So that fixes can be verified and regressions detected

  Background:
    Given the test server is running on port 3001
    And seed data is loaded with test platforms and proposals

  # ─── H-01: Webhook Signature Bypass ──────────────────────────────────────────

  @audit @H-01 @high
  Scenario: Proposals endpoint accepts unsigned request when secret exists
    Given platform "test-platform" has a configured webhook secret
    When I send POST /api/webhooks/proposals with X-API-Key but no X-Signature-256
    Then the response status is NOT 401
    # CURRENT: Request bypasses signature verification
    # EXPECTED AFTER FIX: 401 UNAUTHORIZED when signature missing and secret configured

  @audit @H-01 @high
  Scenario: Disputes endpoint accepts unsigned request when secret exists
    Given platform "test-platform" has a configured webhook secret
    When I send POST /api/webhooks/disputes with X-API-Key but no X-Signature-256
    Then the response status is NOT 401
    # CURRENT: Request bypasses signature verification
    # EXPECTED AFTER FIX: 401 UNAUTHORIZED when signature missing and secret configured

  # ─── H-02: Finalize Endpoint Auth Gap ────────────────────────────────────────

  @audit @H-02 @high
  Scenario: Finalize processes already-finalized proposal without auth
    Given proposal "prop-funded-1" has been finalized (has evaluationContentCid)
    When I send POST /api/evaluate/prop-funded-1/finalize with no auth headers
    Then the response status is 409 ALREADY_FINALIZED
    And the response status is NOT 401
    # CURRENT: No authentication check exists
    # EXPECTED AFTER FIX: 401 UNAUTHORIZED before any business logic

  @audit @H-02 @high
  Scenario: Finalize processes pending proposal without auth
    Given proposal "prop-pending-1" has a pending evaluation job
    When I send POST /api/evaluate/prop-pending-1/finalize with no auth headers
    Then the response status is 400 NOT_READY
    And the response status is NOT 401
    # CURRENT: No authentication check exists
    # EXPECTED AFTER FIX: 401 UNAUTHORIZED before any business logic

  # ─── H-03: Rate Limiting Disabled ────────────────────────────────────────────

  @audit @H-03 @high
  Scenario: 6 rapid requests all succeed without 429
    Given Upstash Redis is not configured in the test environment
    When I send 6 rapid POST requests to /api/webhooks/proposals with valid API key
    Then none of the responses have status 429
    # CURRENT: Rate limiter returns success:true when Redis unavailable
    # EXPECTED AFTER FIX: Rate limiting enforced even without Redis (in-memory fallback)

  # ─── H-04: Cron Secret Edge Case ────────────────────────────────────────────

  @audit @H-04 @high
  Scenario: Empty bearer token is rejected
    When I send GET /api/cron/monitoring with Authorization "Bearer " (empty token)
    Then the response status is 401
    # CURRENT: This case works correctly (empty != valid)
    # NOTE: Full H-04 test (CRON_SECRET="" bypass) requires server restart, not possible in e2e

  # ─── M-04: JSON.parse Crash on Corrupt Data ─────────────────────────────────

  @audit @M-04 @medium
  Scenario: Corrupt rubricApplied causes 500
    Given proposal "prop-corrupt-json" has invalid JSON in rubricApplied field
    When I send GET /api/proposals/prop-corrupt-json
    Then the response status is 500
    # CURRENT: Unhandled JSON.parse error crashes the request
    # EXPECTED AFTER FIX: Graceful error handling with fallback or sanitized response

  # ─── M-05: Origin Validation Dead Code ───────────────────────────────────────

  @audit @M-05 @medium
  Scenario: Evil origin not rejected on mutating endpoint
    When I send POST /api/evaluate/prop-funded-1/finalize with Origin "https://evil.example.com"
    Then the response status is NOT 403
    # CURRENT: validateOrigin function exists but is never called
    # EXPECTED AFTER FIX: 403 FORBIDDEN for untrusted origins on mutating endpoints

  # ─── M-07: SQL LIKE Wildcard Injection ───────────────────────────────────────

  @audit @M-07 @medium
  Scenario: Percent wildcard matches all proposals
    When I send GET /api/proposals?search=%
    Then the response contains all 25 proposals
    # CURRENT: % is not escaped, becomes %%% in LIKE clause, matches everything
    # EXPECTED AFTER FIX: Literal % search returns 0 results

  @audit @M-07 @medium
  Scenario: Underscore wildcard matches proposals
    When I send GET /api/proposals?search=_
    Then the response contains proposals
    # CURRENT: _ is not escaped, matches any single character in LIKE clause
    # EXPECTED AFTER FIX: Literal _ search returns 0 results
