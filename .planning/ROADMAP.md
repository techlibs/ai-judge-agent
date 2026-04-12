# Roadmap: Agent Reviewer

## Overview

Build an AI-powered grant evaluation system for IPE City in 4 phases: deploy smart contracts and establish the on-chain + IPFS data foundation with proposal workflow, build the AI evaluation pipeline that stores results on IPFS and publishes scores on-chain, add reputation querying and history views, then polish visualization and responsiveness. The blockchain and IPFS are the source of truth from Phase 1 — no centralized database. Each phase delivers a complete, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: On-Chain Foundation and Proposals** - Smart contracts (ERC-8004), IPFS storage, proposal submission with on-chain registration, listing, and status
- [ ] **Phase 2: AI Evaluation Pipeline** - 4 independent judge agents, scoring rubrics, real-time progress, evaluation results stored on IPFS with scores published on-chain
- [ ] **Phase 3: Reputation History and Querying** - Reputation history indexing, per-project query views, on-chain verification UI
- [ ] **Phase 4: Visualization and Polish** - Score charts, responsive design, and demo readiness

## Phase Details

### Phase 1: On-Chain Foundation and Proposals
**Goal**: Smart contracts deployed, IPFS storage configured, and users can submit grant proposals that are stored on IPFS with content hashes registered on-chain
**Depends on**: Nothing (first phase)
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, UI-04, STORE-01, STORE-03, STORE-04, CHAIN-01, CHAIN-02, CHAIN-03
**Success Criteria** (what must be TRUE):
  1. ERC-8004 IdentityRegistry and ReputationRegistry smart contracts are deployed and functional on testnet
  2. User can fill out and submit a proposal form — content is pinned to IPFS and the content hash is registered on-chain
  3. When a proposal is first submitted, the project identity is registered on-chain via IdentityRegistry
  4. User can view a list of all submitted proposals showing their status and scores
  5. User can click into any proposal to see its full details (fetched from IPFS)
  6. All pages are publicly accessible without any login or authentication
  7. If a read cache is used, it can be fully rebuilt from on-chain events and IPFS content
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — ERC-8004 smart contracts (IdentityRegistry + ReputationRegistry) with Foundry
- [ ] 01-02-PLAN.md — Next.js bootstrap, shadcn/ui, shared types/schemas, app shell
- [ ] 01-03-PLAN.md — Proposal submission flow (IPFS pin + on-chain register + form UI)
- [ ] 01-04-PLAN.md — Proposal browsing flow (on-chain read + IPFS fetch + list/detail pages)

### Phase 2: AI Evaluation Pipeline
**Goal**: Every submitted proposal receives independent AI evaluation across 4 dimensions, with results stored on IPFS, scores published on-chain, and real-time progress visible to users
**Depends on**: Phase 1
**Requirements**: EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07, EVAL-08, STORE-02, CHAIN-04, UI-01, UI-03
**Success Criteria** (what must be TRUE):
  1. After submission, 4 independent judge agents evaluate the proposal in parallel — each producing a score, justification, recommendation, and key findings
  2. User can watch evaluation progress in real-time as each judge agent completes its assessment (via SSE or polling)
  3. Evaluation results (per-judge + aggregate) are stored on IPFS with content hashes recorded on-chain
  4. Evaluation hash is published to ReputationRegistry after aggregate score is computed
  5. User can view the evaluation results page showing per-dimension breakdown with scores, justifications, recommendations, and key findings, plus the weighted aggregate score
  6. User can see a before/after comparison demonstrating naive vs structured prompt evaluation output
  7. Each evaluation stores a complete audit trail on IPFS (prompt sent, model used, raw response, parsed score, timestamp)
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Evaluation schemas, constants, prompts, and 4 judge agent functions with OpenAI structured output
- [ ] 02-02-PLAN.md — Evaluation orchestration API with SSE progress, IPFS storage, and on-chain score publication
- [ ] 02-03-PLAN.md — Evaluation UI: results page, real-time progress, dimension cards, prompt comparison

### Phase 3: Reputation History and Querying
**Goal**: Users can view on-chain reputation history per project, with indexed queries for fast access and verification links to on-chain transactions
**Depends on**: Phase 2
**Requirements**: CHAIN-05
**Success Criteria** (what must be TRUE):
  1. User can view the full reputation history for any project, showing all past evaluations with scores and timestamps
  2. Reputation data is queryable via indexed on-chain events (The Graph subgraph or read cache rebuilt from chain)
  3. Each evaluation entry links to its on-chain transaction for independent verification
**Plans**: 1 plan

Plans:
- [ ] 03-01-PLAN.md — Reputation chain reader, API route, and history UI with on-chain verification links

### Phase 4: Visualization and Polish
**Goal**: Evaluation results are visually compelling and the application works well on all devices for Demo Day
**Depends on**: Phase 2 (Phase 3 recommended but not blocking)
**Requirements**: UI-02, UI-05
**Success Criteria** (what must be TRUE):
  1. User can see a visual chart (radar or bar) showing the 4-dimension score breakdown for any evaluated proposal
  2. All pages render correctly and are usable on mobile devices
**Plans**: 1 plan
**UI hint**: yes

Plans:
- [ ] 04-01-PLAN.md — Score radar chart, summary card, and responsive design audit

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. On-Chain Foundation and Proposals | 0/4 | Planning complete | - |
| 2. AI Evaluation Pipeline | 0/3 | Planning complete | - |
| 3. Reputation History and Querying | 0/1 | Planning complete | - |
| 4. Visualization and Polish | 0/1 | Not started | - |
