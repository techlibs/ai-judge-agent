# Feature Research

**Domain:** On-chain AI grant evaluation / automated proposal judging
**Researched:** 2026-04-13
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features that grant proposers and IPE City governance expect from any credible automated evaluation system. Missing these means the system is not taken seriously.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| On-chain proposal submission | Proposers need a clear submission flow (text + repo URL + demo URL). Without this, there is no system. | MEDIUM | Multi-field input stored on-chain or hash-anchored. Solana account size limits and Ethereum calldata costs constrain on-chain storage -- use IPFS/Arweave for content, store CID on-chain. |
| Weighted composite scoring | Grant evaluation without transparent, multi-criterion scoring is just vibes. Every credible grant program (Gitcoin, Arbitrum, Optimism) uses explicit criteria. | MEDIUM | Define N criteria, each with a weight. Overall score = weighted sum. Weights must be governance-configurable, not hardcoded. |
| Per-criterion scores with reasoning | A single number is opaque and untrustable. Proposers and governance need to see WHY each score was given. ERC guidelines (March 2026) emphasize explainability. | HIGH | LLM generates structured reasoning per criterion. Reasoning stored alongside scores (on-chain or hash-anchored). This is the most token-intensive part of inference. |
| Smart contract security analysis | IPE City proposals include code. Evaluating a blockchain grant without checking for reentrancy, access control flaws, and known vulnerability patterns is negligent. AI audit tools (Sherlock AI, AuditBase, ChainGPT Auditor) set the bar. | HIGH | Integrate or build static analysis + LLM reasoning. Must handle both Solidity and Anchor/Rust. AI catches 70-85% of common vulns; sufficient for scoring, not for production audit. |
| Anti-fraud / legitimacy checks | Sybil attacks, plagiarized proposals, and fake teams are endemic in Web3 grants. Gitcoin's Fraud Detection workstream and Human Passport exist precisely because this is a real problem. | HIGH | Check for: plagiarism (semantic similarity to known proposals), code originality (git history analysis), team legitimacy (on-chain history, GitHub activity), Sybil patterns. |
| Transparent scoring criteria publication | If evaluators (human or AI) use hidden criteria, the system has no legitimacy. Every major grant program publishes rubrics. | LOW | Publish criteria and weights on-chain or in docs. This is a governance/UX feature, not a technical challenge. |
| Deterministic re-evaluation | Same proposal should produce same (or very similar) score on re-run. Non-determinism erodes trust. | MEDIUM | Pin model version, use temperature=0 or near-zero, seed the inference. zkML inherently provides this since the proof locks the computation. |

### Differentiators (Competitive Advantage)

