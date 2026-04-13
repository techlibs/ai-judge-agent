# SDD Framework Scope Comparison: What Each Worktree Actually Built

> **Date:** 2026-04-13
> **Purpose:** Practical comparison of what three SDD frameworks produced when building the same project (agent-reviewer / ARWF Judge System). Complements the theoretical analysis in [`spec-driven-frameworks-analysis.md`](./spec-driven-frameworks-analysis.md).
> **Reference architecture:** [`docs/big-reference-architecture/`](./big-reference-architecture/) defines the full ARWF vision (Milestones 1-6, Phases 1-17).

---

## 1. At a Glance

| Dimension | GSD (`full-vision-roadmap`) | Spec Kit (`speckit`) | Superpowers (`superpower`) |
|-----------|---------------------------|----------------------|---------------------------|
| **Framework** | GSD (Get Shit Done) | Spec Kit | Superpowers |
| **Approach** | Incremental milestones, plan-per-phase | Single upfront spec, all phases pre-defined | Design spec + security audit, then 4 sequential plans |
| **Phases** | 4 executed (M1) + 13 planned (M2-M6) | 9 (all complete) | 4 plans (all executed) |
| **Task count** | 9 plans across 4 phases | 94 tasks across 9 phases | ~38 tasks / 114 step-level checkboxes |
| **Custom contracts** | 0 (uses pre-deployed ERC-8004) | 6 | 3 |
| **AI framework** | Mastra + Vercel AI SDK | Mastra + Vercel AI SDK | Mastra + Vercel AI SDK |
| **Database** | SQLite (Drizzle) | SQLite/Turso (Drizzle) | SQLite (Drizzle) |
| **IPFS** | Pinata | Pinata | Pinata |
| **Chain** | Base Sepolia (viem) | Base Sepolia (viem) | Base Sepolia (viem) |

---

## 2. Per-Worktree Breakdown

### 2.1 GSD (`full-vision-roadmap`)

**Strategy:** Build the minimal proof-of-concept first (M1: "AI Judge with On-Chain Proof"), validate it works, then layer on fund management, disputes, and cross-platform integration in future milestones.

**Milestone 1 — Executed (Phases 1-3 complete, Phase 4 planned):**

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 1 | On-Chain Foundation and Proposals | 4 plans | Complete |
| 2 | AI Evaluation Pipeline | 3 plans | Complete |
| 3 | Reputation History and Querying | 1 plan | Complete |
| 4 | Visualization and Polish | 1 plan | Not executed |

**Milestones 2-6 — Planned in `ROADMAP-FULL-VISION.md`:**

| Milestone | Phases | Focus |
|-----------|--------|-------|
| M2 | 5-7 | Custom contracts, fund management, matching pool |
| M3 | 8-9 | Monitor agents, alerts |
| M4 | 10-11 | Dispute resolution, reputation consequences |
| M5 | 12-14 | Cross-platform adapters, x402 payments, reputation bridge |
| M6 | 15-17 | Auth, mainnet deployment, security audit |

**Key characteristic:** No custom Solidity. Integrates with pre-deployed ERC-8004 contracts via viem. Contracts are deferred to M2.

### 2.2 Spec Kit (`speckit`)

**Strategy:** Define the entire system upfront as a single spec (`001-arwf-judge-system`), then execute all 9 phases sequentially. Covers the full ARWF vision through reputation and disputes.

| Phase | Name | Priority | Tasks | Status |
|-------|------|----------|-------|--------|
| 1 | Setup (shared infrastructure) | -- | 8 | Complete |
| 2 | Foundational (blocking prerequisites) | CRITICAL | 12 | Complete |
| 3 | Submit and Evaluate Proposal | P1 MVP | 18 | Complete |
| 4 | Dashboard (proposals + scores) | P1 | 11 | Complete |
| 5 | On-Chain Fund Release | P2 | 7 | Complete |
| 6 | Monitor Agent Continuous Tracking | P2 | 8 | Complete |
| 7 | Dispute Resolution | P3 | 8 | Complete |
| 8 | Reputation and Portability | P3 | 12 | Complete |
| 9 | Polish and Cross-Cutting | -- | 10 | Complete |

