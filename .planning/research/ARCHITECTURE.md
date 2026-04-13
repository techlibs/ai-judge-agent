# Architecture Research

**Domain:** On-chain AI grant evaluation with zkML verification (Solana + Ethereum)
**Researched:** 2026-04-13
**Confidence:** MEDIUM

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROPOSAL SUBMISSION LAYER                       │
│  ┌──────────────────┐              ┌──────────────────┐             │
│  │ Solana Anchor     │              │ Ethereum Solidity │             │
│  │ Proposal Program  │              │ Proposal Contract │             │
│  └────────┬─────────┘              └────────┬─────────┘             │
│           │                                  │                      │
├───────────┴──────────────────────────────────┴──────────────────────┤
│                     OFF-CHAIN EVALUATION LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Event         │  │ AI Scoring   │  │ zkML Proof Generation    │  │
│  │ Listener      │→ │ Pipeline     │→ │ (EZKL / RISC Zero)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│           │                                  │                      │
├───────────┴──────────────────────────────────┴──────────────────────┤
│                     VERIFICATION & SCORING LAYER                    │
│  ┌──────────────────┐              ┌──────────────────┐             │
│  │ Solana Verifier   │              │ Ethereum Verifier │             │
│  │ (Bonsol/Groth16)  │              │ (EZKL EVM)        │             │
│  └────────┬─────────┘              └────────┬─────────┘             │
│           │                                  │                      │
├───────────┴──────────────────────────────────┴──────────────────────┤
│                     STORAGE LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ On-chain      │  │ Arweave      │  │ Cross-chain State        │  │
│  │ Score Records │  │ (proposals,  │  │ (Wormhole messaging)     │  │
│  │ + Proof Refs  │  │  reasoning)  │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Solana Proposal Program | Accept proposal submissions, emit events, store proposal metadata | Anchor program with PDAs for proposals |
| Ethereum Proposal Contract | Accept proposal submissions, emit events, store proposal metadata | Solidity contract with proposal struct mapping |
| Event Listener | Watch both chains for new proposals, trigger evaluation pipeline | Off-chain service (Node.js/Rust) polling or WebSocket |
| AI Scoring Pipeline | Fetch proposal data, run multi-criteria evaluation, produce scores | Python service with ONNX model(s) for each criterion |
| zkML Proof Generator | Generate ZK proof that AI inference was computed correctly | EZKL (Ethereum) + RISC Zero via Bonsol (Solana) |
| Solana Verifier | Verify Groth16 proofs on-chain, record verified scores | Bonsol relay program (~200k compute units) |
| Ethereum Verifier | Verify SNARK proofs on-chain, record verified scores | EZKL-generated EVM verifier contract |
| Arweave Storage | Store full proposal text, reasoning, and detailed reports permanently | Arweave via Bundlr/Irys SDK |
| Cross-chain State Sync | Synchronize proposal status and scores between Solana and Ethereum | Wormhole cross-chain messaging |

## Recommended Project Structure

```
ipe-grant-evaluator/
├── programs/                    # On-chain programs
│   ├── solana/                  # Anchor workspace
│   │   ├── proposal/            # Proposal submission program
│   │   └── verifier/            # Score verification (Bonsol integration)
│   └── ethereum/                # Hardhat/Foundry workspace
│       ├── contracts/
│       │   ├── ProposalRegistry.sol
│       │   ├── ScoreVerifier.sol    # EZKL-generated verifier
│       │   └── CrossChainSync.sol   # Wormhole integration
│       └── test/
├── evaluator/                   # Off-chain AI evaluation service
│   ├── models/                  # ONNX model files
│   │   ├── security_scorer.onnx
│   │   ├── legitimacy_scorer.onnx
│   │   ├── impact_scorer.onnx
│   │   └── alignment_scorer.onnx
│   ├── pipeline/                # Evaluation orchestration
│   │   ├── fetcher.py           # Fetch proposal + repo + demo data
│   │   ├── preprocessor.py      # Normalize inputs for models
│   │   ├── scorer.py            # Run inference across criteria
│   │   └── aggregator.py        # Weighted composite scoring
│   ├── proofs/                  # zkML proof generation
│   │   ├── ezkl_prover.py       # EZKL proof generation for Ethereum
│   │   └── risc0_prover.py      # RISC Zero proof for Solana via Bonsol
│   └── listeners/               # Chain event listeners
│       ├── solana_listener.py
│       └── ethereum_listener.py
├── storage/                     # Off-chain storage integration
│   └── arweave.py               # Arweave upload for proposals + reasoning
├── cross-chain/                 # Cross-chain messaging
│   └── wormhole.py              # Score sync between chains
├── benchmarks/                  # AI scoring quality tests
│   ├── known_good_proposals/
│   ├── known_bad_proposals/
│   └── scoring_accuracy.py
└── tests/                       # Integration tests
    ├── solana/
    ├── ethereum/
    └── e2e/
```

