# Roadmap: Agent Reviewer

## Overview

Build an AI-powered grant evaluation system for IPE City in 4 phases: establish the data foundation and proposal workflow, build the core AI evaluation pipeline with 4 independent judge agents, integrate on-chain reputation via ERC-8004, then polish visualization and responsiveness. Each phase delivers a complete, verifiable capability — proposals exist before judges evaluate them, scores exist before they go on-chain, and the full pipeline works before polish.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Proposals** - Convex schema, proposal submission, listing, and status management
- [ ] **Phase 2: AI Evaluation Pipeline** - 4 independent judge agents, scoring rubrics, real-time progress, and evaluation results
- [ ] **Phase 3: On-Chain Reputation** - ERC-8004 identity and reputation registries on testnet with score publication
- [ ] **Phase 4: Visualization and Polish** - Score charts, responsive design, and demo readiness

## Phase Details

### Phase 1: Foundation and Proposals
**Goal**: Users can submit grant proposals and browse all submissions with their current status
**Depends on**: Nothing (first phase)
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, UI-04
**Success Criteria** (what must be TRUE):
  1. User can fill out and submit a proposal form with title, description, team info, budget, and external links
  2. User can view a list of all submitted proposals showing their status and scores
  3. User can click into any proposal to see its full details on a dedicated page
  4. All pages are publicly accessible without any login or authentication
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: AI Evaluation Pipeline
**Goal**: Every submitted proposal receives independent AI evaluation across 4 dimensions with real-time progress and transparent results
**Depends on**: Phase 1
**Requirements**: EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07, EVAL-08, UI-01, UI-03
**Success Criteria** (what must be TRUE):
  1. After submission, 4 independent judge agents evaluate the proposal in parallel — each producing a score, justification, recommendation, and key findings
  2. User can watch evaluation progress in real-time as each judge agent completes its assessment
  3. User can view the evaluation results page showing per-dimension breakdown with scores, justifications, recommendations, and key findings, plus the weighted aggregate score
  4. User can see a before/after comparison demonstrating naive vs structured prompt evaluation output
  5. Each evaluation stores a complete audit trail (prompt sent, model used, raw response, parsed score, timestamp)
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: On-Chain Reputation
**Goal**: Evaluation scores are published to an on-chain reputation registry via ERC-8004, giving projects verifiable, tamper-proof evaluation records
**Depends on**: Phase 2
**Requirements**: CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04, CHAIN-05
**Success Criteria** (what must be TRUE):
  1. ERC-8004 IdentityRegistry and ReputationRegistry smart contracts are deployed and functional on testnet
  2. When a proposal is first submitted, the project identity is registered on-chain
  3. After evaluation completes, the evaluation hash is published to the ReputationRegistry with a verifiable transaction
  4. User can view the on-chain publication status and reputation history for any project
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Visualization and Polish
**Goal**: Evaluation results are visually compelling and the application works well on all devices for Demo Day
**Depends on**: Phase 2 (Phase 3 recommended but not blocking)
**Requirements**: UI-02, UI-05
**Success Criteria** (what must be TRUE):
  1. User can see a visual chart (radar or bar) showing the 4-dimension score breakdown for any evaluated proposal
  2. All pages render correctly and are usable on mobile devices
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Proposals | 0/2 | Not started | - |
| 2. AI Evaluation Pipeline | 0/3 | Not started | - |
| 3. On-Chain Reputation | 0/2 | Not started | - |
| 4. Visualization and Polish | 0/1 | Not started | - |