**Key characteristic:** Most comprehensive scope. 6 custom contracts, The Graph subgraph, auth, PII sanitization, security event logging, health endpoint, CLI rebuild scripts.

### 2.3 Superpowers (`superpower`)

**Strategy:** Design spec first, run a pre-implementation security audit (43 findings), embed security requirements (F-XXX) directly into plans, then execute 4 plans with TDD (RED/GREEN cycles).

| Plan | Name | Tasks | Steps |
|------|------|-------|-------|
| 01 | Smart Contracts | 8 | 30 |
| 02 | App Foundation | 12 | 40 |
| 03 | Judge Pipeline | 7 | 20 |
| 04 | UI Pages | 11 | 24 |

**Key characteristic:** Security-first. 43-finding design audit before any code. TDD for all contracts. 3 custom contracts (Identity, Reputation, MilestoneManager). No monitor agents, disputes, or The Graph — but deeper security hardening than the other two.

---

## 3. Feature Matrix

Legend: **Y** = implemented, **P** = planned/not executed, **--** = not in scope

### 3.1 Smart Contracts

| Contract | GSD | Spec Kit | Superpowers |
|----------|-----|----------|-------------|
| IdentityRegistry (ERC-8004) | P (pre-deployed) | Y (custom) | Y (custom, soulbound) |
| ReputationRegistry (ERC-8004) | P (pre-deployed) | Y (custom) | Y (custom, 308 lines) |
| EvaluationRegistry | -- | Y (custom) | -- |
| MilestoneManager | P (M2) | Y (custom) | Y (custom, 154 lines) |
| DisputeRegistry | P (M4) | Y (custom) | -- |
| ValidationRegistry (ERC-8004) | P (M4) | Y (custom) | -- |
| **Contract total** | **0** | **6** | **3** |
| Foundry tests | -- | Y | Y (TDD, 584 lines) |
| Deployment scripts | -- | Y | Y (Base Sepolia) |

### 3.2 Proposal Flow

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| Submission form UI | Y | -- (webhook only) | Y (multi-section) |
| Webhook ingestion | -- | Y (API key + HMAC) | -- |
| IPFS pin (Pinata) | Y | Y | Y |
| On-chain registration | Y | Y | Y |
| PII sanitization | -- | Y (hash team, redact URLs, CPF, IP) | -- |
| Rate limiting | Y | Y (Upstash, 5/hr/IP) | Y (Upstash, 5/hr/IP) |

### 3.3 AI Judge Pipeline

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| 4 independent judge agents | Y | Y | Y |
| Structured output (Zod) | Y | Y | Y |
| Weighted scoring (25/30/20/25) | Y | Y | Y |
| Mastra agent framework | Y | Y | Y |
| Parallel execution | Y | Y (workflow.parallel) | Y (workflow.parallel) |
| SSE real-time progress | Y | -- (polling) | Y (4 SSE streams) |
| Anomaly detection | -- | Y (all high, all low, divergence) | -- |
| Anti-injection prompts | -- | Y (treat proposal as DATA) | Y (anti-rationalization) |
| Concurrent eval cap | -- | Y (max 10 via Redis) | -- |
| Idempotency guards | -- | Y (no duplicate IPFS/chain) | -- |
| Retry per dimension | -- | Y | Y |
| Audit trail on IPFS | Y | Y | Y |

### 3.4 Evaluation UI

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| Results page (per-dimension) | Y | Y | Y |
| Real-time progress | Y (SSE) | Y (polling) | Y (EvaluationTheater, 2x2 grid) |
| Prompt comparison (naive vs structured) | Y | -- | -- |
| Score visualization | P (Phase 4: radar chart) | Y (cards) | Y (ScoreGauge, radial SVG) |
| On-chain verification page | -- | Y (IPFS hash check) | Y (`/grants/[id]/verify`) |

