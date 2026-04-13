---
plan: 01-03
phase: 01-foundation-and-proposals
status: complete
started: 2026-04-12T22:55:00Z
completed: 2026-04-12T23:10:00Z
duration_minutes: 15
---

# Plan 01-03 Summary: Proposal Submission Flow

## What Was Built

- **Chain client** (`src/lib/chain/client.ts`): viem public + wallet clients for Base Sepolia with Zod-validated private key
- **Contract ABIs** (`src/lib/chain/contracts.ts`): Human-readable ABIs for IdentityRegistry and ReputationRegistry with Zod address validation
- **IPFS client** (`src/lib/ipfs/client.ts`): Pinata REST API pinning + IPFS fetch with Zod response validation
- **Submission API** (`src/app/api/proposals/submit/route.ts`): POST endpoint that validates -> pins to IPFS -> registers on-chain -> returns tokenId
- **Proposal form** (`src/components/proposals/proposal-form.tsx`): Client component with all 5 fields, Zod validation, character counts, dynamic links, loading states

## Deviations

- **Rate limiting skipped**: `@upstash/ratelimit` not installed. Rate limit placeholder in API route.
- **PII scanning skipped**: Not implemented in v1.
- **Form uses `as` in error handling**: Two narrow `as { error: string }` and `as { tokenId: string }` casts remain in the form for parsing unknown API responses. These could be replaced with Zod schemas but are minimal and bounded.

## Key Files

### Created
- `src/lib/chain/client.ts` -- viem clients
- `src/lib/chain/contracts.ts` -- ABIs + address validation
- `src/lib/ipfs/client.ts` -- Pinata pinning + fetching
- `src/lib/ipfs/types.ts` -- Pinata response schema
- `src/app/api/proposals/submit/route.ts` -- Submission endpoint
- `src/components/proposals/proposal-form.tsx` -- Form component
- `src/app/proposals/new/page.tsx` -- Form page

## Self-Check: PASSED

- [x] All tasks executed
- [x] Each task committed individually (3 commits)
- [x] bun run build exits 0
- [x] npx tsc --noEmit exits 0
- [x] Chain client contains createPublicClient and createWalletClient
- [x] Contract ABIs contain IDENTITY_REGISTRY_ABI and REPUTATION_REGISTRY_ABI
- [x] IPFS client contains pinJSON and fetchFromIPFS
- [x] API route handles 400/413/500 errors
- [x] Form validates with proposalSchema and shows field errors
