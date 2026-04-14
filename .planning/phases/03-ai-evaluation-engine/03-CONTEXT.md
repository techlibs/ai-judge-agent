# Phase 3: AI Evaluation Engine - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build four specialized AI models that analyze grant proposals across weighted evaluation criteria: smart contract security, anti-fraud/legitimacy, ecosystem impact, and IPE City alignment. Each model produces a score (1-10) with structured reasoning and evidence citations. All models must export as ONNX format suitable for zkML circuit conversion in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Model Architecture Strategy
- **D-01:** Hybrid approach — use small, purpose-built classical ML models (not LLMs) as the primary scoring engines for zkML compatibility. Each criterion gets its own micro-model as recommended in CLAUDE.md ("Split into micro-models: one for security analysis, one for fraud detection, one for impact scoring, one for alignment scoring").
- **D-02:** Models must stay within EZKL's ~50 ONNX operator limit. Use PyTorch for training with torch.onnx.export(dynamo=True) as the export path. Sentence Transformers for text embedding must use ONNX-compatible ops only.
- **D-03:** Feature extraction is a separate pre-processing step that runs off-chain before the scoring model. The scoring model takes structured feature vectors as input (not raw text). This is an acknowledged trust assumption documented in CLAUDE.md: "Pre-process inputs off-chain into structured feature vectors → Prove the scoring model (feature vectors → scores) via zkML → The pre-processing step is NOT proven."

### Security Model (SECU-01 through SECU-04)
- **D-04:** The security model analyzes code via static analysis feature extraction — it does NOT run Slither/Mythril directly. Instead, pre-processing extracts features (function count, external call count, access control patterns, known vulnerability signatures, complexity metrics) and the model scores severity based on these features.
- **D-05:** Support both Solidity and Anchor/Rust codebases per SECU-02. Feature extraction adapts per language. The scoring model is language-agnostic (operates on normalized feature vectors).
- **D-06:** Output format: severity-classified findings list (critical/high/medium/low/info) per SECU-03, plus an aggregate security score (1-10) per the existing AgentScoreSchema.

### Fraud & Legitimacy Model (FRAD-01 through FRAD-04)
- **D-07:** Plagiarism detection via cosine similarity against a known proposal corpus using sentence embeddings. Threshold-based scoring — high similarity triggers low legitimacy score.
- **D-08:** Code originality signals: git history depth, commit pattern regularity, contributor count, repository age. These are extracted as numerical features during pre-processing.
- **D-09:** Sybil detection via wallet clustering: shared funding sources, submission timing patterns, content similarity across proposals from different wallets. Features extracted from on-chain data during pre-processing.

### Impact Model (IMPT-01 through IMPT-03)
- **D-10:** Impact scoring evaluates: user benefit (problem significance, target audience size), technical innovation (novelty of approach, state of the art comparison), and composability with IPE City infrastructure (integration potential, dependency on existing services).
- **D-11:** Feature vector includes proposal domain classification (from ProposalDomain enum), requested amount, and NLP-extracted features from the proposal text (topic coherence, specificity, technical depth).

### Alignment Model (IMPT-02, IMPT-03)
- **D-12:** Alignment scoring measures adherence to IPE City values: pro-technological innovation, pro-freedom, pro-human progress, startup society mission. Uses the IPE City context already defined in `packages/agent/src/prompts/ipe-city-context.ts`.
- **D-13:** PULSE participation data integration per IMPT-03: contribution history, participation rate, and credential tier are numerical features fed into the alignment model. PULSE data format will be defined as a TypeScript schema in packages/common.

### Scoring & Output Format
- **D-14:** Each model outputs a score in the 1-10 range per the existing `AgentScoreSchema` in `packages/common/src/scores.ts`. On-chain conversion uses the existing `toOnchainScore()` function (multiply by 100 for basis points).
- **D-15:** Each score includes structured reasoning with evidence citations per SCOR-03 and SCOR-06. The reasoning format follows the existing `JudgeVerdictSchema` pattern in packages/common.
- **D-16:** Deterministic scoring per SCOR-07 — models use fixed random seeds and pinned weights. Same input always produces same output.

### Training & Evaluation Strategy
- **D-17:** Initial models use synthetic training data — generate known-good and known-bad proposals with predetermined scores for supervised training. Real proposal data will be incorporated as it becomes available.
- **D-18:** Evaluation benchmark suite per TEST-03 — a curated set of proposals with human-assigned ground-truth scores. Model accuracy measured as score deviation from ground truth.
- **D-19:** Adversarial test cases per TEST-04 — proposals with keyword stuffing, prompt injection attempts, plagiarized content, and gaming patterns. Models must score these low.

