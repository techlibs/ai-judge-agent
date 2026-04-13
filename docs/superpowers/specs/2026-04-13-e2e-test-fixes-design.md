# E2E Test Fixes + Evaluation Pipeline Mock

**Date:** 2026-04-13
**Scope:** Fix broken E2E tests (Track A) + implement mocked evaluation pipeline E2E (Track B)

## Track A: Fix Broken E2E Tests

### Problems
1. Fixture data doesn't match UI expectations (detail/listing tests fail)
2. Validation step definitions are stubs (13 scenarios, ~0% actual validation)
3. Team member selectors are fragile CSS-dependent
4. No test cleanup between scenarios (state leaks)
5. Missing step implementations for grants-listing and on-chain-verification features

### Approach
- Fix `seedProposal` and `seedPublishedProposal` fixtures to produce data matching UI expectations
- Implement real assertion logic in validation steps (check error messages, form state)
- Add `cleanupTestData()` in Background steps for all fixture-dependent features
- Add `data-testid` attributes to proposal form team member inputs
- Implement missing step definitions for grants-listing scenarios

### Success Criteria
- `bun run test:e2e` passes all non-@skip scenarios
- At least 40 of 56 active scenarios passing (up from ~20)

## Track B: Mock Evaluation Pipeline E2E

### Approach: Route-Level Mock
Create a test-only API endpoint that seeds evaluation results directly into the DB, bypassing the AI judge. The E2E test triggers this mock instead of calling real Anthropic.

### Implementation
1. Create `src/app/api/__test/seed-evaluation/route.ts` — POST endpoint that:
   - Accepts proposalId + array of dimension scores
   - Creates evaluation records with status "complete" for all 4 dimensions
   - Computes aggregate score
   - Sets proposal status to "published"
   - Only available when `NODE_ENV=test` or `NEXT_PUBLIC_ENABLE_TEST_ROUTES=true`

2. Update `live-evaluation.feature` — remove @skip, add scenarios using mock endpoint
3. Create step definitions that call the mock endpoint via Playwright's `request` API

### Success Criteria
- At least 5 evaluation lifecycle scenarios passing with mocked AI
- Full flow: submit → trigger mock eval → see scores → see aggregate