These set the IPE City Grant Evaluator apart from manual grant committees and from generic DAO tooling. These are where the project's core value proposition lives.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| zkML verifiable inference | THE core differentiator. Cryptographic proof that the AI model produced exactly the scores it claims. No trust assumptions. No other grant evaluation system does this. EZKL v1.0 supports ONNX models up to 50M parameters with GPU-accelerated proof generation. | VERY HIGH | Biggest technical risk. Must convert evaluation model to ONNX, generate ZK circuits via EZKL, produce proofs, verify on-chain. Proof generation is computationally expensive (hours for large models). May need to decompose evaluation into smaller provable sub-models. |
| Adversarial evaluation stance | Inspired by Colosseum Copilot: "challenges weak ideas instead of validating them." Most AI tools are sycophantic. An evaluator that actively probes weaknesses, identifies gaps, and stress-tests claims is genuinely differentiated. | MEDIUM | Prompt engineering + evaluation framework design. Use gap classification (Full Gap / Partial Gap / False Gap) from Copilot. Require evidence floors -- claims must have supporting data. |
| Evidence floors with citation | Every score must be grounded in specific evidence from the proposal, code, or demo -- not just LLM opinion. Inspired by Copilot's "no unsubstantiated claims" principle. | MEDIUM | Structure evaluation prompts to require citations. Output format: score + reasoning + specific evidence references. |
| IPE City values alignment scoring | Domain-specific criterion that no generic tool provides. Scores alignment with IPE City's specific values: pro-technology, pro-freedom, pro-human-progress, startup society mission. | MEDIUM | Requires encoding IPE City values as evaluation criteria. Custom to this deployment. Differentiates from any generic grant tool. |
| Multi-chain deployment (Solana + Ethereum) | IPE City operates on both chains. Most AI evaluation tools are single-chain or off-chain. Supporting both Anchor programs and Solidity contracts widens accessibility. | HIGH | Two separate smart contract codebases with shared evaluation logic. Need cross-chain score consistency. |
| Real-time evaluation on submission | Instant feedback, no waiting for judging rounds. Most grant programs take weeks. This provides immediate, actionable scores. | MEDIUM | Event-driven: on-chain submission triggers off-chain evaluation, results posted back. Latency depends on zkML proof generation time (potentially hours). "Real-time" may mean "within hours" not "seconds." |
| Ecosystem impact scoring | Evaluates not just technical quality but projected ecosystem value: user benefit, composability, integration potential, community contribution. | MEDIUM | Requires structured rubric. Less automatable than code analysis -- relies more on LLM reasoning about the proposal text. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Human-in-the-loop override | "AI might be wrong, humans should have final say" | Defeats the purpose of trustless, verifiable evaluation. Introduces the bias the system is designed to eliminate. Creates governance attack surface (who gets override power?). | Publish AI scores transparently. Governance can set thresholds and criteria weights. If the community disagrees with AI results, adjust weights/criteria for future rounds, not individual scores. |
| General-purpose DAO grant platform | "Make it work for any DAO, not just IPE City" | Premature generalization kills focus. IPE City has specific values, criteria, and chain preferences. Generic = mediocre at everything. | Build for IPE City first. If successful, extract a framework later. Domain specificity is a feature, not a limitation. |
| Token distribution / payment execution | "The agent should also send the grant funds" | Mixing evaluation with fund disbursement creates massive security risk. A scoring bug becomes a financial exploit. Separation of concerns is critical. | Agent scores. A separate, governance-controlled contract disburses funds based on scores. Clean separation. |
| Off-chain AI with oracle bridge | "zkML is too hard, just use an oracle" | Defeats the core value proposition (verifiability). Oracle = trust assumption. Training data and model can be swapped without detection. | Commit to zkML. If proof generation is too slow for full model, decompose into smaller provable components. Partial verifiability > no verifiability. |
| LLM fine-tuning on historical grant data | "Train on past successful grants for better scoring" | ERC 2026 guidelines explicitly warn about encoding historical bias. Small dataset (IPE City is new). Overfitting risk. Fine-tuning makes zkML harder (model changes break circuits). | Use a general-purpose model with structured prompts and clear rubrics. Rubric engineering > model fine-tuning for this use case. |
| Real-time chat with the evaluator | "Let proposers ask the AI why they got a score" | Scope creep. Interactive inference is not verifiable via zkML. Opens gaming vector (proposers learn to optimize for the model). | Provide detailed written reasoning with each score. Static, verifiable, non-gameable. |
| Multi-modal demo evaluation (video/screenshots) | "The agent should watch the demo" | Massively increases model complexity and zkML circuit size. Video understanding models are 10B+ parameters, far beyond EZKL's 50M parameter support. | Accept demo URLs for human review. AI evaluates: proposal text, code repository, and documentation. Demo evaluation is out of scope for v1. |

## Feature Dependencies

```
[On-chain Proposal Submission]
    +--requires--> [Content Storage (IPFS/Arweave)]
    +--enables---> [Weighted Composite Scoring]
                       +--requires--> [Per-Criterion Scores with Reasoning]
                       |                  +--requires--> [Smart Contract Security Analysis]
                       |                  +--requires--> [Anti-Fraud / Legitimacy Checks]
                       |                  +--requires--> [IPE City Values Alignment Scoring]
                       |                  +--requires--> [Ecosystem Impact Scoring]
                       +--enables---> [zkML Verifiable Inference]
                                          +--requires--> [Model in ONNX format]
                                          +--requires--> [EZKL circuit generation]
                                          +--requires--> [On-chain verifier contract]

[Adversarial Evaluation Stance]
    +--enhances--> [Per-Criterion Scores with Reasoning]
    +--requires--> [Evidence Floors with Citation]

[Multi-chain Deployment]
    +--requires--> [Solana Program (Anchor)]
    +--requires--> [Ethereum Contract (Solidity)]
    +--requires--> [Shared evaluation logic (off-chain)]

[Transparent Scoring Criteria Publication]
    +--enhances--> [Weighted Composite Scoring]
    +--independent (can ship early)]
```

