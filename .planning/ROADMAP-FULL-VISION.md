# Roadmap: Agent Reviewer — Full Vision

## Overview

Extended roadmap that bridges the current v1 milestone (Phases 1-4) with the full ARWF reference architecture. The v1 milestone uses **pre-deployed ERC-8004 contracts** for identity and reputation — integration only, no custom Solidity. Later phases incrementally add custom contracts, monitor agents, dispute resolution, fund management, and cross-platform integration.

**Principle:** Start with what's deployed, prove the model works, then build deeper on-chain capabilities when the use case demands them.

## Milestone 1: MVP — AI Judge with On-Chain Proof (Current)

Uses pre-deployed ERC-8004 IdentityRegistry + ReputationRegistry on Base Sepolia. No custom contracts. Integration only via viem.

> These phases are already defined in ROADMAP.md and are **not duplicated here** — this document extends from Phase 5 onward.

| Phase | Name | Status | Summary |
|-------|------|--------|---------|
| 1 | On-Chain Foundation and Proposals | Not started | Smart contracts (pre-deployed), IPFS storage, proposal submission |
| 2 | AI Evaluation Pipeline | Not started | 4 judge agents, scoring, IPFS results, on-chain score publication |
| 3 | Reputation History and Querying | Not started | Indexed reputation history, verification links |
| 4 | Visualization and Polish | Not started | Radar chart, responsive design, demo readiness |

**What this milestone proves:** The judge-evaluate-publish loop works end-to-end with real on-chain proof.

**What it doesn't have:** Fund management, disputes, monitor agents, multi-platform integration, custom contracts.

---

## Milestone 2: On-Chain Fund Management

Adds custom smart contracts for milestone-gated fund release. This is where we move from "scores on-chain" to "scores controlling money."

### Phase 5: Custom Contract Foundation
**Goal**: Deploy MilestoneManager and ProjectWalletFactory contracts on Base Sepolia
**Depends on**: Milestone 1 complete
**Requirements**: FUND-01, FUND-02, FUND-03
**Why now**: The pre-deployed ERC-8004 registries handle identity and reputation, but fund management requires custom logic — milestone definitions, conditional release, wallet ownership.

**Success Criteria:**
  1. MilestoneManager contract deployed to Base Sepolia — stores milestone definitions per project, accepts score submissions, calculates release ratios
  2. ProjectWalletFactory deploys Safe/ERC-4337 wallets per project, linked to existing ERC-8004 identity
  3. Integration tests pass: create project → register identity (existing ERC-8004) → deploy wallet → define milestones → submit score → verify release ratio
  4. All contracts audited with Foundry fuzz tests (minimum 10,000 runs per property)

**Tooling shift**: This phase introduces Foundry (forge, cast, anvil) and OpenZeppelin Contracts 5.x. Phases 1-4 skip Foundry entirely since ERC-8004 is pre-deployed.

**Key decisions:**
- MilestoneManager is a standalone contract, not extending ERC-8004 (different concern)
- ProjectWalletFactory creates Safe wallets (battle-tested) not custom wallets
- Release ratio is a pure function of score: `releaseRatio = score / 100` (can be made non-linear later)
- Fund release is a two-step process: score submission (by ARWF backend) → fund claim (by project team)

### Phase 6: Fund Release Pipeline
**Goal**: End-to-end flow from evaluation score → milestone score submission → proportional fund release
**Depends on**: Phase 5
**Requirements**: FUND-04, FUND-05, MON-02

**Success Criteria:**
  1. After Phase 2 evaluation completes, aggregate score is submitted to MilestoneManager as a milestone score
  2. Project team can claim released funds proportional to their score
  3. Unreleased funds (score < 100) remain in the project wallet, available for future milestones
  4. UI shows fund status: total allocated, released, remaining, with tx links
  5. All fund movements have on-chain audit trail

### Phase 7: Matching Pool
**Goal**: Unreleased funds flow to a MatchingPool contract that distributes bonuses to high-performing projects
**Depends on**: Phase 6
**Requirements**: FUND-06, FUND-07

**Success Criteria:**
  1. MatchingPool contract collects unreleased funds from project wallets
  2. Distribution algorithm rewards projects with scores above threshold (configurable, default 80/100)
  3. Distribution is proportional to score within the qualifying set
  4. Bonus distribution requires admin trigger (not automatic) for v2
  5. All distributions are on-chain with event logs

---

