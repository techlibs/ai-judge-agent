# Roadmap: IPE City Grant Evaluator Agent

## Overview

This roadmap delivers a trustless grant evaluation agent that runs on both Solana and Ethereum. The journey starts with project scaffolding and on-chain proposal contracts, builds the four specialized AI evaluation models with verifiable inference via zkML, connects everything cross-chain, and validates with comprehensive test suites and benchmarks. Each phase delivers a coherent, verifiable capability that builds toward the complete system.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Scaffolding** - Monorepo structure, Solana/Ethereum project scaffolds, dev tooling, CI pipeline
- [ ] **Phase 2: On-Chain Proposal Submission** - Smart contracts on both chains for proposal submission, IPFS content storage, auto-trigger evaluation
- [ ] **Phase 3: AI Evaluation Engine** - Four specialized ONNX models for security, fraud, impact, and alignment scoring with adversarial evaluation stance
- [ ] **Phase 4: Scoring & Reasoning System** - Weighted composite scoring, evidence-backed reasoning, deterministic evaluation, governance-configurable weights
- [ ] **Phase 5: zkML Verifiable Inference** - EZKL circuits from ONNX models, proof generation, on-chain verification on both Ethereum and Solana
- [ ] **Phase 6: Multi-Chain Orchestration** - Wormhole cross-chain sync, consistent scores across chains, end-to-end evaluation pipeline
- [ ] **Phase 7: Testing & Benchmarks** - Full test suites, evaluation benchmarks, adversarial resistance tests, cross-chain consistency validation

## Phase Details

### Phase 1: Foundation & Scaffolding
**Goal**: Developers have a working monorepo with both chain environments ready to build on
**Depends on**: Nothing (first phase)
**Requirements**: (none -- foundational infrastructure, no user-facing requirements)
**Success Criteria** (what must be TRUE):
  1. Monorepo builds successfully with Anchor (Solana) and Foundry (Ethereum) projects
  2. Local development environment runs both chain simulators (solana-test-validator, anvil)
  3. CI pipeline runs lint, build, and placeholder tests on push
**Plans:** 2 plans
Plans:
- [ ] 01-01-PLAN.md — Scaffold monorepo with Anchor and Foundry projects
- [ ] 01-02-PLAN.md — CI pipeline and Makefile for unified build/test/lint

### Phase 2: On-Chain Proposal Submission
**Goal**: Proposers can submit grant proposals on either Solana or Ethereum and track their evaluation status
**Depends on**: Phase 1
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05
**Success Criteria** (what must be TRUE):
  1. Proposer can submit a proposal (text + repo URL + demo URL) on Solana via Anchor program
  2. Proposer can submit a proposal (text + repo URL + demo URL) on Ethereum via Solidity contract
  3. Proposal content is stored on IPFS/Arweave with content hash anchored on-chain
  4. Proposer receives a unique proposal ID and can query evaluation status on-chain
  5. Submitting a proposal emits an event that triggers the evaluation pipeline
**Plans**: TBD
**UI hint**: yes

### Phase 3: AI Evaluation Engine
**Goal**: The agent can analyze proposals across all four evaluation criteria using specialized AI models
**Depends on**: Phase 1
**Requirements**: SECU-01, SECU-02, SECU-03, SECU-04, FRAD-01, FRAD-02, FRAD-03, FRAD-04, IMPT-01, IMPT-02, IMPT-03
**Success Criteria** (what must be TRUE):
  1. Security model analyzes Solidity and Anchor/Rust code for vulnerabilities and produces severity-classified findings
  2. Fraud model detects plagiarized proposals, checks code originality, verifies team legitimacy, and identifies sybil patterns
  3. Impact model evaluates ecosystem value, user benefit, technical innovation, and composability with IPE City infrastructure
  4. Alignment model scores proposals against IPE City values and integrates PULSE participation data
  5. All four models are exported as ONNX format suitable for zkML circuit conversion
**Plans**: TBD

### Phase 4: Scoring & Reasoning System
**Goal**: Every evaluation produces transparent, deterministic, evidence-backed scores with configurable weights
**Depends on**: Phase 3
**Requirements**: SCOR-01, SCOR-02, SCOR-03, SCOR-04, SCOR-05, SCOR-06, SCOR-07
**Success Criteria** (what must be TRUE):
  1. Each proposal receives individual scores (0-100) for security, legitimacy, impact, and alignment
  2. Individual scores combine into a weighted composite overall score with governance-configurable weights
  3. Every score includes structured text reasoning citing specific evidence from the proposal
  4. Evaluation adopts an adversarial stance -- challenges weak proposals, identifies gaps, stress-tests claims
  5. Same proposal with same model version produces identical scores on re-evaluation (deterministic)
**Plans**: TBD

### Phase 5: zkML Verifiable Inference
**Goal**: Every AI evaluation is cryptographically provable -- anyone can verify the model computed the scores correctly
**Depends on**: Phase 3, Phase 4
**Requirements**: ZKML-01, ZKML-02, ZKML-03, ZKML-04, ZKML-05
**Success Criteria** (what must be TRUE):
  1. ONNX models are converted to ZK circuits via EZKL and generate valid proofs
  2. Each evaluation produces a cryptographic proof verifiable by third parties
  3. Proofs verify on-chain on Ethereum via EZKL native EVM verifier
  4. Proofs verify on-chain on Solana via RISC Zero + Bonsol or equivalent Groth16 verification
  5. Model weight hashes are committed on-chain so anyone can verify which model version produced a score
**Plans**: TBD

### Phase 6: Multi-Chain Orchestration
**Goal**: Proposals submitted on either chain receive consistent evaluation results visible on both chains
**Depends on**: Phase 2, Phase 5
**Requirements**: CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04
**Success Criteria** (what must be TRUE):
  1. Solana program handles full lifecycle: proposal submission, score storage, and proof verification
  2. Ethereum contract handles full lifecycle: proposal submission, score storage, and proof verification
  3. Evaluation results synchronize between chains via Wormhole cross-chain messaging
  4. Proposers on either chain see consistent scores and rankings regardless of submission chain
**Plans**: TBD

### Phase 7: Testing & Benchmarks
**Goal**: The system is validated end-to-end with comprehensive tests and AI scoring accuracy benchmarks
**Depends on**: Phase 6
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Smart contracts on both chains have full unit test coverage (LiteSVM for Solana, Foundry for Ethereum)
  2. Integration tests verify end-to-end flow: submission -> evaluation -> scoring -> proof verification
  3. Benchmark suite validates scoring accuracy against known-good and known-bad proposals
  4. Adversarial tests confirm resistance to prompt injection, keyword stuffing, and proposal gaming
  5. Cross-chain tests verify score consistency between Solana and Ethereum deployments
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
(Phases 2 and 3 can execute in parallel after Phase 1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Scaffolding | 0/2 | Planning complete | - |
| 2. On-Chain Proposal Submission | 0/TBD | Not started | - |
| 3. AI Evaluation Engine | 0/TBD | Not started | - |
| 4. Scoring & Reasoning System | 0/TBD | Not started | - |
| 5. zkML Verifiable Inference | 0/TBD | Not started | - |
| 6. Multi-Chain Orchestration | 0/TBD | Not started | - |
| 7. Testing & Benchmarks | 0/TBD | Not started | - |