### Dependency Notes

- **Weighted Composite Scoring requires Per-Criterion Scores:** You cannot compute a weighted aggregate without the individual criterion evaluations.
- **zkML requires a frozen, ONNX-exported model:** The evaluation model must be finalized and converted before proof circuits can be generated. Model changes = circuit regeneration.
- **Anti-Fraud checks require external data sources:** Git history, on-chain transaction data, proposal corpus for plagiarism detection. These are data pipeline dependencies, not just code.
- **Multi-chain is parallel work:** Solana and Ethereum contracts can be developed independently but must produce compatible data structures.
- **Adversarial evaluation is a prompt/framework concern:** It doesn't depend on specific infrastructure but enhances all scoring criteria.

## MVP Definition

### Launch With (v1)

Minimum viable product -- prove the concept works end-to-end on one chain.

- [ ] **On-chain proposal submission (Solana first)** -- single-chain simplifies v1. Solana is IPE City's primary chain for the buildathon.
- [ ] **Content storage via IPFS** -- proposals too large for on-chain storage. Store CID on-chain.
- [ ] **Weighted composite scoring (4 criteria)** -- security analysis, anti-fraud, ecosystem impact, IPE City alignment. Fixed weights for v1.
- [ ] **Per-criterion scores with structured reasoning** -- each criterion gets a 0-100 score + text explanation.
- [ ] **Smart contract security analysis (Solana/Rust focus)** -- static analysis patterns + LLM reasoning on submitted code.
- [ ] **Basic anti-fraud checks** -- plagiarism detection (semantic similarity), GitHub repo age/activity, wallet history.
- [ ] **Evidence floors** -- every score citation references specific proposal content.
- [ ] **Transparent criteria publication** -- document the rubric publicly.
- [ ] **Deterministic re-evaluation** -- pinned model, fixed seed, reproducible results.

### Add After Validation (v1.x)

Features to add once the core evaluation loop is proven.

- [ ] **zkML verifiable inference** -- add after evaluation model is stable and proven accurate. Circuit generation requires a frozen model. Trigger: model accuracy validated on benchmark proposals.
- [ ] **Ethereum smart contract support** -- second chain deployment. Trigger: Solana v1 is live and working.
- [ ] **Adversarial evaluation framework** -- gap classification, evidence challenges. Trigger: initial scoring shows proposals gaming the system.
- [ ] **Governance-configurable weights** -- let IPE City governance adjust criterion weights via on-chain voting. Trigger: community feedback on weight fairness.
- [ ] **IPE City values alignment scoring (enhanced)** -- deeper values analysis using PULSE participation data and on-chain credential tiers. Trigger: PULSE data is accessible.

### Future Consideration (v2+)

Features to defer until the system has proven value.

