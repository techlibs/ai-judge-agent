# Quickstart: Proposal Submission Form

## What We're Building

A public form at `/grants/submit` where anyone can submit a grant proposal. The form collects proposal details, pins content to IPFS, stores it locally, and triggers AI evaluation — all without requiring wallet connection or authentication.

## Key Files to Create/Modify

### New Files
- `src/app/grants/submit/page.tsx` — The submission form page (Server Component with client form)
- `src/app/grants/submit/actions.ts` — Server Action for form processing
- `src/app/grants/submit/schema.ts` — Shared Zod validation schema
- `src/app/grants/submit/form.tsx` — Client component with form UI and validation

### Modified Files
- `src/app/grants/page.tsx` — Add "Submit Proposal" link in header
- `src/app/page.tsx` — Add "Submit Proposal" link

## Architecture

```
Browser (form.tsx)
  ↓ client-side Zod validation
  ↓ Server Action call
actions.ts (submitProposal)
  ↓ server-side Zod validation
  ↓ rate limit check (Upstash)
  ↓ sanitize text (existing sanitization.ts)
  ↓ hash team profile
  ↓ pin to IPFS (existing pin.ts)
  ↓ insert into cache DB
  ↓ trigger orchestrateEvaluation()
  ↓ return { proposalId, detailUrl }
Browser → redirect to /grants/[id]
```

## How to Test

```bash
bun run dev
# Navigate to http://localhost:3000/grants/submit
# Fill the form and submit
# Verify proposal appears at http://localhost:3000/grants
```
