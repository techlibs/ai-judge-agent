# Tasks: Proposal Submission Form

**Input**: Design documents from `/specs/003-proposal-submission-form/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the submission route directory structure

- [x] T001 Create submission form Zod schema with shared client/server validation in `src/app/grants/submit/schema.ts` — define `ProposalFormSchema` with fields: title (1-200), description (50-10000), category (enum), budgetAmount (positive, max 100M), budgetCurrency (USD/ETH), technicalDescription (50-10000), teamMembers (1-20 items with role + experience), budgetBreakdown (optional, 0-20 items). Export the schema and inferred TypeScript type.

---

## Phase 2: Foundational

**Purpose**: Server Action that processes form submissions — MUST be complete before UI work

- [x] T002 Create Server Action `submitProposal` in `src/app/grants/submit/actions.ts` — accepts form data, validates with ProposalFormSchema, rate-limits by IP (reuse existing Upstash limiter from `src/lib/rate-limit.ts`), sanitizes text (reuse `sanitizeProposalInput` from `src/evaluation/sanitization.ts`), hashes team profile (SHA256 of sorted role:experience pairs), pins to IPFS (reuse `pinJsonToIpfs` from `src/ipfs/pin.ts` with `ProposalContentSchema`), inserts into cache DB (reuse drizzle `proposals` table from `src/cache/schema.ts`), calls `orchestrateEvaluation` from `src/evaluation/orchestrate.ts`, returns `{ success, proposalId, detailUrl }` or `{ success: false, errors }`. Use `"use server"` directive. Set platformSource to `"web-form"`, fundingRoundId to `"open-submissions"`, externalId to the computed proposal ID.

**Checkpoint**: Server Action works — can be tested with a minimal form or curl

---

## Phase 3: User Story 1 - Submit a Grant Proposal (Priority: P1)

**Goal**: User fills a form at /grants/submit, submits, and sees it on /grants

**Independent Test**: Navigate to /grants/submit, fill all fields, submit. Proposal appears on /grants with "pending" status.

### Implementation for User Story 1

- [x] T003 [US1] Create client form component in `src/app/grants/submit/form.tsx` — `"use client"` component using `useActionState` (React 19) with the `submitProposal` action. Fields: title (input), description (textarea with character counter), category (select dropdown with options: infrastructure, education, community, research, governance), budgetAmount (number input), budgetCurrency (select: USD/ETH), technicalDescription (textarea with character counter), teamMembers (dynamic list — add/remove members, each with role input + experience textarea), budgetBreakdown (optional collapsible section with add/remove rows). Client-side validation using the shared Zod schema before submission. Show inline errors per field from both client validation and server response. Use Tailwind CSS classes matching existing grant pages.

- [x] T004 [US1] Create submission page in `src/app/grants/submit/page.tsx` — Server Component that renders the form component. Page title "Submit a Grant Proposal", brief instructions paragraph, then the form. Import and render `ProposalSubmitForm` from `./form.tsx`.

- [x] T005 [US1] Handle success state in `src/app/grants/submit/form.tsx` — when Server Action returns success, show a success banner with proposal ID and a "View Proposal" link to `/grants/[id]`. Hide the form and show the success message. Include a "Submit Another" button that resets the form.

**Checkpoint**: Full submission flow works — fill form, submit, see success, proposal visible on /grants

---

## Phase 4: User Story 2 - Form Validation and Error Handling (Priority: P1)

**Goal**: All inputs validated client-side with inline errors before server submission

**Independent Test**: Try submitting with empty fields, negative budget, short description. Each shows specific inline error.

### Implementation for User Story 2

- [x] T006 [US2] Add comprehensive client-side validation display in `src/app/grants/submit/form.tsx` — ensure every field shows its specific error message inline (below the field) when validation fails. Errors should appear on blur (when user leaves a field) AND on submit attempt. Use red text + red border styling consistent with existing error patterns. Clear field error when user starts typing in that field.

- [x] T007 [US2] Add character counters to textarea fields in `src/app/grants/submit/form.tsx` — description and technicalDescription fields show `X / 10000` character count below the field. Count turns red when approaching limit (>9500). Enforce max length in the textarea element.

**Checkpoint**: Validation catches all invalid inputs before any server call

---

## Phase 5: User Story 3 - Submission Progress and Feedback (Priority: P2)

**Goal**: User sees progress during submission and clear error messages on failure

**Independent Test**: Submit valid proposal, observe loading state. Simulate failure, see retry option.

### Implementation for User Story 3

- [x] T008 [US3] Add loading/pending state to form in `src/app/grants/submit/form.tsx` — when `useActionState` is pending: disable submit button, show spinner icon, disable all form fields. Use the `pending` state from `useActionState`.

- [x] T009 [US3] Add error recovery in `src/app/grants/submit/form.tsx` — when Server Action returns a server error (IPFS failure, DB error, rate limit), show a prominent error banner at top of form with the specific message. Include a "Try Again" button. Preserve all form field values so the user doesn't have to re-enter data.

**Checkpoint**: Users always know what's happening and can recover from errors

---

## Phase 6: User Story 4 - Navigation to Submission Form (Priority: P2)

**Goal**: "Submit Proposal" link is discoverable from /grants and home page

**Independent Test**: Visit /grants, click "Submit Proposal", arrive at /grants/submit

### Implementation for User Story 4

- [x] T010 [US4] Add "Submit Proposal" button to grants listing page header in `src/app/grants/page.tsx` — add a Link component to `/grants/submit` styled as a primary button, positioned in the header area next to the "Grant Proposals" title.

- [x] T011 [P] [US4] Update home page links in `src/app/page.tsx` — add a "Submit Proposal" link alongside the existing "View Proposals" and "Operator Dashboard" links.

**Checkpoint**: Users can discover and navigate to the submission form from any main page

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T012 Update CSP in `next.config.ts` to allow `connect-src` to `https://mainnet.base.org` (currently only allows `https://sepolia.base.org`)
- [x] T013 Verify full flow end-to-end: submit proposal → appears on /grants → click into detail page → evaluation scores visible (after AI processing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on T001 (schema)
- **Phase 3 (US1)**: Depends on T002 (server action)
- **Phase 4 (US2)**: Depends on T003 (form exists)
- **Phase 5 (US3)**: Depends on T003 (form exists)
- **Phase 6 (US4)**: Independent — can run in parallel with US1-US3
- **Phase 7 (Polish)**: Depends on all stories complete

### Parallel Opportunities

- T010 and T011 (US4 navigation) can run in parallel with any other phase
- T006 and T007 (US2 validation) can run in parallel
- T008 and T009 (US3 progress) can run in parallel

---

## Implementation Strategy

### MVP (User Stories 1+2 only)

1. T001 → T002 → T003 → T004 → T005 (working form with success state)
2. T006 → T007 (validation)
3. **STOP and VALIDATE**: Submit a proposal, verify it works

### Full Feature

4. T008 → T009 (progress/error handling)
5. T010 + T011 (navigation)
6. T012 → T013 (polish)

---

## Notes

- All tasks reuse existing infrastructure — no new dependencies needed
- The shared Zod schema (T001) is the foundation everything builds on
- Server Action (T002) does the heavy lifting — form is mostly UI
- Total: 13 tasks across 7 phases