### Structure Rationale

- **programs/**: Separates on-chain code by chain. Each chain has its own build tooling (Anchor vs Hardhat/Foundry), so they need separate workspaces.
- **evaluator/**: The core AI pipeline is chain-agnostic. Models, scoring logic, and proof generation are independent of which chain submitted the proposal.
- **cross-chain/**: Isolated because cross-chain messaging is its own complexity domain and can be developed/tested independently.
- **benchmarks/**: Dedicated folder because AI scoring quality is a first-class concern -- not just code correctness but evaluation accuracy.

## Architectural Patterns

### Pattern 1: Off-chain Compute, On-chain Verify

**What:** All AI inference and proof generation happens off-chain. Only compact proofs and final scores are submitted on-chain for verification and permanent record.
**When to use:** Always -- this is the fundamental zkML pattern. On-chain compute is too expensive and limited for ML inference.
**Trade-offs:** Requires a trusted or decentralized off-chain operator to run inference. The ZK proof guarantees correct computation but not liveness (the operator could refuse to evaluate). Mitigate with multiple operators or a relay network.

**Flow:**
```
Proposal submitted on-chain
    → Event emitted
    → Off-chain listener detects event
    → Fetches proposal data (text from Arweave, repo from GitHub, demo URL)
    → Runs ONNX model inference
    → Generates zkML proof of inference
    → Submits proof + scores back on-chain
    → On-chain verifier validates proof
    → Scores recorded as verified
```

### Pattern 2: Criterion-Specific Models (Not One Monolith)

**What:** Use separate, small ML models for each evaluation criterion (security, legitimacy, impact, alignment) rather than one large model that scores everything.
**When to use:** When zkML proof generation time and circuit size are constraints -- which they are.
**Trade-offs:** Multiple smaller proofs are faster to generate than one large proof. Each model can be independently updated. But you need an on-chain aggregation step to compute the weighted composite score. The aggregation itself can be done on-chain (simple arithmetic) or proven as a separate circuit.

**Rationale:**
- EZKL proof generation for small models (few-layer CNNs, gradient boosting, small transformers under 100M params) takes seconds to low minutes
- Large models (1B+ params) have proof generation times measured in hours -- not viable
- Each criterion model can be a focused classifier/regressor: security score (0-100), legitimacy score (0-100), etc.
- Weighted composite: `total = w1*security + w2*legitimacy + w3*impact + w4*alignment`

### Pattern 3: Content-Addressable Proposal Storage

**What:** Store proposal content on Arweave (permanent, content-addressable), store only the content hash on-chain alongside the proposal ID.
**When to use:** Always for large data (proposal text, code analysis results, evaluation reasoning).
**Trade-offs:** Adds Arweave as a dependency. Content is permanent (cannot be deleted -- feature, not bug, for grant transparency). Lookup requires an off-chain index or the Arweave transaction ID stored on-chain.

**Solana example:**
```rust
#[account]
pub struct Proposal {
    pub proposer: Pubkey,
    pub arweave_tx_id: [u8; 43],    // Arweave transaction ID
    pub repo_url_hash: [u8; 32],     // SHA256 of repo URL
    pub demo_url_hash: [u8; 32],     // SHA256 of demo URL
    pub status: ProposalStatus,
    pub submitted_at: i64,
    pub scores: Option<VerifiedScores>,
}

#[account]
pub struct VerifiedScores {
    pub security_score: u8,          // 0-100
    pub legitimacy_score: u8,        // 0-100
    pub impact_score: u8,            // 0-100
    pub alignment_score: u8,         // 0-100
    pub composite_score: u8,         // Weighted aggregate
    pub proof_verified: bool,
    pub reasoning_arweave_tx: [u8; 43],
    pub evaluated_at: i64,
}
```

## Data Flow

### Complete Proposal-to-Score Flow

```
SUBMISSION:
  Proposer
      ↓ (submits text + repo URL + demo URL)
  Arweave ← full proposal text stored permanently
      ↓ (returns arweave_tx_id)
  On-chain Program (Solana or Ethereum)
      ↓ (stores proposal record with arweave_tx_id, emits NewProposal event)

EVALUATION:
  Event Listener (watches both chains)
      ↓ (detects NewProposal)
  Data Fetcher
      ↓ (pulls proposal text from Arweave, clones repo, checks demo)
  Preprocessor
      ↓ (normalizes inputs into model-ready format)
  Scoring Pipeline (runs 4 ONNX models in parallel)
      ├→ Security Model → security_score + reasoning
      ├→ Legitimacy Model → legitimacy_score + reasoning
      ├→ Impact Model → impact_score + reasoning
      └→ Alignment Model → alignment_score + reasoning
      ↓
  Aggregator
      ↓ (weighted composite: w1*sec + w2*leg + w3*imp + w4*ali)
  Reasoning Packager
      ↓ (bundles all reasoning into structured report)
  Arweave ← detailed reasoning report stored permanently

PROOF GENERATION:
  zkML Prover (runs per-model proofs)
      ├→ EZKL prover (for Ethereum verification)
      │   ↓ (ONNX → circuit → witness → Halo2 proof → Groth16 SNARK)
      └→ RISC Zero prover (for Solana verification via Bonsol)
          ↓ (RISC-V guest → STARK → Groth16 SNARK)

VERIFICATION:
  Ethereum: ScoreVerifier.sol receives proof → EZKL verifier validates → scores stored
  Solana: Bonsol relay receives proof → Groth16 verifier validates (~200k CU) → scores stored

CROSS-CHAIN SYNC:
  Wormhole Message: source chain emits verified score → guardian attestation → destination chain records
```

### Key Data Flows

1. **Proposal Ingestion:** Proposer uploads to Arweave first, then submits on-chain with the Arweave TX ID. This ensures data availability before evaluation begins.
2. **Parallel Criterion Evaluation:** The four scoring models run independently and in parallel. No criterion depends on another's output. This is intentional -- it enables parallel proof generation too.
3. **Dual Proof Path:** The same model inference produces two different proof formats. EZKL for EVM verification. RISC Zero for Solana verification. The underlying computation is identical; only the proof system differs.
4. **Score Publication:** Scores go on-chain on the originating chain first, then sync to the other chain via Wormhole. The originating chain is the source of truth.

## Critical Architecture Decision: zkML Framework Split

This is the most consequential architecture decision in the project.

**Problem:** No single zkML framework supports both Solana and Ethereum verification natively.

| Framework | Ethereum Verification | Solana Verification | Model Format | Maturity |
|-----------|----------------------|--------------------|--------------|---------| 
| EZKL | Native (EVM verifier contract) | Not supported | ONNX | Production-ready for small models |
| RISC Zero + Bonsol | Supported (EVM relay) | Native via Bonsol (~200k CU) | Arbitrary Rust code | Production-ready |

**Decision: Use RISC Zero + Bonsol as the primary framework.**

**Rationale:**
- Bonsol provides native Solana verification at ~200k compute units -- efficient and composable
- RISC Zero also supports EVM verification, so one proof system covers both chains
- RISC Zero's zkVM runs arbitrary Rust code, not just ONNX models -- this means the evaluation logic (data fetching, preprocessing, scoring, aggregation) can all be proven as a single program
- EZKL is more mature for pure ONNX model proving, but its lack of Solana support is a dealbreaker for this project
- Trade-off: RISC Zero proofs for ML are less optimized than EZKL's specialized circuits, so proof generation will be slower. Mitigated by using small, focused models

**Fallback option:** If RISC Zero proves too slow for ML model proving, use a hybrid: EZKL for Ethereum-side verification and RISC Zero for Solana-side verification, with the same underlying model but two separate proof generation paths. This doubles proving infrastructure but may be necessary.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-50 proposals/month | Single evaluator node, sequential processing, manual monitoring |
| 50-500 proposals/month | Queue-based processing (Redis/BullMQ), parallel model inference, dedicated GPU for proof generation |
| 500+ proposals/month | Multiple evaluator nodes, proof generation via Bonsai (RISC Zero's cloud proving service), batch Wormhole messages |

### Scaling Priorities

1. **First bottleneck: Proof generation time.** zkML proof generation is the slowest step (seconds to minutes per model, per proposal). At scale, use RISC Zero's Bonsai cloud proving service to parallelize proof generation across their prover network.
2. **Second bottleneck: Cross-chain sync latency.** Wormhole messages have finality delay. At scale, batch score publications and sync periodically rather than per-proposal.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Evaluation Model

**What people do:** Build one large model that takes all proposal data and outputs all scores at once.
**Why it's wrong:** Large models produce enormous ZK circuits. Proof generation becomes hours-long or infeasible. A single model failure blocks all scoring. Updates to one criterion require retraining and re-deploying the entire model.
**Do this instead:** Separate models per criterion. Each generates its own proof. Aggregation is simple arithmetic done on-chain or as a trivial proof.

### Anti-Pattern 2: Storing Full Proposal Data On-chain

**What people do:** Put the entire proposal text, code analysis, and reasoning in on-chain accounts.
**Why it's wrong:** Solana accounts are expensive (~0.00089 SOL per byte per epoch for rent). Ethereum calldata/storage is even more expensive. A single proposal with reasoning could be 50KB+.
**Do this instead:** Store content on Arweave (one-time fee, permanent). Store only the content hash and Arweave TX ID on-chain.

### Anti-Pattern 3: Synchronous Cross-chain Score Mirroring

**What people do:** Wait for the score to be verified on both chains before considering evaluation complete.
**Why it's wrong:** Cross-chain messaging has variable latency (seconds to minutes). Coupling both chains means the slower chain dictates system responsiveness. Guardian network issues on Wormhole can block the entire system.
**Do this instead:** Score is final on the originating chain immediately upon proof verification. Cross-chain sync is async and eventually consistent. The originating chain is the source of truth; the mirror chain receives scores on a best-effort basis.

### Anti-Pattern 4: Proving LLM Inference Directly

**What people do:** Try to prove a full LLM (GPT-4, Claude, etc.) inference in a ZK circuit for the "reasoning" output.
**Why it's wrong:** LLMs with billions of parameters cannot be proven in any reasonable time with current zkML technology. Even 1B parameter models are at the edge of feasibility.
**Do this instead:** Use small, specialized models (gradient boosting, small transformers, classifiers) for scoring. Generate the detailed reasoning using an LLM off-chain without ZK proof. Store the reasoning on Arweave. The ZK proof covers the numerical scores only -- the reasoning is supplementary, not cryptographically verified.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Arweave (via Irys/Bundlr) | SDK upload before on-chain submission | One-time payment for permanent storage. ~$0.001 per KB |
| Wormhole | Solidity + Anchor integration via relayer SDK | 19-guardian security model. Sub-second messaging. Handles Solana-Ethereum natively |
| Bonsai (RISC Zero cloud proving) | REST API for proof generation requests | Optional -- can self-host provers. Useful for scaling |
| GitHub API | REST API to clone/analyze proposal repos | Rate limits apply. Cache repo analysis results |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| On-chain programs <-> Event Listener | Chain events (logs/events) via RPC | Listener must handle reorgs on Ethereum, missed slots on Solana |
| Event Listener <-> Scoring Pipeline | Message queue (Redis/BullMQ) | Decouples chain watching from evaluation. Enables retry on failure |
| Scoring Pipeline <-> Proof Generator | Direct function call or queue | Proof generation is the bottleneck. Queue enables backpressure |
| Proof Generator <-> On-chain Verifier | Transaction submission | Must handle transaction failures and retry with higher priority fees |
| Score Verifier (Chain A) <-> Score Mirror (Chain B) | Wormhole VAA (Verified Action Approval) | Async. Eventually consistent. Chain A is source of truth |

## Build Order (Dependencies)

The architecture has clear dependency chains that dictate build order:

```
Phase 1: Foundation
  ├── Solana Proposal Program (Anchor)
  ├── Ethereum Proposal Contract (Solidity)
  └── Arweave storage integration
       (No dependencies on each other -- can build in parallel)

Phase 2: AI Evaluation Pipeline
  ├── Data fetcher (depends on: Arweave integration for reading proposals)
  ├── Scoring models (depends on: model training with benchmark data)
  └── Evaluation orchestrator (depends on: fetcher + models)

Phase 3: zkML Proof System
  ├── RISC Zero guest program for scoring (depends on: scoring models finalized)
  ├── Bonsol integration for Solana verification (depends on: RISC Zero guest)
  └── EVM verifier deployment (depends on: RISC Zero guest or EZKL circuit)

Phase 4: Score Publication
  ├── On-chain score recording (depends on: verifier programs from Phase 3)
  └── Event-driven pipeline connecting listener → scorer → prover → verifier
       (depends on: all of Phase 1-3)

Phase 5: Cross-chain Sync
  └── Wormhole integration (depends on: both chains having score contracts from Phase 4)

Phase 6: Hardening
  ├── AI scoring benchmarks (depends on: pipeline from Phase 4)
  ├── Adversarial testing (depends on: full pipeline)
  └── Multi-operator support (depends on: full pipeline)
```

**Key dependency insight:** The AI models and the ZK proof system are the critical path. Everything else (proposal submission, storage, cross-chain sync) is standard Web3 infrastructure. The novel and risky work is in Phase 2-3: making ML models that produce meaningful scores AND can be proven in zero knowledge within reasonable time constraints.

## Sources

- [EZKL Documentation](https://docs.ezkl.xyz/getting-started/) - zkML proving framework workflow
- [EZKL GitHub](https://github.com/zkonduit/ezkl) - ONNX to ZK-SNARK engine
- [Bonsol Documentation](https://bonsol.sh/docs/explanation/what-is-bonsol) - ZK co-processor for Solana using RISC Zero
- [RISC Zero GitHub](https://github.com/risc0/risc0) - General-purpose zkVM
- [risc0-solana](https://github.com/boundless-xyz/risc0-solana) - Solana verifier for RISC Zero proofs
- [The Definitive Guide to ZKML (2025)](https://blog.icme.io/the-definitive-guide-to-zkml-2025/) - zkML ecosystem overview
- [Wormhole Cross-Chain Messaging](https://app.blockworksresearch.com/unlocked/wormhole-cross-chain-messaging-layer) - Cross-chain protocol
- [zkML Tradeoffs in Accuracy vs Proving Cost](https://np.engineering/posts/zkml-tradeoffs/) - Model size and proof constraints
- [EZKL Benchmarks](https://blog.ezkl.xyz/post/benchmarks/) - Proving time benchmarks
- [Survey of ZK-Based Verifiable ML](https://arxiv.org/html/2502.18535) - Academic survey

---
*Architecture research for: IPE City Grant Evaluator Agent*
*Researched: 2026-04-13*
