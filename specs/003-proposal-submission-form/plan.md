# Implementation Plan: Proposal Submission Form

**Branch**: `003-proposal-submission-form` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-proposal-submission-form/spec.md`

## Summary

Add a public grant proposal submission form at `/grants/submit`. Users fill a form with proposal details (title, description, category, budget, team info), which gets validated, pinned to IPFS, stored in the cache DB, and evaluated by the AI judge pipeline. Uses Next.js Server Actions with shared Zod validation between client and server. Reuses all existing infrastructure (IPFS pinning, sanitization, evaluation orchestration).

## Technical Context

**Language/Version**: TypeScript 5.8+ (strict mode)
**Primary Dependencies**: Next.js 15 (App Router, Server Actions), React 19 (useActionState), Zod 3.x, Tailwind CSS
**Storage**: SQLite via drizzle-orm (existing cache DB)
**Testing**: Vitest (unit), Playwright (e2e)
**Target Platform**: Web (Vercel deployment)
**Project Type**: Web application (Next.js)
**Constraints**: No `any`, no `as Type`, no `!`. Zod at all boundaries. PII sanitization before storage.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Transparent Evaluation | PASS | Form triggers existing evaluation pipeline with full justification chain |
| II. Specification-First | PASS | This spec was written before implementation |
| III. On-Chain Accountability | N/A | Form doesn't interact with chain directly — evaluation pipeline handles that |
| IV. Type Safety / Zero Escape | PASS | Shared Zod schema, no type escapes |
| V. Privacy-Preserving | PASS | Reuses existing sanitization + team profile hashing |
| VI. Incremental Delivery | PASS | Single feature delivering user-facing value |

## Project Structure

### Documentation (this feature)

```text
specs/003-proposal-submission-form/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── submission-api.md
└── tasks.md             # Phase 2 output (next step)
```

### Source Code (repository root)

```text
src/app/grants/submit/
├── page.tsx             # Server Component — page wrapper
├── form.tsx             # Client Component — form UI with validation
├── actions.ts           # Server Action — submitProposal()
└── schema.ts            # Shared Zod validation schema

src/app/grants/page.tsx  # Modified — add "Submit Proposal" link
src/app/page.tsx         # Modified — add "Submit Proposal" link
```

**Structure Decision**: Colocated under `/grants/submit/` following Next.js App Router conventions. Schema file shared between client (form validation) and server (action validation).
