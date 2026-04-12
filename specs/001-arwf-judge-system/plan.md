# Implementation Plan: ARWF Judge System

**Branch**: `001-arwf-judge-system` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-arwf-judge-system/spec.md`

## Summary

An AI Judge system that evaluates grant proposals across four weighted dimensions (Technical Feasibility 25%, Impact Potential 30%, Cost Efficiency 20%, Team Capability 25%) using LLM-powered agents. Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable. A disposable SQLite cache (Turso) powers fast dashboard reads, rebuildable from chain events. The Graph provides decentralized indexed queries. Built with Next.js App Router on Vercel and Vercel AI SDK with Anthropic for structured LLM output.

## Technical Context

**Language/Version**: TypeScript (strict mode) on Bun >= 1.3
**Primary Dependencies**: Next.js (App Router), Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), Drizzle ORM, Auth.js v5, Tailwind CSS, shadcn/ui, Zod, viem
**Storage (3-layer)**:
  - **Source of truth**: On-chain (Base L2) for scores/state + IPFS (Pinata) for content
  - **Query layer**: The Graph subgraph for indexed chain data
  - **Read cache**: SQLite via Turso (disposable, rebuildable from chain + IPFS)
**Testing**: Vitest + MSW (API mocking) + Playwright (E2E), `@testing-library/react`
**Target Platform**: Vercel (serverless, Fluid Compute)
**Project Type**: Web3-native application (Next.js App Router + on-chain contracts)
**Performance Goals**: Evaluation within 5 minutes per proposal, 1000 proposals per funding round, dashboard loads within 2-3 seconds (via cache)
**Constraints**: PII sanitization before all LLM calls and IPFS pinning, on-chain score submissions on Base L2, TypeScript strict with zero type escapes
**Scale/Scope**: 1000 proposals per round, public dashboard + operator dashboard, 4 Judge Agent dimensions

## Data Flow

```
Browser → Next.js (Vercel) → IPFS (Pinata, pin content) → Chain (Base L2, record scores + CIDs)
                                                                    ↓
                                                        The Graph (index events)
                                                                    ↓
                                                        SQLite/Turso (materialize cache)
                                                                    ↓
                                                        Next.js reads from cache for dashboard
