# Requirements: IPE City Grant Evaluator Agent

**Defined:** 2026-04-13
**Core Value:** Trustless, transparent, and verifiable grant evaluation — every score can be cryptographically proven to have been computed correctly by the AI model

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Proposal Submission

- [ ] **PROP-01**: Proposer can submit a grant proposal on-chain containing text description, code repository URL, and demo URL
- [ ] **PROP-02**: Proposal content is stored on IPFS/Arweave with content hash anchored on-chain
- [ ] **PROP-03**: Proposals can be submitted on both Solana (Anchor program) and Ethereum (Solidity contract)
- [ ] **PROP-04**: Evaluation triggers automatically when a proposal is submitted on-chain
- [ ] **PROP-05**: Proposer receives a unique proposal ID and can track evaluation status on-chain

### Scoring System

- [ ] **SCOR-01**: Each proposal receives individual scores (0-100) across 4 weighted criteria: security, legitimacy, impact, and IPE City alignment
- [ ] **SCOR-02**: Individual criterion scores are combined into a weighted composite overall score (0-100)
- [ ] **SCOR-03**: Each criterion score includes structured text reasoning with specific evidence citations from the proposal
- [ ] **SCOR-04**: Criterion weights are governance-configurable via on-chain voting/multi-sig
- [ ] **SCOR-05**: Evaluation adopts an adversarial stance — actively challenges weak proposals, identifies gaps, and stress-tests claims rather than validating them
- [ ] **SCOR-06**: Every score assertion references specific proposal content as evidence (evidence floors — no unsubstantiated claims)
- [ ] **SCOR-07**: Same proposal produces the same scores on re-evaluation (deterministic — pinned model version, fixed seed)

### Smart Contract Security Analysis

- [ ] **SECU-01**: Agent analyzes submitted code for common vulnerabilities (reentrancy, access control, integer overflow, unchecked external calls)
- [ ] **SECU-02**: Agent supports security analysis for both Solidity and Anchor/Rust codebases
- [ ] **SECU-03**: Security analysis produces a severity-classified list of findings (critical, high, medium, low, informational)
- [ ] **SECU-04**: Security score reflects the quantity and severity of identified vulnerabilities

### Anti-Fraud & Legitimacy

- [ ] **FRAD-01**: Agent detects plagiarized proposals via semantic similarity against known proposal corpus
- [ ] **FRAD-02**: Agent checks code originality by analyzing git history, commit patterns, and repository age
- [ ] **FRAD-03**: Agent verifies team legitimacy through on-chain wallet history and GitHub activity analysis
- [ ] **FRAD-04**: Agent detects sybil patterns (multiple submissions from related wallets, identical content variations)

### Impact & Alignment

- [ ] **IMPT-01**: Agent evaluates projected ecosystem impact: user benefit, technical innovation, composability with existing IPE City infrastructure
- [ ] **IMPT-02**: Agent scores alignment with IPE City values: pro-technological innovation, pro-freedom, pro-human progress, startup society mission
- [ ] **IMPT-03**: Agent integrates PULSE participation data into alignment scoring (contribution history, participation rate, credential tier)

### Verifiable Inference (zkML)

- [ ] **ZKML-01**: AI evaluation models are exported as ONNX and converted to ZK circuits via EZKL
- [ ] **ZKML-02**: Each evaluation produces a cryptographic proof that the AI model computed the scores correctly
- [ ] **ZKML-03**: Proofs are verified on-chain on Ethereum via EZKL's native EVM verifier
- [ ] **ZKML-04**: Proofs are verified on-chain on Solana via RISC Zero + Bonsol or equivalent Groth16 verification
- [ ] **ZKML-05**: Model weights are committed on-chain (hash) so anyone can verify which model version produced a given score

### Multi-Chain

- [ ] **CHAIN-01**: Solana program (Anchor) handles proposal submission, score storage, and proof verification
- [ ] **CHAIN-02**: Ethereum contract (Solidity) handles proposal submission, score storage, and proof verification
- [ ] **CHAIN-03**: Evaluation results are synchronized between chains via Wormhole cross-chain messaging
- [ ] **CHAIN-04**: Proposers on either chain see consistent scores and rankings

