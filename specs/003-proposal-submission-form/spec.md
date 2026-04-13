# Feature Specification: Proposal Submission Form

**Feature Branch**: `003-proposal-submission-form`
**Created**: 2026-04-13
**Status**: Draft
**Input**: User description: "Proposal Submission Form — A user-facing page at /grants/submit where anyone can submit a grant proposal for AI evaluation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit a Grant Proposal (Priority: P1)

A community member visits /grants/submit and fills out a form with their proposal details: title, description, category, budget, and team information. After submitting, the proposal is pinned to IPFS, stored in the local database with status "pending", and immediately visible on the /grants listing page. The AI evaluation pipeline is triggered automatically.

**Why this priority**: This is the core feature — without it, proposals can only enter via API webhook. This opens the system to any user with a browser.

**Independent Test**: Navigate to /grants/submit, fill all fields, submit. Verify the proposal appears on /grants with "pending" status and a valid IPFS CID.

**Acceptance Scenarios**:

1. **Given** a user is on /grants/submit, **When** they fill all required fields and click Submit, **Then** a success message shows with the proposal ID and a link to view it
2. **Given** a user submits a proposal, **When** the proposal is processed, **Then** it appears on /grants with status "pending" and all entered details are visible on the detail page
3. **Given** a user submits a proposal, **When** IPFS pinning completes, **Then** the proposal content CID is stored and the content is retrievable from IPFS

---

### User Story 2 - Form Validation and Error Handling (Priority: P1)

The form validates all inputs before submission: required fields cannot be empty, budget must be a positive number, description has a minimum length, and team must have at least one member. Validation errors are shown inline next to the offending field.

**Why this priority**: Without validation, users will submit garbage data that wastes AI evaluation credits. This is co-equal with the form itself.

**Independent Test**: Try submitting with empty fields, negative budget, description under 50 characters. Verify each shows a specific inline error without submitting to the server.

**Acceptance Scenarios**:

1. **Given** a user leaves the title empty, **When** they click Submit, **Then** an error appears next to the title field saying it is required
2. **Given** a user enters a budget of -100, **When** they click Submit, **Then** an error appears saying budget must be positive
3. **Given** a user enters a description under 50 characters, **When** they click Submit, **Then** an error appears saying the minimum length is 50 characters
4. **Given** all fields are valid, **When** the user clicks Submit, **Then** no validation errors appear and the form submits

---

### User Story 3 - Submission Progress and Feedback (Priority: P2)

After clicking Submit, the user sees a progress indicator showing the stages: validating, pinning to IPFS, saving, triggering evaluation. If any step fails, a clear error message explains what went wrong and how to retry.

**Why this priority**: Without progress feedback, users don't know if their submission worked, especially since IPFS pinning can take a few seconds.

**Independent Test**: Submit a valid proposal and observe the loading states. Simulate a Pinata outage and verify the error message is user-friendly.

**Acceptance Scenarios**:

1. **Given** a user clicks Submit, **When** processing begins, **Then** the submit button is disabled and a progress indicator is visible
2. **Given** IPFS pinning fails, **When** the error is returned, **Then** the user sees a message like "Failed to store proposal content. Please try again." with a retry button
3. **Given** submission succeeds, **When** the response is received, **Then** the user sees a success message with the proposal ID and a link to /grants/[id]

---

### User Story 4 - Navigate to Submission from Grants Page (Priority: P2)

A "Submit Proposal" link/button is visible on the /grants page header, making the submission form discoverable. The home page also links to it.

**Why this priority**: Users need to find the form. Without navigation, only users who know the URL can submit.

**Independent Test**: Visit /grants, click "Submit Proposal", verify it navigates to /grants/submit.

**Acceptance Scenarios**:

1. **Given** a user is on /grants, **When** they look at the page header, **Then** a "Submit Proposal" button is visible
2. **Given** a user clicks "Submit Proposal", **When** the page loads, **Then** they are on /grants/submit with an empty form

---

### Edge Cases

- What happens when a user submits a duplicate proposal (same title + description)? System should accept it — deduplication happens at evaluation time via proposal ID hashing.
- What happens when IPFS (Pinata) is down? Show a user-friendly error with retry option. Do not lose the form data.
- What happens when the database is unavailable? Show a server error. The form data should be preserved in the browser so the user can retry.
- What happens with very large descriptions (close to 10,000 character limit)? Show a character counter and enforce the limit client-side.
- What happens if the user navigates away mid-submission? No special handling needed — the form is not persisted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a form at /grants/submit with fields: title, description, category, budget amount, budget currency, technical description, team members (role + experience), and team size
- **FR-002**: System MUST validate all inputs client-side before submission: title (1-200 chars), description (50-10000 chars), technical description (50-10000 chars), budget (positive number, max 100M), category (one of: infrastructure, education, community, research, governance), team size (1-20), at least one team member
- **FR-003**: System MUST validate all inputs server-side using the same Zod schema, rejecting invalid submissions with specific error messages
- **FR-004**: System MUST pin the proposal content to IPFS via Pinata on submission, storing the resulting CID
- **FR-005**: System MUST insert the proposal into the local cache database with status "pending" and all provided fields
- **FR-006**: System MUST trigger the AI evaluation pipeline after successful submission (via the existing orchestration flow)
- **FR-007**: System MUST display a success message with the proposal ID and link to the detail page after successful submission
- **FR-008**: System MUST show inline validation errors next to the specific field that failed
- **FR-009**: System MUST show a progress indicator during submission (disable button, show loading state)
- **FR-010**: System MUST provide a "Submit Proposal" navigation link on the /grants page and home page
- **FR-011**: System MUST sanitize all text inputs to prevent XSS (using the existing sanitization utilities)
- **FR-012**: System MUST rate-limit submissions by IP address to prevent abuse (using existing Upstash rate limiter)

### Key Entities

- **Proposal**: The grant proposal submitted by the user — title, description, category, budget, team info, IPFS CID, status
- **Team Member**: A member of the proposing team — role and experience description (no PII stored — hashed into teamProfileHash)
- **Budget Breakdown**: Optional line items for the budget — category, amount, description

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a complete grant proposal in under 3 minutes
- **SC-002**: Submitted proposals appear on the /grants listing within 5 seconds
- **SC-003**: 95% of valid submissions complete successfully (IPFS pin + DB insert + evaluation trigger)
- **SC-004**: Form validation catches 100% of invalid inputs before server submission
- **SC-005**: Users receive clear feedback (success or specific error) within 10 seconds of clicking Submit

## Assumptions

- No authentication is required to submit a proposal — the form is public
- Rate limiting (existing Upstash/Redis) is sufficient to prevent spam; no CAPTCHA needed for v1
- The existing `orchestrateEvaluation()` function handles the full evaluation pipeline — the form just needs to call it with the right input shape
- Budget breakdown is optional — users can provide just a total amount
- The existing PII sanitization pipeline (redacts emails, URLs, phones, CPFs) runs on all submissions
- Team member details are hashed into `teamProfileHash` — no PII is stored in the database
- The form uses standard HTML form + React Server Actions or API route — no client-side wallet connection needed
- The `platformSource` field defaults to "web-form" for submissions via this form
- A new `fundingRoundId` will use a default value (e.g., "open-submissions") since there's no funding round selector in v1