```

**Verification path** (anyone can do this):
1. Read score from chain
2. Fetch evaluation CID from chain
3. Download content from IPFS
4. Hash content, compare to on-chain CID
5. Verify score matches justification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Transparent Evaluation | PASS | FR-003 requires structured justifications. Justifications pinned to IPFS with CID on-chain — anyone can verify. |
| II. Specification-First | PASS | Following speckit workflow: spec.md -> plan.md -> tasks.md -> implementation. |
| III. On-Chain Accountability | PASS | Chain IS the source of truth. Scores, fund releases, reputation, disputes all on-chain. IPFS content hashes recorded on-chain for verifiability. Stronger than original plan. |
| IV. Type Safety / Zero Escapes | PASS | TypeScript strict mode, Drizzle type-inferred queries, Zod at all boundaries (webhook input, LLM output, IPFS content, chain events, cache writes). |
| V. Privacy-Preserving | PASS | PII sanitization before IPFS pinning. Only `teamProfileHash` appears in permanent storage. Raw team data never reaches IPFS or chain. |
| VI. Incremental Delivery | PASS | GSD milestone-based delivery. US1+US2 are P1; US3-US6 are P2/P3. |

**Gate result**: ALL PASS — on-chain-first architecture strengthens Principle III significantly.

### Post-Phase 1 Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Transparent Evaluation | PASS | `EvaluationContentSchema` pinned to IPFS with full reasoning chains. CID on-chain. Judge Agents are ERC-8004 identities with public reputation — anyone can audit both the evaluation AND the judge's track record. |
| II. Specification-First | PASS | research.md, data-model.md, contracts/ (5 files), quickstart.md all generated before code. |
| III. On-Chain Accountability | PASS | All evaluation data on-chain + IPFS. SQLite cache disposable/rebuildable. The Graph for decentralized queries. Full ERC-8004 compliance: IdentityRegistry (ERC-721 agents), ReputationRegistry (structured feedback), ValidationRegistry (capability verification). |
| IV. Type Safety / Zero Escapes | PASS | Zod schemas for IPFS content (including ERC-8004 agent registration JSON), chain event parsing, cache writes, and LLM output. Drizzle for type-safe SQLite queries. |
| V. Privacy-Preserving | PASS | IPFS content uses `teamProfileHash`. PII stripped before pinning. On-chain uses only hashed identifiers. |
| VI. Incremental Delivery | PASS | Three-layer architecture supports incremental: can start with cache-only, add IPFS, add chain progressively. |

## Project Structure

### Documentation (this feature)

```text
specs/001-arwf-judge-system/
├── plan.md                    # This file
├── spec.md                    # Feature specification
├── research.md                # Phase 0: technology decisions
├── data-model.md              # Phase 1: three-layer entity definitions
├── quickstart.md              # Phase 1: development setup guide
├── contracts/
│   ├── webhook-api.md         # Phase 1: HTTP API contracts
│   ├── scoring-schema.md      # Phase 1: LLM output schemas
│   ├── ipfs-schemas.md        # Phase 1: IPFS content document schemas
│   └── onchain-events.md      # Phase 1: Solidity events + Graph subgraph schema
└── tasks.md                   # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router
│   ├── grants/                   # Public dashboard (US2)
│   │   ├── page.tsx              # Proposal listing (reads from cache)
│   │   └── [id]/page.tsx         # Proposal detail (cache + IPFS verification link)
│   ├── dashboard/
│   │   └── operator/             # Protected operator routes
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── proposals/route.ts  # Proposal ingestion → IPFS → Chain
│   │   │   └── disputes/route.ts   # Dispute event listener
│   │   ├── proposals/
│   │   │   ├── route.ts            # List proposals (from cache)
│   │   │   └── [id]/route.ts       # Proposal detail (from cache)
│   │   └── sync/
│   │       └── route.ts            # Cache rebuild trigger
│   └── layout.tsx
├── ipfs/                         # IPFS interaction (Pinata)
│   ├── client.ts                 # Pinata SDK client
│   ├── pin.ts                    # Pin content and return CID
│   └── schemas.ts                # Zod schemas for IPFS documents
├── chain/                        # On-chain interaction — Base L2
│   ├── abis/                     # Contract ABIs
│   ├── contracts.ts              # Contract addresses and clients (viem)
│   ├── evaluation-registry.ts    # Submit scores + CIDs
│   ├── milestone-manager.ts      # Fund release logic
│   ├── identity-registry.ts      # ERC-8004: register/manage judge agent identities
│   ├── reputation-registry.ts    # ERC-8004: structured agent feedback
│   ├── validation-registry.ts    # ERC-8004: agent capability validation
│   └── dispute-registry.ts       # Dispute operations
├── graph/                        # The Graph integration
│   ├── client.ts                 # Graph client
│   └── queries.ts                # Subgraph queries
├── cache/                        # SQLite read cache (Turso)
│   ├── schema.ts                 # Drizzle table definitions
│   ├── client.ts                 # Turso/LibSQL client
│   ├── sync.ts                   # Rebuild cache from Graph + IPFS
│   └── queries.ts                # Dashboard query functions
├── evaluation/                   # Judge Agent system (US1)
│   ├── agents/                   # Per-dimension agent configs and prompts
│   ├── scoring.ts                # Weighted score calculation
│   ├── sanitization.ts           # PII removal before IPFS/LLM
│   └── schemas.ts                # Zod schemas for LLM output
├── monitoring/                   # Monitor Agent system (US4)
├── reputation/                   # Reputation calculation (US6)
└── lib/                          # Shared utilities
    ├── auth.ts                   # Auth.js v5 config
    └── api-key.ts                # Webhook API key validation

contracts/                        # Solidity smart contracts (Base L2)
├── src/
│   ├── EvaluationRegistry.sol
│   ├── MilestoneManager.sol
│   ├── IdentityRegistry.sol      # ERC-8004 (extends ERC-721)
│   ├── ReputationRegistry.sol    # ERC-8004 structured feedback
│   ├── ValidationRegistry.sol    # ERC-8004 capability validation
│   └── DisputeRegistry.sol
├── test/
└── subgraph/                     # The Graph subgraph definition
    ├── schema.graphql
    ├── subgraph.yaml
    └── src/mappings.ts

tests/
├── unit/                         # Vitest unit tests
├── integration/                  # Vitest + MSW integration tests
├── contract/                     # API contract tests
└── e2e/                          # Playwright E2E tests
```

**Structure Decision**: Single Next.js application with domain-organized source directories. Solidity contracts in a separate `contracts/` directory at repo root with their own toolchain (Foundry). The Graph subgraph lives alongside contracts since it maps directly to their events.

## Complexity Tracking

> No constitution violations detected. No complexity justifications needed.
> The three-layer architecture adds structural complexity but is justified by the project's core value: on-chain accountability and public verifiability.