## Milestone 3: Monitor Agents and Ongoing Evaluation

Adds autonomous agents that track project progress after initial funding, producing updated scores that feed into the fund release pipeline.

### Phase 8: Monitor Agent Framework
**Goal**: Agent infrastructure for periodic project monitoring — GitHub activity, on-chain transactions, community signals
**Depends on**: Phase 6 (fund release pipeline exists to consume monitor scores)
**Requirements**: MON-01, MON-02, MON-03

**Success Criteria:**
  1. Monitor Agent framework supports pluggable data sources (GitHub API, block explorer API, social signals)
  2. Each monitor run produces a structured progress score using the same 4-dimension rubric as judge agents
  3. Monitor results are stored on IPFS with hashes on-chain (same pattern as evaluations)
  4. Monitor scores can be submitted to MilestoneManager for subsequent milestone releases
  5. Cron-based scheduling via Vercel Cron Jobs or similar

**Key decisions:**
- Monitor agents reuse the judge agent scoring schema (same 4 dimensions) for consistency
- Data sources are additive — start with GitHub only, add on-chain and social later
- Monitoring frequency is configurable per project (default: weekly)

### Phase 9: Alert System
**Goal**: Automated alerts when project activity drops below thresholds
**Depends on**: Phase 8
**Requirements**: MON-03

**Success Criteria:**
  1. Configurable activity thresholds per data source (e.g., no GitHub commits in 14 days)
  2. Alerts visible in project dashboard
  3. Alert history stored on IPFS for auditability
  4. Optional webhook/email notifications (stretch goal)

---

## Milestone 4: Dispute Resolution and Governance

Adds the dispute layer — challenges, arbitration, staking, and reputation consequences. Uses ERC-8004 ValidationRegistry.

### Phase 10: ValidationAdapter Integration
**Goal**: Connect dispute handling to ERC-8004 ValidationRegistry with staking mechanism
**Depends on**: Milestone 2 (fund management exists — disputes can block fund release)
**Requirements**: GOV-01, GOV-02

**Success Criteria:**
  1. ValidationAdapter contract deployed — wraps ERC-8004 ValidationRegistry with ARWF-specific logic
  2. Any stakeholder can challenge an evaluation by staking tokens (configurable minimum)
  3. Challenge triggers a re-evaluation by a different set of judge agents
  4. If challenge succeeds (re-evaluation differs significantly): challenger gets stake back + bonus, original score is replaced
  5. If challenge fails: challenger loses stake, original score stands
  6. Dispute outcomes are published to ReputationRegistry as separate feedback entries

**Key decisions:**
- "Significantly different" = aggregate score delta > 15 points (configurable)
- Re-evaluation uses different model temperature or different prompt variant to ensure independence
- Staking token is ETH on Base Sepolia (testnet), can be any ERC-20 on mainnet

### Phase 11: Reputation Consequences
**Goal**: Evaluation history affects future scoring weight — good judges gain influence, bad judges lose it
**Depends on**: Phase 10
**Requirements**: GOV-03

**Success Criteria:**
  1. Reputation multiplier computed from dispute history: agents whose scores are never challenged get higher weight
  2. Multiplier is stored on-chain via ReputationRegistry metadata
  3. Future evaluations weight judge scores by their reputation multiplier
  4. UI shows judge reputation alongside evaluation results

---

## Milestone 5: Cross-Platform Integration

Extends ARWF to work with external funding platforms — Gitcoin rounds, Optimism RetroPGF, independent DAOs.

### Phase 12: Platform Adapter Framework
**Goal**: Webhook-based integration allowing external platforms to submit proposals for ARWF evaluation
**Depends on**: Milestone 1 (core evaluation pipeline)
**Requirements**: PLATFORM-01, PLATFORM-02

**Success Criteria:**
  1. Generic adapter interface: receive proposal data, normalize to ARWF schema, trigger evaluation
  2. Gitcoin adapter: consume Gitcoin round proposals via API/webhook
  3. Evaluation results publishable back to source platform
  4. Each adapter is independently deployable

### Phase 13: x402 Payment Integration
**Goal**: Automated micropayments between agents, platforms, and APIs using x402 protocol
**Depends on**: Milestone 2 (fund management), Phase 12 (platform adapters)
**Requirements**: PAY-01, PAY-02

**Success Criteria:**
  1. x402 gateway configured for ARWF payment flows
  2. Milestone-gated fund release triggers x402 payment to project wallet
  3. API calls between platforms use x402 for metered billing
  4. Payment audit trail on-chain

