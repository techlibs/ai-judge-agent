---
plan: 01-04
phase: 01-foundation-and-proposals
status: complete
started: 2026-04-12T23:10:00Z
completed: 2026-04-12T23:25:00Z
duration_minutes: 15
---

# Plan 01-04 Summary: Proposal Browsing Flow

## What Was Built

- **List API** (`src/app/api/proposals/route.ts`): GET endpoint reads ProjectRegistered events via viem getLogs, enriches with IPFS content and reputation scores, sorts by date
- **Detail API** (`src/app/api/proposals/[tokenId]/route.ts`): GET endpoint reads getMetadata from chain + full content from IPFS, returns 404/502 for missing/unavailable
- **Proposal content schema** (`src/lib/ipfs/schemas.ts`): Zod schema for validating IPFS proposal content
- **ProposalCard** component: Clickable card with title, truncated description, status badge, budget formatting
- **StatusBadge** component: Gray/amber/blue badges for submitted/evaluating/evaluated
- **ProposalListSkeleton**: 3-card loading skeleton
- **List page** (`/proposals`): Fetches from API, shows cards or empty state or error
- **Detail page** (`/proposals/[id]`): Full content with description/team/budget sections, external links with URL validation, IPFS CID with copy-to-clipboard, on-chain reference link
- **ProposalDetailSkeleton**: Full-page loading skeleton

## Deviations

- **HTML sanitization skipped**: `sanitizeDisplayText` and `isomorphic-dompurify` not added. React auto-escapes text content. Will add if rendering HTML is needed.
- **Error boundary skipped**: React error boundary not implemented. Error states handled via useState.
- **On-chain TX shows owner address**: txHash not stored in current API response, so detail page links to owner address on basescan instead.
- **tsconfig target updated**: ES2017 -> ES2020 for BigInt literal support (required by viem).

## Key Files

### Created
- `src/app/api/proposals/route.ts` -- List all proposals
- `src/app/api/proposals/[tokenId]/route.ts` -- Single proposal detail
- `src/lib/ipfs/schemas.ts` -- Proposal content Zod schema
- `src/components/proposals/proposal-card.tsx` -- Card component
- `src/components/proposals/proposal-status-badge.tsx` -- Status badge
- `src/components/proposals/proposal-list-skeleton.tsx` -- List skeleton
- `src/components/proposals/proposal-detail-skeleton.tsx` -- Detail skeleton
- `src/app/proposals/[id]/page.tsx` -- Detail page

### Modified
- `src/app/proposals/page.tsx` -- Now fetches from API with loading/empty/error states
- `tsconfig.json` -- Target updated to ES2020

## Self-Check: PASSED

- [x] All tasks executed
- [x] Each task committed individually (3 commits)
- [x] bun run build exits 0
- [x] npx tsc --noEmit exits 0
- [x] List API reads from on-chain events
- [x] Detail API reads from chain + IPFS
- [x] Status badges show correct colors
- [x] IPFS CID displayed with copy button
- [x] Empty state and error states implemented
- [x] Loading skeletons for both pages
