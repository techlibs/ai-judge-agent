---
phase: 3
reviewers: [claude]
reviewed_at: 2026-04-12T00:00:00Z
plans_reviewed: [03-01-PLAN.md]
---

# Cross-AI Plan Review — Phase 3

## Claude Review

### Summary

This is a well-scoped, low-risk plan that cleanly delivers read-only on-chain integration. The single-plan structure is appropriate for the phase's narrow scope (one requirement: CHAIN-05). The research phase correctly identified that no custom contracts are needed, which dramatically reduces complexity. The plan demonstrates strong awareness of common pitfalls (BigInt serialization, feedbackHash vs txHash confusion) and addresses them explicitly. The main concerns are around sequential RPC calls that could cause latency issues, and a routing mismatch between tokenId-based API and proposal-id-based page URL.

### Strengths

- **Excellent pitfall prevention**: The plan repeatedly warns about the feedbackHash vs txHash distinction (the most likely bug in this feature). The research, the plan, and even the component docs all reinforce this.
- **Clean separation of concerns**: Chain reader (`reputation.ts`) -> Zod schemas -> API route -> UI components. Each layer has a single responsibility.
- **Zod validation at API boundary**: Consistent with CLAUDE.md conventions. Schemas are defined once and shared between API and UI type inference.
- **Cache-Control strategy is pragmatic**: `s-maxage=30, stale-while-revalidate=60` is a reasonable balance for testnet data that changes infrequently but should reflect recent evaluations.
- **Comprehensive acceptance criteria**: 40+ specific, grep-verifiable checks. This is unusually thorough and will catch regressions.
- **Threat model is proportionate**: Read-only operations, no wallet interaction, no user auth -- the threat surface is genuinely small and the plan doesn't over-engineer mitigations.
- **Empty states are specified**: Both "no evaluations" and "not registered" states are handled, which is often forgotten.
- **Accessibility attributes are specified**: `aria-label` on badges, scores, links, and the mobile `role="list"` pattern.

### Concerns

- **HIGH -- Sequential RPC calls for txHash recovery**: `getTxHashesForBlocks` makes one `getLogs` call per unique block number, sequentially. For a project with 20 evaluations across 20 blocks, that's 20 sequential RPC roundtrips. Combined with the `getBlock` calls for timestamps in `getReputationHistory` (another N calls), the total cold-load latency could be 5-10 seconds. The plan mentions batching unique blocks but doesn't batch the actual RPC calls into `Promise.all` or use `multicall`. This will be the primary UX bottleneck.

- **MEDIUM -- URL routing mismatch**: The page route is `/proposals/[id]/reputation/page.tsx` where `[id]` is described as "the on-chain tokenId / agentId." But existing proposal pages from Phase 1 use a proposal ID (likely an IPFS CID or internal identifier), not a chain tokenId. The plan needs to clarify: how does the user navigate from a proposal detail page to its reputation page? Is there a mapping from proposalId -> tokenId? If they're different identifiers, the URL design creates confusion.

- **MEDIUM -- Server Component fetching from own API route**: The reputation page (`page.tsx`) fetches from its own API route via `fetch()` with `NEXT_PUBLIC_APP_URL`. This is a known anti-pattern in Next.js App Router -- server components can call the chain reader functions directly without the HTTP roundtrip. The stated justification (benefiting from Cache-Control caching) is weak because Next.js `fetch` with `revalidate: 30` already provides ISR caching without the self-request overhead. On Vercel, this self-request may even fail during build time if the API route isn't available yet.

- **MEDIUM -- `as const` in STATUS_CONFIG types**: The `on-chain-status-badge.tsx` snippet uses `variant: "default" as const` which is an `as Type` assertion. CLAUDE.md has "zero tolerance for type escapes" including `as Type`. This should use a satisfies pattern or proper typing instead.

- **LOW -- No pagination in API route**: The plan notes "pagination at 20 entries" in the threat model (T-03-06) and the UI-SPEC mentions "Load more" at 20 entries, but the API route returns all entries with no limit/offset. The UI would need to handle client-side pagination. This is acceptable for v1 but should be noted as a gap.

- **LOW -- Missing error boundary**: If the chain reader throws an unexpected error type (not caught by the try/catch), the entire page will crash. A React Error Boundary around the reputation components would provide more graceful degradation.

- **LOW -- UI-SPEC references Convex**: The UI-SPEC still mentions "Convex `onchainPublications` table" in its scope description, even though the architecture migrated away from Convex. This stale reference won't affect implementation but could confuse future readers.

### Suggestions

- **Parallelize RPC calls**: Change `getTxHashesForBlocks` to use `Promise.all` (or `Promise.allSettled` for graceful partial failure) for the `getLogs` calls. Similarly, batch the `getBlock` calls in `getReputationHistory`. This alone could cut cold-load latency by 80%.

- **Call chain reader directly from page**: Replace the self-fetch pattern with direct function imports in the server component. Use `unstable_cache` or Next.js `cache()` + `revalidateTag()` if caching is needed.

- **Clarify tokenId <-> proposalId mapping**: Add a note or lookup step that resolves the proposal's `[id]` to its on-chain `tokenId`. If they're the same, state that explicitly. If they differ, the page needs a resolution step.

- **Fix `as const` assertions**: Use `satisfies` or a typed constant object instead of `as const` on individual properties to comply with CLAUDE.md type escape rules.

- **Add a timeout to chain read functions**: If the RPC endpoint is slow or unresponsive, the API route will hang. Add a timeout (e.g., 10s) via `AbortController` on the viem transport or a `Promise.race` wrapper.

### Risk Assessment

**Overall Risk: LOW**

This is a read-only integration with well-understood components (viem, Next.js API routes, shadcn/ui). No writes, no wallet interaction, no user auth, no custom contracts. The scope is narrow (1 requirement, 1 plan, 9 files). The main risk -- sequential RPC latency -- is a UX issue, not a correctness issue, and can be fixed post-launch with parallelization. The routing mismatch concern needs clarification during implementation but isn't blocking. The plan will achieve the phase goal of making reputation history viewable and verifiable on-chain.

---

## Consensus Summary

With only one reviewer (Claude), consensus is based on the single review.

### Agreed Strengths
- Excellent pitfall prevention around feedbackHash vs txHash distinction
- Clean layered architecture (chain reader -> Zod schemas -> API -> UI)
- Comprehensive, grep-verifiable acceptance criteria
- Proportionate threat model for read-only scope

### Agreed Concerns
- **HIGH**: Sequential RPC calls will cause latency issues -- parallelize with Promise.all
- **MEDIUM**: Server Component self-fetch anti-pattern -- call chain reader directly
- **MEDIUM**: URL routing assumes tokenId == proposalId without explicit mapping
- **MEDIUM**: `as const` assertion violates CLAUDE.md type escape rules

### Divergent Views
N/A (single reviewer)
