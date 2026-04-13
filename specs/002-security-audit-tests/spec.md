# Feature Specification: Security Audit Regression Tests

**Feature Branch**: `002-security-audit-tests`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Security regression e2e tests for 7 audit findings from AUDIT-REPORT.md"

## User Scenarios & Testing

### User Story 1 - Webhook Signature Bypass Detection (Priority: P1)

As a security engineer, I want automated tests proving that webhook endpoints accept unsigned requests when a platform has a webhook secret configured, so that when the signature-required fix lands the test flips to green.

**Why this priority**: H-01 is the highest-impact finding — an attacker with a stolen API key can forge arbitrary webhook payloads without knowing the webhook secret.

**Independent Test**: Can be tested by submitting a valid proposal payload with an API key but no X-Signature-256 header and observing the response code.

**Acceptance Scenarios**:

1. **Given** the platform "test-platform" has webhookSecret="test-webhook-secret", **When** I POST a valid proposal to /api/webhooks/proposals with X-API-Key but no X-Signature-256, **Then** the request is not rejected with 401 for missing signature (proving the bypass exists)
2. **Given** the platform "test-platform" has a webhook secret, **When** I POST a valid dispute to /api/webhooks/disputes with X-API-Key but no X-Signature-256, **Then** the request is not rejected with 401 for missing signature

---

### User Story 2 - Finalize Endpoint Auth Gap (Priority: P1)

As a security engineer, I want automated tests proving that the evaluation finalize endpoint has no authentication, so that when auth is added the test validates it.

**Why this priority**: H-02 allows any unauthenticated user to call a state-changing endpoint.

**Independent Test**: Can be tested by calling POST /api/evaluate/{id}/finalize with zero auth headers and observing the response.

**Acceptance Scenarios**:

1. **Given** proposal "prop-funded-1" exists with a completed evaluation, **When** I POST to /api/evaluate/prop-funded-1/finalize with no auth headers, **Then** the endpoint processes the request (returns 409 ALREADY_FINALIZED, not 401)
2. **Given** proposal "prop-pending-1" has a pending evaluation job, **When** I POST to /api/evaluate/prop-pending-1/finalize with no auth, **Then** the endpoint processes the request (returns 400 NOT_READY, not 401)

---

### User Story 3 - Rate Limiting Disabled Detection (Priority: P2)

As a security engineer, I want a test documenting that rate limiting is silently disabled when Upstash Redis is not configured, so that the team knows the risk.

**Why this priority**: H-03 exposes the system to DoS if the Redis env var is accidentally removed in production.

**Independent Test**: Can be tested by sending 6+ rapid requests and verifying none return 429.

**Acceptance Scenarios**:

1. **Given** UPSTASH_REDIS_REST_URL is not set in the test environment, **When** I send 6 rapid POST requests to /api/webhooks/proposals, **Then** none of the responses have status 429

---

### User Story 4 - Cron Secret Edge Case (Priority: P2)

As a security engineer, I want a test that verifies the cron endpoint correctly rejects empty bearer tokens, providing partial coverage for the H-04 finding.

**Why this priority**: H-04 allows authentication bypass when CRON_SECRET is set to an empty string. Full e2e testing requires env var manipulation at server startup, but partial coverage is valuable.

**Independent Test**: Can be tested by sending a Bearer token with empty value to the cron endpoint.

**Acceptance Scenarios**:

1. **Given** CRON_SECRET is set to a non-empty value, **When** I send GET /api/cron/monitoring with Authorization "Bearer " (trailing space, no token), **Then** the response is 401 Unauthorized

---

### User Story 5 - JSON.parse Crash on Corrupt Data (Priority: P2)

As a security engineer, I want a test proving that corrupt JSON in dimension_scores causes a 500 crash, so that when try-catch is added the test validates the fix.

**Why this priority**: M-04 causes denial of service for individual proposal pages if data is corrupted.

