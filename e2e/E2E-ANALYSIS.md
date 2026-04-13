# E2E Test Suite Analysis

**Date:** 2026-04-13
**Branch:** speckit
**Framework:** Playwright 1.59.1 + Chromium
**Runner:** `bun run test:e2e`

## Test Results

**78 passed, 1 skipped, 0 failed** in 39.3s

### By Project

| Project | Tests | Passed | Skipped |
|---------|-------|--------|---------|
| api (no browser) | 39 | 38 | 1 |
| chromium (browser) | 40 | 40 | 0 |
| **Total** | **79** | **78** | **1** |

### By Suite

| Suite | Tests | Status |
|-------|-------|--------|
| **API Layer** | | |
| `api/health.spec.ts` | 4 | all pass |
| `api/proposals-list.spec.ts` | 7 | all pass |
| `api/proposal-detail.spec.ts` | 5 | all pass |
| `api/rounds-stats.spec.ts` | 2 | all pass |
| `api/webhooks-proposals.spec.ts` | 7 | 6 pass, 1 skipped (duplicate detection) |
| `api/webhooks-disputes.spec.ts` | 2 | all pass |
| `api/evaluate-finalize.spec.ts` | 3 | all pass |
| `api/cron-monitoring.spec.ts` | 3 | all pass |
| `api/sync.spec.ts` | 1 | all pass |
| `api/security-headers.spec.ts` | 5 | all pass |
| **Page Layer** | | |
| `pages/grants-list-populated.spec.ts` | 8 | all pass |
| `pages/proposal-detail-evaluated.spec.ts` | 12 | all pass |
| `pages/proposal-detail-pending.spec.ts` | 5 | all pass |
| **Original Tests** | | |
| `navigation.spec.ts` | 3 | all pass |
| `grants-list.spec.ts` | 3 | all pass |
| `proposal-detail.spec.ts` | 3 | all pass |
| `operator-dashboard.spec.ts` | 1 | all pass |
| `screenshots.spec.ts` | 5 | all pass |

## Coverage Map (Spec → Tests)

### US1: Submit and Evaluate Proposals

| Acceptance Criteria | Test Coverage |
|---|---|
| Webhook ingestion with API key validation | `webhooks-proposals.spec.ts` — 401 without key, 401 invalid key, 413 oversized, 400 invalid JSON, 400 missing fields, 401 bad HMAC |
| 4 dimension scores produced | `proposal-detail.spec.ts` — dimensions array has 4 items, each with weight/score/reasoning/rubric/data |
| Weighted final score | `proposal-detail.spec.ts` — finalScore present on evaluated proposal |
| Reputation multiplier | `proposal-detail.spec.ts` — adjustedScore and reputationMultiplier present |
| Evaluation finalize | `evaluate-finalize.spec.ts` — 404 missing, 409 already finalized, 400 not ready |
| Full orchestration (AI+IPFS+chain) | Not covered — requires external services (requires-env) |

### US2: View Proposals on Dashboard

| Acceptance Criteria | Test Coverage |
|---|---|
| Paginated listing with scores | `proposals-list.spec.ts` — pagination, filters (round, status, search), sort, pageSize clamping |
| Proposal detail with evaluation | `proposal-detail.spec.ts` — full proposal with 4 dimensions, verification links |
| Score color coding | `grants-list-populated.spec.ts` — green for >=7 |
| Status badges | `grants-list-populated.spec.ts` — pending/evaluated/funded/disputed across pages |
| Expandable justifications | `proposal-detail-evaluated.spec.ts` — 4 details elements, expand shows reasoning/criteria |
| Pagination UI | `grants-list-populated.spec.ts` — page info text, Next link navigation |
| Funding round stats | `rounds-stats.spec.ts` — returns stats, 404 for unknown round |

### US3: On-Chain Fund Release

| Acceptance Criteria | Test Coverage |
|---|---|
| Fund release visible on dashboard | `proposal-detail-evaluated.spec.ts` — Fund Release section, percentage, tx hash link to basescan |

### US4: Monitor Agent

| Acceptance Criteria | Test Coverage |
|---|---|
| Cron endpoint auth | `cron-monitoring.spec.ts` — 401 without auth, 401 wrong token, 200 valid CRON_SECRET |

### US5: Dispute Resolution

| Acceptance Criteria | Test Coverage |
|---|---|
| Dispute webhook auth | `webhooks-disputes.spec.ts` — 401 without key, 400 invalid body |
| Disputes visible on detail page | `proposal-detail-evaluated.spec.ts` — Disputes section, status badges, votes, evidence link |

### US6: Reputation

| Acceptance Criteria | Test Coverage |
|---|---|
| Reputation multiplier in scoring | `proposal-detail-evaluated.spec.ts` — adjusted score with multiplier, Reputation Bonus Active badge |

### Cross-cutting

| Feature | Test Coverage |
|---|---|
| Health check | `health.spec.ts` — DB ok, IPFS error, chain status |
| Auth (operator dashboard) | `operator-dashboard.spec.ts` — redirect to sign-in |
| Cache sync auth | `sync.spec.ts` — 401 without auth |
| Security headers | `security-headers.spec.ts` — X-Frame-Options, CSP, HSTS, nosniff, Referrer-Policy |
| 404 handling | `proposal-detail.spec.ts` — notFound() for missing proposals |
| Pending state (no scores) | `proposal-detail-pending.spec.ts` — no evaluation/dimensions/disputes/fund-release sections |

## Infrastructure

### Test Layers
- **API project** (`--project=api`): 39 tests, no browser launch, uses Playwright `request` context
- **Chromium project** (`--project=chromium`): 40 tests, full browser via Desktop Chrome

### Seed Data
- `e2e/fixtures/seed-data.ts`: 25 proposals, 80 dimension scores, 5 fund releases, 7 disputes, funding round stats, evaluation jobs, platform integration
- `e2e/global-setup.ts`: Creates tables + seeds data before test run

### Environment
- `.env.test`: Local SQLite (`file:./test.db`), test auth secret, test cron secret
- Rate limiter: No-op when `UPSTASH_REDIS_REST_URL` is empty (allows webhook tests without Redis)

## Gaps and Future Work

| Gap | Reason | How to Close |
|---|---|---|
| Full evaluation orchestration (AI scoring) | Requires ANTHROPIC_API_KEY | Add golden-path test with `test.skip(!process.env.ANTHROPIC_API_KEY)` |
| IPFS pinning | Requires PINATA_JWT | Same golden-path test |
| On-chain transaction submission | Requires deployed contracts + RPC | Same golden-path test |
| Duplicate proposal detection | Depends on `computeProposalId` hash function | Integration test with known hash |
| Authenticated operator dashboard | No auth providers configured | Mock next-auth session or add test provider |
| Cache sync execution | Requires Graph + IPFS | Integration test with mocked services |
