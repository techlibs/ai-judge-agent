# Requirements: Agent Reviewer

**Defined:** 2026-04-12
**Core Value:** Every grant proposal gets a fair, transparent, reproducible evaluation — with scores, justifications, and on-chain proof.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Proposals

- [ ] **PROP-01**: User can submit a proposal with structured fields (title, description, team info, budget, external links)
- [ ] **PROP-02**: User can view a list of all proposals with status and aggregate scores
- [ ] **PROP-03**: Proposal status transitions through: submitted → evaluating → evaluated
- [ ] **PROP-04**: User can view full proposal details on a dedicated page

### Storage (On-Chain + IPFS)

- [ ] **STORE-01**: Proposal content stored on IPFS with content hash recorded on-chain
- [ ] **STORE-02**: Evaluation results (per-judge + aggregate) stored on IPFS with content hashes on-chain
- [ ] **STORE-03**: On-chain contract stores scores and IPFS content hashes as the canonical source of truth
- [ ] **STORE-04**: Any off-chain read cache (if used) must be fully rebuildable from on-chain events and IPFS content

### AI Evaluation

- [ ] **EVAL-01**: 4 independent Judge Agents evaluate each proposal (Tech 25%, Impact 30%, Cost 20%, Team 25%)
- [ ] **EVAL-02**: Each agent produces structured output: score (0-100), justification, recommendation (strong_approve/approve/needs_revision/reject), key findings (max 3)
- [ ] **EVAL-03**: Weighted aggregate score (S0) computed from 4 dimension scores
- [ ] **EVAL-04**: IPE City values (pro-technology, pro-freedom, pro-human-progress) embedded as evaluation context in each agent prompt
- [ ] **EVAL-05**: Structured scoring rubric with calibrated bands per dimension (0-20, 21-40, 41-60, 61-80, 81-100)
- [ ] **EVAL-06**: Evaluation audit trail stored on IPFS (prompt sent, model used, raw response, parsed score, timestamp)
- [ ] **EVAL-07**: Real-time evaluation progress visible to users (via SSE or polling from Next.js API routes)
- [ ] **EVAL-08**: Before/after prompt comparison showing naive vs structured evaluation output

### On-Chain / Reputation

- [ ] **CHAIN-01**: ERC-8004 IdentityRegistry smart contract deployed to testnet (Sepolia or Base Sepolia)
- [ ] **CHAIN-02**: ERC-8004 ReputationRegistry smart contract deployed to testnet
- [ ] **CHAIN-03**: Project identity registered on-chain when first proposal is submitted
- [ ] **CHAIN-04**: Evaluation hash published to ReputationRegistry after aggregate score computed
- [ ] **CHAIN-05**: Reputation history per project queryable from on-chain events (indexed via The Graph or read cache)

### UI / Dashboard

- [ ] **UI-01**: Evaluation results page showing per-dimension breakdown (score, justification, recommendation, key findings)
- [ ] **UI-02**: Score visualization showing dimensional breakdown (radar chart or bar chart)
- [ ] **UI-03**: Progressive "live judging" experience showing agents completing in real-time
- [ ] **UI-04**: Public access — no authentication required for any page
- [ ] **UI-05**: Responsive design (mobile-friendly via Tailwind)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Monitoring

- **MON-01**: Monitor Agents track ongoing project performance (GitHub activity, on-chain transactions)
- **MON-02**: Milestone-based score updates trigger fund release ratios
- **MON-03**: Automated alerts when project activity drops below threshold

### Payments

- **PAY-01**: x402 payment flow for fund disbursement
- **PAY-02**: Milestone-gated fund release based on monitor agent scores

### Governance

- **GOV-01**: Dispute resolution system for contested evaluations
- **GOV-02**: ERC-8004 ValidationAdapter for challenge/appeal flow
- **GOV-03**: Reputation multiplier system adjusting scores based on project history

### Auth

- **AUTH-01**: User authentication for proposal submitters
- **AUTH-02**: Role-based access (submitter, reviewer, admin)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Token-gated voting / governance | AI-driven evaluation eliminates Sybil incentive; voting adds plutocratic bias |
| Sybil resistance / identity verification | No voting means no Sybil vector; re-evaluate if community input features added |
| AI grant writing assistance | Different product (applicant-side vs evaluator-side) |
| Multi-round grant management | Product unto itself; build single-evaluation pipeline first |
| Mobile app | Web-first with responsive design covers mobile needs |
| Full reputation multiplier | Needs historical data to be meaningful; store data structure now, algorithm later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROP-01 | Phase 1 | Pending |
| PROP-02 | Phase 1 | Pending |
| PROP-03 | Phase 1 | Pending |
| PROP-04 | Phase 1 | Pending |
| STORE-01 | Phase 1 | Pending |
| STORE-02 | Phase 2 | Pending |
| STORE-03 | Phase 1 | Pending |
| STORE-04 | Phase 1 | Pending |
| EVAL-01 | Phase 2 | Pending |
| EVAL-02 | Phase 2 | Pending |
| EVAL-03 | Phase 2 | Pending |
| EVAL-04 | Phase 2 | Pending |
| EVAL-05 | Phase 2 | Pending |
| EVAL-06 | Phase 2 | Pending |
| EVAL-07 | Phase 2 | Pending |
| EVAL-08 | Phase 2 | Pending |
| CHAIN-01 | Phase 1 | Pending |
| CHAIN-02 | Phase 1 | Pending |
| CHAIN-03 | Phase 1 | Pending |
| CHAIN-04 | Phase 2 | Pending |
| CHAIN-05 | Phase 3 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 1 | Pending |
| UI-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