**Independent Test**: Can be tested by seeding a proposal with invalid JSON in rubricApplied and requesting it via the API.

**Acceptance Scenarios**:

1. **Given** proposal "prop-corrupt-json" has dimension_scores with rubricApplied="not-valid-json{{", **When** I GET /api/proposals/prop-corrupt-json, **Then** the response is 500 (proving the crash)

---

### User Story 6 - Origin Validation Dead Code (Priority: P3)

As a security engineer, I want a test proving that origin validation is not enforced on mutating endpoints, so that the team knows CSRF protection is missing.

**Why this priority**: M-05 means validateOrigin exists but is never wired into middleware — any origin can call mutating endpoints.

**Independent Test**: Can be tested by sending a POST with an evil Origin header and observing it is not rejected with 403.

**Acceptance Scenarios**:

1. **Given** no middleware enforces origin validation, **When** I POST to /api/evaluate/prop-funded-1/finalize with Origin "https://evil.example.com", **Then** the response is not 403 (proving origin validation is not enforced)

---

### User Story 7 - SQL LIKE Wildcard Injection (Priority: P3)

As a security engineer, I want tests proving that SQL LIKE wildcards in search params are not escaped, so that when escaping is added the tests validate the fix.

**Why this priority**: M-07 allows users to craft search patterns that match unintended results via % and _ wildcards.

**Independent Test**: Can be tested by searching with special LIKE characters and observing unexpected result counts.

**Acceptance Scenarios**:

1. **Given** 25 proposals exist in the seed data, **When** I GET /api/proposals?search=%, **Then** the response returns all proposals (proving % is treated as wildcard, not literal)
2. **Given** no proposal title contains a literal underscore, **When** I GET /api/proposals?search=_, **Then** the response returns proposals (proving _ is treated as single-char wildcard)

---

### Edge Cases

- What happens when multiple security findings interact (e.g., no auth + no origin check + no rate limiting)?
- How does the system behave with simultaneously corrupt JSON in multiple dimension_scores rows?

## Requirements

### Functional Requirements

- **FR-001**: System MUST have automated e2e tests documenting each of the 7 audit findings
- **FR-002**: Tests MUST assert the current (vulnerable) behavior with annotation comments indicating expected behavior after fix
- **FR-003**: Tests MUST NOT break the existing 100 passing e2e tests
- **FR-004**: Tests MUST use the existing Playwright test infrastructure (seed data, global setup, API project)
- **FR-005**: A BDD feature file MUST document all 7 findings in Gherkin format
- **FR-006**: Seed data MUST include a proposal with corrupt JSON for the M-04 test
- **FR-007**: Each test MUST reference its audit finding ID (H-01, H-02, etc.) in comments

### Key Entities

- **Audit Finding**: A security vulnerability identified in AUDIT-REPORT.md with severity, code location, and remediation guidance
- **Regression Test**: A Playwright e2e test that documents vulnerable behavior and will verify the fix once applied
- **Seed Data**: Pre-populated test database entries used to create specific test conditions

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 7 audit findings have at least one automated regression test
- **SC-002**: Total test count increases from 100 to ~111 with zero failures
- **SC-003**: Each test has a comment linking to its audit finding ID for traceability
- **SC-004**: The BDD feature file covers all 7 findings with Gherkin acceptance scenarios
- **SC-005**: Running the full test suite completes in under 5 minutes

## Assumptions

- The test environment has no Upstash Redis configured (rate limiting is already disabled), which is the expected state for H-03 testing
- The CRON_SECRET in .env.test is non-empty ("test-cron-secret"), so H-04 can only be partially tested
- Server env vars cannot be changed at runtime during e2e tests, limiting H-03 and H-04 full coverage
- The existing seed data helper pattern (INSERT OR IGNORE) is used for the new corrupt JSON proposal
- Tests assert current vulnerable behavior with // AUDIT annotations, not the expected fixed behavior