### Phase 14: ReputationBridge
**Goal**: Bidirectional reputation sync between ARWF and external platforms
**Depends on**: Phase 12
**Requirements**: PLATFORM-03

**Success Criteria:**
  1. ReputationBridge contract syncs ARWF reputation scores to external platform registries
  2. External reputation signals (Gitcoin passport score, RetroPGF history) can be imported as context for ARWF evaluations
  3. Cross-platform reputation is portable — a project evaluated on Gitcoin carries that history into ARWF

---

## Milestone 6: Auth, Roles, and Production Hardening

### Phase 15: User Authentication
**Goal**: Add auth for proposal submitters and admin roles
**Depends on**: Milestone 1
**Requirements**: AUTH-01, AUTH-02

### Phase 16: Mainnet Deployment
**Goal**: Deploy all contracts to Base mainnet, production infrastructure
**Depends on**: Milestones 1-4 stable on testnet

### Phase 17: Security Audit
**Goal**: Professional audit of custom contracts (MilestoneManager, ProjectWalletFactory, MatchingPool, ValidationAdapter)
**Depends on**: Phase 16

---

## Dependency Graph

```
Milestone 1 (Phases 1-4): MVP with pre-deployed ERC-8004
    │
    ├── Milestone 2 (Phases 5-7): Custom contracts + fund management
    │       │
    │       ├── Milestone 3 (Phases 8-9): Monitor agents
    │       │
    │       └── Milestone 4 (Phases 10-11): Disputes + governance
    │               │
    │               └── Milestone 5 (Phases 12-14): Cross-platform
    │
    └── Milestone 6 (Phases 15-17): Auth + production
```

## Tradeoff Summary

| Decision | Current (M1) | Full Vision (M2-M5) | When to Transition |
|----------|-------------|---------------------|-------------------|
| Contracts | Pre-deployed ERC-8004 | Custom MilestoneManager, Wallets, Matching, Validation | When scores need to control fund release |
| Fund management | Off-chain / manual | On-chain milestone-gated release | When real money flows through the system |
| Disputes | None — evaluations final | Staked challenges + re-evaluation | When evaluation stakes are high enough to contest |
| Monitoring | None — one-time evaluation | Ongoing autonomous agents | When funded projects need accountability |
| Cross-platform | IPE City only | Gitcoin, Optimism, DAOs | When other platforms want ARWF evaluation |
| Payments | None | x402 automated micropayments | When inter-platform billing is needed |
| Auth | Public, no login | Roles: submitter, reviewer, admin | When proposal submission needs gating |

## v2+ Requirements (Referenced Above)

| ID | Description | Milestone |
|----|-------------|-----------|
| FUND-01 | MilestoneManager contract with milestone definitions and conditional release | M2 |
| FUND-02 | ProjectWalletFactory deploying Safe/4337 wallets per project | M2 |
| FUND-03 | Wallet linked to ERC-8004 identity | M2 |
| FUND-04 | Score-to-release pipeline: evaluation → milestone score → fund claim | M2 |
| FUND-05 | Fund status UI: allocated, released, remaining | M2 |
| FUND-06 | MatchingPool collects unreleased funds | M2 |
| FUND-07 | Bonus distribution to high-performing projects | M2 |
| MON-01 | Monitor Agents with pluggable data sources | M3 |
| MON-02 | Monitor scores feed into milestone releases | M3 |
| MON-03 | Activity alerts when thresholds breached | M3 |
| GOV-01 | Dispute resolution with staking | M4 |
| GOV-02 | ValidationAdapter for ERC-8004 ValidationRegistry | M4 |
| GOV-03 | Reputation multiplier from dispute history | M4 |
| PLATFORM-01 | Generic platform adapter interface | M5 |
| PLATFORM-02 | Gitcoin adapter | M5 |
| PLATFORM-03 | ReputationBridge for cross-platform reputation | M5 |
| PAY-01 | x402 payment gateway | M5 |
| PAY-02 | Milestone-gated x402 fund release | M5 |
| AUTH-01 | User authentication | M6 |
| AUTH-02 | Role-based access | M6 |

---

*Created: 2026-04-12*
*Scope: Phases 5-17 extending current Phases 1-4*
*This document lives in the `full-vision-roadmap` branch and does not modify the active v1 ROADMAP.md*