### Claude's Discretion
- Exact neural network architecture per model (layer count, hidden dimensions, activation functions)
- Training hyperparameters (learning rate, batch size, epochs)
- Feature vector dimensionality and normalization approach
- Test/validation split ratios
- Specific sentence transformer model selection (within ONNX-compatible constraints)

</decisions>

<specifics>
## Specific Ideas

- The existing judge architecture in `packages/agent/src/agents/judges/` (security-judge, impact-judge, alignment-judge, base-judge) provides the LLM-based evaluation logic that informs what features each model needs
- The criteria registry in `packages/agent/src/criteria/` defines evaluation dimensions and weights — models should align with these
- The `EvaluationReportSchema` in `packages/common/src/report.ts` defines the output structure that Phase 4 (Scoring & Reasoning) will consume
- Adversarial stance per SCOR-05 — models should be calibrated to challenge weak proposals, not validate them

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Agent Architecture
- `packages/agent/src/agents/judges/base-judge.ts` — Base judge pattern for all evaluation criteria
- `packages/agent/src/agents/judges/security-judge.ts` — Security evaluation logic and rubrics
- `packages/agent/src/agents/judges/impact-judge.ts` — Impact evaluation logic
- `packages/agent/src/agents/judges/alignment-judge.ts` — Alignment evaluation logic
- `packages/agent/src/agents/orchestrator.ts` — Evaluation orchestration flow
- `packages/agent/src/agents/presiding-judge.ts` — Final scoring and deliberation

### Criteria & Scoring Types
- `packages/common/src/criterion.ts` — CriterionSchema, CriterionCategory (Security, Impact, Alignment, Adaptive), weight system (basis points)
- `packages/common/src/scores.ts` — AgentScoreSchema (1-10), OnchainScoreSchema (0-1000), TierSchema (S/A/B/C/F), conversion functions
- `packages/common/src/report.ts` — EvaluationReportSchema — the output structure models feed into
- `packages/common/src/verdict.ts` — JudgeVerdictSchema — per-criterion verdict format with evidence

### Prompts & Context
- `packages/agent/src/prompts/rubrics.ts` — Evaluation rubrics for each criterion
- `packages/agent/src/prompts/ipe-city-context.ts` — IPE City values and context for alignment scoring
- `packages/agent/src/criteria/registry.ts` — Criteria registry with weights and selection logic
- `packages/agent/src/criteria/selector.ts` — Domain-aware criteria selection

### Requirements
- `.planning/REQUIREMENTS.md` §Smart Contract Security Analysis — SECU-01 through SECU-04
- `.planning/REQUIREMENTS.md` §Anti-Fraud & Legitimacy — FRAD-01 through FRAD-04
- `.planning/REQUIREMENTS.md` §Impact & Alignment — IMPT-01 through IMPT-03
- `.planning/REQUIREMENTS.md` §Scoring System — SCOR-01 through SCOR-07 (scoring constraints that affect model design)

### Stack Guidance
- `CLAUDE.md` §Recommended Stack — EZKL, PyTorch, ONNX Runtime, Sentence Transformers, scikit-learn
- `CLAUDE.md` §Stack Patterns — Micro-model pattern, pre-processing trust assumption, async evaluation flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/agent/src/agents/judges/` — Four judge implementations (security, impact, alignment, adaptive) with evaluation logic that can inform feature engineering
- `packages/agent/src/prompts/rubrics.ts` — Scoring rubrics that define what each criterion evaluates
- `packages/common/src/scores.ts` — Score conversion utilities (agent 1-10 ↔ on-chain 0-1000)
- `packages/common/src/criterion.ts` — Criteria definitions with weights in basis points

### Established Patterns
- Zod schemas for all data types — new model input/output schemas should follow this pattern
- Judge-per-criterion architecture — each model maps to one judge type
- Criteria selection is domain-aware — models receive only relevant criteria per ProposalDomain

### Integration Points
- Models output scores consumed by Phase 4 (Scoring & Reasoning System) which combines into composite scores
- Model ONNX exports consumed by Phase 5 (zkML Verifiable Inference) for circuit compilation
- Feature extraction pre-processing connects to Phase 6 (Multi-Chain Orchestration) off-chain pipeline

</code_context>

<deferred>
## Deferred Ideas

- LLM fine-tuning on historical grants — explicitly out of scope per REQUIREMENTS.md (encodes bias, breaks zkML)
- Real-time proposal analysis — async evaluation pattern only per D-06/D-07 from Phase 2
- Video/screenshot demo evaluation — models too large for zkML per Out of Scope table

</deferred>

---

*Phase: 03-ai-evaluation-engine*
*Context gathered: 2026-04-14*
