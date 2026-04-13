# Tasks: Security Audit Regression Tests

**Input**: Design documents from `/specs/002-security-audit-tests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature IS the tests — all tasks produce test code or test infrastructure.

**Organization**: Tasks grouped by user story (one per audit finding) for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Seed data additions and BDD feature file

- [X] T001 Add corrupt JSON proposal and dimension scores to seed data in e2e/fixtures/seed-data.ts
- [X] T002 [P] Create BDD feature file documenting all 7 findings in e2e/features/security-audit.feature
- [X] T003 [P] Create security audit test file with imports and describe blocks in e2e/integration/security-audit.spec.ts

**Checkpoint**: Seed data extended, test file scaffolded, BDD feature written

---

## Phase 2: User Story 1 — Webhook Signature Bypass Detection (Priority: P1)

**Goal**: Prove webhook endpoints accept unsigned requests when a platform has a webhook secret configured (H-01)

**Independent Test**: POST to /api/webhooks/proposals with X-API-Key but no X-Signature-256, observe non-401 response

- [X] T004 [US1] Add test "proposals endpoint accepts unsigned request when secret exists" in e2e/integration/security-audit.spec.ts
- [X] T005 [P] [US1] Add test "disputes endpoint accepts unsigned request when secret exists" in e2e/integration/security-audit.spec.ts

**Checkpoint**: H-01 finding documented with 2 passing tests

---

## Phase 3: User Story 2 — Finalize Endpoint Auth Gap (Priority: P1)

**Goal**: Prove the evaluation finalize endpoint has no authentication (H-02)

**Independent Test**: POST to /api/evaluate/{id}/finalize with zero auth headers, observe non-401 response

- [X] T006 [US2] Add test "finalize processes already-finalized proposal without auth" in e2e/integration/security-audit.spec.ts
- [X] T007 [P] [US2] Add test "finalize processes pending proposal without auth" in e2e/integration/security-audit.spec.ts

**Checkpoint**: H-02 finding documented with 2 passing tests

---

## Phase 4: User Story 3 — Rate Limiting Disabled Detection (Priority: P2)

**Goal**: Prove rate limiting is silently disabled when Upstash Redis is not configured (H-03)

**Independent Test**: Send 6 rapid POST requests to /api/webhooks/proposals, verify none return 429

- [X] T008 [US3] Add test "6 rapid requests all succeed without 429" in e2e/integration/security-audit.spec.ts

**Checkpoint**: H-03 finding documented with 1 passing test

---

## Phase 5: User Story 4 — Cron Secret Edge Case (Priority: P2)

**Goal**: Verify cron endpoint correctly rejects empty bearer tokens (H-04 partial coverage)

**Independent Test**: Send GET /api/cron/monitoring with "Bearer " (empty token), verify 401

- [X] T009 [US4] Add test "empty bearer token is rejected" in e2e/integration/security-audit.spec.ts

**Checkpoint**: H-04 finding documented with 1 passing test

---

## Phase 6: User Story 5 — JSON.parse Crash on Corrupt Data (Priority: P2)

**Goal**: Prove corrupt JSON in dimension_scores causes a 500 crash (M-04)

**Independent Test**: GET /api/proposals/prop-corrupt-json, expect 500 response

**Depends on**: T001 (corrupt JSON seed data)

- [X] T010 [US5] Add test "corrupt rubricApplied causes 500" in e2e/integration/security-audit.spec.ts

**Checkpoint**: M-04 finding documented with 1 passing test

---

## Phase 7: User Story 6 — Origin Validation Dead Code (Priority: P3)

**Goal**: Prove origin validation is not enforced on mutating endpoints (M-05)

**Independent Test**: POST to /api/evaluate/{id}/finalize with Origin "https://evil.example.com", verify non-403

- [X] T011 [US6] Add test "evil origin not rejected on mutating endpoint" in e2e/integration/security-audit.spec.ts

**Checkpoint**: M-05 finding documented with 1 passing test

---

## Phase 8: User Story 7 — SQL LIKE Wildcard Injection (Priority: P3)

**Goal**: Prove SQL LIKE wildcards in search params are not escaped (M-07)

**Independent Test**: GET /api/proposals?search=%, verify it returns all 25 proposals

- [X] T012 [US7] Add test "percent wildcard matches all proposals" in e2e/integration/security-audit.spec.ts
- [X] T013 [P] [US7] Add test "underscore wildcard matches proposals" in e2e/integration/security-audit.spec.ts

**Checkpoint**: M-07 finding documented with 2 passing tests

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validation and final checks

- [X] T014 Run full test suite and verify total count increased from 100 to ~111 with zero failures
- [X] T015 Verify all test comments include AUDIT finding ID references (H-01, H-02, etc.)
- [X] T016 Run quickstart.md validation — confirm `bun run test:e2e -- --grep "Security Audit"` executes successfully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **User Stories (Phases 2-8)**: Depend on T001 (seed data) and T003 (test file scaffold)
  - T010 (M-04 corrupt JSON) specifically depends on T001 completing first
  - All other user story tests can start after T003
- **Polish (Phase 9)**: Depends on all user story phases completing

### User Story Dependencies

- **US1 (H-01)**: Depends on T003 only — uses existing seed data (test-platform with webhook secret)
- **US2 (H-02)**: Depends on T003 only — uses existing seed data (prop-funded-1, prop-pending-1)
- **US3 (H-03)**: Depends on T003 only — uses existing seed data (test API key)
- **US4 (H-04)**: Depends on T003 only — uses existing .env.test CRON_SECRET
- **US5 (M-04)**: Depends on T001 (corrupt JSON seed data) AND T003
- **US6 (M-05)**: Depends on T003 only — uses existing seed data (prop-funded-1)
- **US7 (M-07)**: Depends on T003 only — uses existing seed data (25 proposals)

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T004 and T005 can run in parallel (within US1)
- T006 and T007 can run in parallel (within US2)
- T012 and T013 can run in parallel (within US7)
- US1-US4, US6, US7 can all start in parallel after T003 (no shared state)
- US5 must wait for T001 (seed data) but can run parallel to other stories after that

---

## Parallel Example: Setup Phase

```bash
# Launch seed data and scaffolding together:
Task: "Add corrupt JSON proposal to seed data in e2e/fixtures/seed-data.ts"
Task: "Create BDD feature file in e2e/features/security-audit.feature"
Task: "Create test file scaffold in e2e/integration/security-audit.spec.ts"
```

## Parallel Example: All P1 User Stories

```bash
# After T001+T003 complete, launch P1 stories in parallel:
Task: "T004 [US1] proposals endpoint accepts unsigned request"
Task: "T005 [US1] disputes endpoint accepts unsigned request"
Task: "T006 [US2] finalize without auth (already-finalized)"
Task: "T007 [US2] finalize without auth (pending)"
```

---

## Implementation Strategy

### MVP First (US1 + US2 — P1 Findings Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: US1 — H-01 Webhook Signature Bypass (T004-T005)
3. Complete Phase 3: US2 — H-02 Finalize Auth Gap (T006-T007)
4. **STOP and VALIDATE**: Run `bun run test:e2e -- --grep "Security Audit"` — 4 tests pass
5. Continue to P2 and P3 findings

### Incremental Delivery

1. Setup → Test file exists, seed data ready
2. Add US1 (H-01) → 2 tests pass → Commit
3. Add US2 (H-02) → 4 tests pass → Commit
4. Add US3 (H-03) → 5 tests pass → Commit
5. Add US4 (H-04) → 6 tests pass → Commit
6. Add US5 (M-04) → 7 tests pass → Commit
7. Add US6 (M-05) → 8 tests pass → Commit
8. Add US7 (M-07) → 10 tests pass → Commit
9. Polish → Full suite validates → PR ready

---

## Notes

- All tests go in a single file (`e2e/integration/security-audit.spec.ts`) organized by `test.describe` blocks per finding
- Each test includes `// AUDIT: X-NN` annotation comments with current vs expected behavior
- Tests assert CURRENT (vulnerable) behavior — they will need assertion flips when fixes land
- The BDD feature file is documentation-only (not executed by Playwright)
- Total new tests: ~11 (matching spec SC-002 target of ~111 total)