### Testing

- [ ] **TEST-01**: Smart contracts have full unit test coverage (Solana via LiteSVM, Ethereum via Foundry)
- [ ] **TEST-02**: Integration tests verify end-to-end flow: proposal submission → evaluation → score publication → proof verification
- [ ] **TEST-03**: AI evaluation benchmark suite tests scoring accuracy against known-good and known-bad proposals
- [ ] **TEST-04**: Adversarial test suite validates resistance to prompt injection, keyword stuffing, and proposal gaming
- [ ] **TEST-05**: Cross-chain tests verify score consistency between Solana and Ethereum deployments

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Reputation & History

- **REPR-01**: Agent factors proposer on-chain reputation (credential tier, past grant outcomes) into scoring
- **REPR-02**: Cross-proposal duplicate detection across evaluation rounds
- **REPR-03**: Multi-round evaluation — proposals re-scored after milestone completion

### Governance & Disputes

- **GOVR-01**: Decentralized appeal/dispute mechanism for contested scores (Kleros-style)
- **GOVR-02**: Historical scoring analytics dashboard for governance transparency
- **GOVR-03**: Automated weight optimization based on funded proposal outcomes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Human-in-the-loop score override | Defeats trustless verifiability — the core value proposition |
| Token distribution / payment execution | Mixing evaluation with disbursement creates catastrophic security risk |
| General-purpose DAO grant platform | Premature generalization kills focus — build for IPE City first |
| Off-chain AI with oracle bridge | Defeats verifiability — oracle = trust assumption |
| LLM fine-tuning on historical grants | Encodes historical bias, breaks zkML circuits on model change |
| Real-time chat with evaluator | Scope creep, not verifiable via zkML, opens gaming vector |
| Video/screenshot demo evaluation | Models too large for zkML (10B+ params vs 50M limit) |
| Mobile app | Web-first, on-chain interaction via standard wallets |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROP-01 | Phase 2 | Pending |
| PROP-02 | Phase 2 | Pending |
| PROP-03 | Phase 2 | Pending |
| PROP-04 | Phase 2 | Pending |
| PROP-05 | Phase 2 | Pending |
| SCOR-01 | Phase 4 | Pending |
| SCOR-02 | Phase 4 | Pending |
| SCOR-03 | Phase 4 | Pending |
| SCOR-04 | Phase 4 | Pending |
| SCOR-05 | Phase 4 | Pending |
| SCOR-06 | Phase 4 | Pending |
| SCOR-07 | Phase 4 | Pending |
| SECU-01 | Phase 3 | Pending |
| SECU-02 | Phase 3 | Pending |
| SECU-03 | Phase 3 | Pending |
| SECU-04 | Phase 3 | Pending |
| FRAD-01 | Phase 3 | Pending |
| FRAD-02 | Phase 3 | Pending |
| FRAD-03 | Phase 3 | Pending |
| FRAD-04 | Phase 3 | Pending |
| IMPT-01 | Phase 3 | Pending |
| IMPT-02 | Phase 3 | Pending |
| IMPT-03 | Phase 3 | Pending |
| ZKML-01 | Phase 5 | Pending |
| ZKML-02 | Phase 5 | Pending |
| ZKML-03 | Phase 5 | Pending |
| ZKML-04 | Phase 5 | Pending |
| ZKML-05 | Phase 5 | Pending |
| CHAIN-01 | Phase 6 | Pending |
| CHAIN-02 | Phase 6 | Pending |
| CHAIN-03 | Phase 6 | Pending |
| CHAIN-04 | Phase 6 | Pending |
| TEST-01 | Phase 7 | Pending |
| TEST-02 | Phase 7 | Pending |
| TEST-03 | Phase 7 | Pending |
| TEST-04 | Phase 7 | Pending |
| TEST-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap creation*