- [ ] **On-chain reputation integration** -- factor proposer reputation (credential tier, PULSE participation, past grant outcomes) into scoring. Defer because: reputation data infrastructure is still being built at IPE City.
- [ ] **Appeal / dispute mechanism** -- Kleros-style decentralized arbitration for contested scores. Defer because: requires significant governance design and is only needed at scale.
- [ ] **Cross-proposal analysis** -- detect duplicate/overlapping proposals across rounds. Defer because: requires a historical proposal corpus that doesn't exist yet.
- [ ] **Multi-round evaluation** -- proposals re-evaluated after milestones. Defer because: adds lifecycle complexity beyond initial judging.
- [ ] **Benchmark suite for AI accuracy** -- test known-good and known-bad proposals to measure scoring accuracy. Defer to v2 but design for it from v1.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| On-chain proposal submission | HIGH | MEDIUM | P1 |
| Content storage (IPFS) | HIGH | LOW | P1 |
| Weighted composite scoring | HIGH | MEDIUM | P1 |
| Per-criterion scores + reasoning | HIGH | HIGH | P1 |
| Smart contract security analysis | HIGH | HIGH | P1 |
| Basic anti-fraud checks | HIGH | HIGH | P1 |
| Evidence floors | MEDIUM | LOW | P1 |
| Transparent criteria publication | MEDIUM | LOW | P1 |
| Deterministic re-evaluation | MEDIUM | LOW | P1 |
| zkML verifiable inference | VERY HIGH | VERY HIGH | P2 |
| Ethereum contract support | MEDIUM | MEDIUM | P2 |
| Adversarial evaluation framework | MEDIUM | MEDIUM | P2 |
| Governance-configurable weights | MEDIUM | MEDIUM | P2 |
| IPE City values alignment (enhanced) | MEDIUM | MEDIUM | P2 |
| On-chain reputation integration | MEDIUM | HIGH | P3 |
| Appeal / dispute mechanism | LOW | HIGH | P3 |
| Cross-proposal analysis | LOW | MEDIUM | P3 |
| AI accuracy benchmark suite | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (v1)
- P2: Should have, add after core validation (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | Gitcoin Grants | DeepDAO | TMRWDAO | Colosseum Copilot | Our Approach |
|---------|---------------|---------|---------|-------------------|--------------|
| Proposal submission | On-chain (multi-chain) | N/A (analytics only) | On-chain | N/A (research tool) | On-chain with IPFS content storage |
| AI evaluation | None (human reviewers) | None (analytics) | AI summaries + basic evaluation | Qualitative research, no scoring | Full AI scoring with structured reasoning |
| Scoring system | Quadratic funding (community votes) | Participation scores (governance activity) | Automated summaries | No formal scoring | Weighted composite with per-criterion scores |
| Sybil resistance | Human Passport (stamps + ML) | Coalition detection | Unknown | N/A | On-chain history + plagiarism + GitHub analysis |
| Verifiable inference | N/A | N/A | N/A | N/A | zkML via EZKL (unique differentiator) |
| Smart contract audit | N/A | N/A | N/A | N/A | Integrated security analysis |
| Multi-chain | Yes (Ethereum, Optimism, etc.) | Multi-chain analytics | Single chain | Solana only | Solana + Ethereum |
| Adversarial stance | N/A | N/A | N/A | Yes ("challenges weak ideas") | Yes (inspired by Copilot) |
| Dispute resolution | Community governance | N/A | Governance votes | N/A | Deferred to v2 |

**Key insight:** No existing system combines automated AI scoring with cryptographic verifiability. Gitcoin uses human + community mechanisms. DeepDAO is analytics. Copilot is research. TMRWDAO has basic AI summaries. The verifiable AI judge is genuinely novel.

## Sources

- [MDPI Conceptual Framework for AI- and Blockchain-Enabled Research Evaluation](https://www.mdpi.com/2078-2489/17/2/151) -- Academic framework for hybrid on-chain/off-chain evaluation systems
- [ERC Guidelines on AI in Grant Proposal Evaluation (March 2026)](https://erc.europa.eu/system/files/2026-03/Use-AI-grant-proposal-evaluation.pdf) -- Official position on AI in grant evaluation, emphasizes non-delegation and explainability
- [Gitcoin Sybil Detection Roadmap](https://www.gitcoin.co/blog/a-community-based-roadmap-for-sybil-detection-across-web-3) -- Community-based sybil detection approaches
- [Human Passport (formerly Gitcoin Passport)](https://passport.human.tech/) -- Decentralized identity and sybil resistance via stamps + ML
- [EZKL GitHub](https://github.com/zkonduit/ezkl) -- zkML engine, ONNX to ZK-SNARK circuits, v1.0 with 50M parameter support
- [ICME Definitive Guide to ZKML 2025](https://blog.icme.io/the-definitive-guide-to-zkml-2025/) -- Comprehensive zkML landscape overview
- [Sherlock AI Smart Contract Auditing](https://sherlock.xyz/solutions/ai) -- AI-powered smart contract security analysis
- [AuditBase](https://www.auditbase.com/) -- Multi-layer automated smart contract analysis
- [DeepDAO Participation Score](https://deepdao.gitbook.io/deepdao-products/governance-list-the-top-daoists/dao-participation-score) -- DAO reputation scoring methodology
- [Kleros Decentralized Dispute Resolution](https://www.mdpi.com/2073-4336/14/3/34) -- On-chain arbitration via crowdsourced jurors
- [Colosseum Copilot Documentation](https://docs.colosseum.com/copilot/introduction) -- Adversarial evaluation, gap classification, evidence floors

---
*Feature research for: On-chain AI Grant Evaluation Agent (IPE City)*
*Researched: 2026-04-13*