### 3.5 Fund Management

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| MilestoneManager contract | P (M2, Phase 5) | Y | Y |
| Score-to-release pipeline | P (M2, Phase 6) | Y | -- (contract only) |
| Matching pool | P (M2, Phase 7) | Y | -- |
| Fund status UI | P (M2) | Y | -- |
| Emergency withdraw | -- | Y | Y |

### 3.6 Monitor Agents

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| Monitor agent framework | P (M3, Phase 8) | Y | -- |
| GitHub metrics collector | P | Y | -- |
| On-chain metrics collector | P | Y | -- |
| Social metrics collector | P | Y | -- |
| Cron scheduling | P | Y (Vercel Cron) | -- |
| Risk flags | P | Y | -- |
| Activity alerts | P (M3, Phase 9) | -- | -- |

### 3.7 Dispute Resolution

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| DisputeRegistry contract | P (M4, Phase 10) | Y | -- |
| Staking mechanism | P | Y | -- |
| Validator voting | P | Y | -- |
| Score override on overturn | P | Y | -- |
| Dispute UI | P | Y | -- |

### 3.8 Reputation

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| ReputationRegistry contract | P (pre-deployed) | Y (custom, anti-Sybil) | Y (custom, 308 lines) |
| ValidationRegistry contract | P (M4) | Y | -- |
| History UI | Y (Phase 3) | Y | -- |
| On-chain verification links | Y | Y | Y (`/verify` page) |
| Reputation multiplier | -- | Y (1 + index/10000, cap 1.05x) | -- (formula in contract) |
| Feedback write-back | -- | Y (post-evaluation) | Y (`giveFeedback()`) |

### 3.9 Auth and Security

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| Security headers (CSP, HSTS) | Y | Y | Y |
| Rate limiting | Y | Y (Upstash, per-route) | Y (Upstash) |
| Auth (user login) | -- | Y (Auth.js v5, OAuth2) | -- |
| API key validation | -- | Y (SHA-256, constant-time) | -- |
| HMAC webhook verification | -- | Y (X-Signature-256) | -- |
| PII sanitization | -- | Y (hashing, redaction) | -- |
| HTML sanitization | -- | Y (isomorphic-dompurify) | Y (isomorphic-dompurify) |
| Security event logging | -- | Y (JSON structured) | Y (structured logger) |
| Request ID middleware | -- | Y (x-request-id) | -- |
| Origin validation | -- | Y | -- |
| Pre-implementation security audit | -- | -- | Y (43 findings, F-XXX codes) |
| Contract reentrancy guard | -- | Y | Y |
| Contract pausable | -- | Y | Y |

### 3.10 Infrastructure

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| The Graph subgraph | -- | Y (all 6 contracts) | -- |
| SQLite cache (Drizzle) | Y | Y (Turso/LibSQL) | Y |
| Cache rebuild from chain | Y (design goal) | Y (CLI scripts) | Y (design goal) |
| Health endpoint | -- | Y (`/api/health`) | -- |
| Retry with exponential backoff | -- | Y (chain tx: 5 attempts) | -- |

### 3.11 UI Pages

| Page | GSD | Spec Kit | Superpowers |
|------|-----|----------|-------------|
| Grants landing / list | Y | Y (`/grants`) | Y (`/grants`) |
| Proposal detail | Y | Y (`/grants/[id]`) | Y (`/grants/[id]`) |
| Submission form | Y | -- (webhook-only) | Y (`/grants/submit`) |
| Live evaluation | Y | -- | Y (`/grants/[id]/evaluate`) |
| On-chain verification | -- | Y (via detail page) | Y (`/grants/[id]/verify`) |
| Operator dashboard | -- | Y (`/dashboard/operator`) | -- |

---

## 4. ARWF Reference Architecture Coverage

Mapped against the 6 milestones defined in `ROADMAP-FULL-VISION.md`:

