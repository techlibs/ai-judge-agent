# Research: Proposal Submission Form

## Decision 1: Form Submission Pattern

**Decision**: Next.js Server Action with progressive enhancement
**Rationale**: Server Actions handle form submission server-side without a separate API route. The form works without JavaScript (progressive enhancement) and provides type-safe request/response via Zod. Fits the existing Next.js App Router architecture.
**Alternatives considered**:
- Client-side fetch to new API route — adds unnecessary API surface when Server Actions exist
- Reuse existing webhook endpoint — requires API key auth, not suitable for public form

## Decision 2: Client-Side Validation

**Decision**: Zod schema shared between client and server + `useActionState` for form state
**Rationale**: Single Zod schema defines validation rules once, used both client-side (before submit) and server-side (in Server Action). `useActionState` (React 19) manages form state, errors, and pending status natively.
**Alternatives considered**:
- react-hook-form — additional dependency, overkill for a single form
- HTML5 validation only — insufficient for complex rules (character counts, team member arrays)

## Decision 3: Proposal ID Generation

**Decision**: Reuse existing `computeProposalId()` from evaluation pipeline
**Rationale**: The existing function in `src/evaluation/orchestrate.ts` generates deterministic IDs from proposal content. Using the same function ensures deduplication works across form submissions and webhook submissions.
**Alternatives considered**:
- UUID — no deduplication, inconsistent with existing pipeline
- Hash of title only — too coarse, different proposals could have same title

## Decision 4: Evaluation Trigger

**Decision**: Call `orchestrateEvaluation()` directly from the Server Action
**Rationale**: The orchestration function already handles IPFS pinning, sanitization, scoring, and chain data preparation. No need to go through the webhook endpoint.
**Alternatives considered**:
- POST to internal webhook — unnecessary network hop, requires API key setup
- Queue-based async — over-engineered for v1, can add later if needed

## Decision 5: Default Funding Round

**Decision**: Use `"open-submissions"` as the default `fundingRoundId` for form submissions
**Rationale**: The form doesn't have a funding round selector. Using a fixed default allows all form submissions to be grouped and filtered separately from API-submitted proposals.
**Alternatives considered**:
- Require funding round selection — UX overhead, no funding rounds exist yet
- Null/empty — violates the database NOT NULL constraint
