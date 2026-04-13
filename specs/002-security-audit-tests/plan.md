# Implementation Plan: Security Audit Regression Tests

**Branch**: `002-security-audit-tests` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-security-audit-tests/spec.md`

## Summary

Add ~11 Playwright e2e regression tests covering all 7 findings from AUDIT-REPORT.md (H-01 through M-07). Tests document current vulnerable behavior with `// AUDIT:` annotations, use the existing Playwright API project infrastructure, and require one new seed data entry for corrupt JSON testing. A BDD feature file documents all findings in Gherkin format.

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode)
**Primary Dependencies**: Playwright (e2e), Next.js 15 App Router, Zod, drizzle-orm
**Storage**: SQLite via Turso (local `file:./test.db` in test env)
**Testing**: Playwright with 3 projects: `api` (no browser), `chromium` (UI), `integration` (external services)
**Target Platform**: Next.js on Vercel (tested locally on port 3001)
**Project Type**: Web service (API + UI)
**Performance Goals**: Full test suite under 5 minutes
**Constraints**: Cannot manipulate server env vars at runtime during e2e; CRON_SECRET is non-empty in .env.test; no Upstash Redis in test env

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Transparent Evaluation | PASS | Not applicable — tests don't generate scores |
| II. Specification-First Development | PASS | Spec written and approved before planning |
| III. On-Chain Accountability | PASS | Not applicable — test-only feature |
| IV. Type Safety and Zero Escape Hatches | PASS | Tests will use typed request helpers; no `any` or `as Type` |
| V. Privacy-Preserving by Design | PASS | Test data uses synthetic/hashed identifiers |
| VI. Incremental Delivery | PASS | Tests are independent; each can be delivered and run individually |

**Constitution gate: PASSED**

## Project Structure

### Documentation (this feature)

```text
specs/002-security-audit-tests/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output (test contracts)
└── tasks.md             # Phase 2 output (by /speckit-tasks)
```

### Source Code (repository root)

```text
e2e/
├── api/                           # Existing API test directory
│   ├── webhooks-proposals.spec.ts # Existing — no changes
│   ├── cron-monitoring.spec.ts    # Existing — no changes
│   ├── evaluate-finalize.spec.ts  # Existing — no changes
│   ├── proposals-list.spec.ts     # Existing — no changes
│   └── ...                        # Other existing tests
├── integration/
│   └── security-audit.spec.ts     # NEW — all 7 audit regression tests
├── features/
│   └── security-audit.feature     # NEW — BDD Gherkin for all 7 findings
├── fixtures/
│   └── seed-data.ts               # MODIFIED — add corrupt JSON proposal
└── global-setup.ts                # Existing — no changes (seed handles new data)
```

**Structure Decision**: New security audit tests go in `e2e/integration/security-audit.spec.ts` (single file, grouped by audit finding ID) rather than spreading across existing test files. This keeps audit regression tests isolated, easy to find by finding ID, and avoids modifying the 100 passing tests. The BDD feature file goes in `e2e/features/security-audit.feature`.

## Complexity Tracking

No constitution violations — no justification needed.