| Milestone | Scope | GSD | Spec Kit | Superpowers |
|-----------|-------|-----|----------|-------------|
| **M1** — MVP Judge + On-Chain Proof | Proposals, 4 judges, IPFS, chain scores, reputation history, UI | Phases 1-3 done, Phase 4 pending | Phases 1-4 (complete) | Plans 01-04 (complete) |
| **M2** — Fund Management | MilestoneManager, fund release, matching pool | Planned (Phases 5-7) | Phase 5 (complete) | Plan 01 contract only (no pipeline) |
| **M3** — Monitor Agents | Periodic monitoring, data sources, alerts | Planned (Phases 8-9) | Phase 6 (complete) | -- |
| **M4** — Disputes + Governance | ValidationAdapter, staking, reputation consequences | Planned (Phases 10-11) | Phases 7-8 (complete) | -- |
| **M5** — Cross-Platform | Gitcoin adapter, x402, ReputationBridge | Planned (Phases 12-14) | -- | -- |
| **M6** — Auth + Production | User auth, mainnet, security audit | Planned (Phases 15-17) | Partial (auth only) | Partial (security audit only) |

**Coverage summary:**
- **GSD:** M1 (75%), M2-M6 planned but unexecuted
- **Spec Kit:** M1 (100%), M2 (partial — fund release, no matching pool bonuses for top performers), M3 (complete), M4 (complete), M5 (none), M6 (auth only)
- **Superpowers:** M1 (100%), M2 (contract only), M3 (none), M4 (none), M5 (none), M6 (security audit only)

---

## 5. Observations

### Scope vs. Depth Trade-off

Each framework made a different trade-off between breadth of features and depth of implementation:

- **Spec Kit** covered the widest scope (9 phases, 6 contracts, monitor agents, disputes, reputation portability) but with less emphasis on pre-implementation security analysis.
- **Superpowers** covered less scope (4 plans, 3 contracts, no monitor/disputes) but invested heavily in security-first development — a 43-finding design audit before writing any code, TDD for all contracts, and security requirements (F-XXX) embedded into every plan.
- **GSD** covered the narrowest scope in execution (3 complete phases, no custom contracts) but created the most comprehensive long-term plan — a full 17-phase roadmap across 6 milestones. It prioritized proving the core loop works before building deeper capabilities.

### Approach to Contracts

- **GSD** explicitly chose to use pre-deployed ERC-8004 contracts in M1, deferring custom Solidity to M2. This reduces risk and development time but means the MVP cannot customize contract behavior.
- **Spec Kit** built all 6 contracts as part of the single spec, including dispute and validation contracts that GSD defers to M4.
- **Superpowers** built 3 contracts with TDD and the deepest security analysis per contract, but skipped dispute and validation entirely.

### Planning Horizon

- **GSD** is the only framework that produced a multi-milestone roadmap (`ROADMAP-FULL-VISION.md`) mapping the path from MVP to full ARWF. The others built what they built and stopped.
- **Spec Kit** defined everything in one spec — no notion of "future milestones." What's in the spec is what gets built.
- **Superpowers** planned 4 sequential plans from a single design spec. No roadmap beyond those 4 plans.

### Security Posture

- **Superpowers** led with security — 43 findings before any code, security requirements threaded through every plan.
- **Spec Kit** built security features inline (PII sanitization, HMAC, rate limiting, auth) but without a dedicated pre-implementation audit.
- **GSD** included basic security (rate limiting, security headers) but deferred most hardening.

### What No One Built

None of the three worktrees implemented:
- Cross-platform adapters (Gitcoin, Optimism)
- x402 payment integration
- ReputationBridge (cross-platform reputation sync)
- Mainnet deployment
- Activity alerts (GSD planned this in M3 Phase 9; Spec Kit's Phase 9 is polish, not alerts)

These features represent the outer rings of the ARWF vision (Milestones 5-6) and were consistently deferred or excluded across all frameworks.

---

*See also: [Theoretical Framework Analysis](./spec-driven-frameworks-analysis.md) for weighted scoring across 13 dimensions.*
*Reference: [ARWF Technical Architecture](./big-reference-architecture/) for the full system vision.*
