# Phase 3: AI Evaluation Engine - Research

**Researched:** 2026-04-14
**Domain:** ML model design, training, ONNX export, feature engineering for zkML-compatible grant evaluation
**Confidence:** MEDIUM

## Summary

Phase 3 builds four specialized micro-models (security, fraud, impact, alignment) that score grant proposals on a 1-10 scale. Each model consumes pre-extracted feature vectors (not raw text) and exports as ONNX for downstream zkML circuit compilation in Phase 5. The architecture follows a two-stage pipeline: off-chain feature extraction (acknowledged trust assumption) followed by a provable scoring model.

The key technical challenge is designing models small enough for EZKL's operator constraints (~20 condensed operators via tract) while maintaining meaningful scoring quality. Simple MLPs (2-3 hidden layers, <1M parameters) are the safest architecture for zkML compatibility. Sentence embeddings for plagiarism detection (FRAD-01) must be pre-computed during feature extraction since transformer models are too large/complex for direct zkML proving.

**Primary recommendation:** Use PyTorch MLPs with ReLU activations for all four scoring models, pre-compute all text embeddings and code analysis features in the extraction stage, and validate ONNX export + EZKL circuit compilation early (Wave 0) before investing in training.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Hybrid approach -- small, purpose-built classical ML models (not LLMs) as primary scoring engines for zkML compatibility. One micro-model per criterion.
- **D-02:** Models must stay within EZKL's ~50 ONNX operator limit. Use PyTorch for training with torch.onnx.export(dynamo=True). Sentence Transformers must use ONNX-compatible ops only.
- **D-03:** Feature extraction is a separate pre-processing step (off-chain, not proven). Scoring model takes structured feature vectors as input. Acknowledged trust assumption.
- **D-04:** Security model uses static analysis feature extraction, NOT direct Slither/Mythril. Features: function count, external call count, access control patterns, vulnerability signatures, complexity metrics.
- **D-05:** Support both Solidity and Anchor/Rust. Feature extraction adapts per language; scoring model is language-agnostic (normalized feature vectors).
- **D-06:** Output: severity-classified findings (critical/high/medium/low/info) per SECU-03, plus aggregate security score (1-10).
- **D-07:** Plagiarism detection via cosine similarity against known proposal corpus using sentence embeddings.
- **D-08:** Code originality signals: git history depth, commit pattern regularity, contributor count, repository age.
- **D-09:** Sybil detection via wallet clustering: shared funding sources, submission timing, content similarity.
- **D-10:** Impact scoring: user benefit, technical innovation, composability with IPE City infrastructure.
- **D-11:** Feature vector includes proposal domain classification, requested amount, NLP-extracted features (topic coherence, specificity, technical depth).
- **D-12:** Alignment scoring measures IPE City values using context from `packages/agent/src/prompts/ipe-city-context.ts`.
- **D-13:** PULSE participation data: contribution history, participation rate, credential tier as numerical features. Schema in packages/common.
- **D-14:** Each model outputs 1-10 score per AgentScoreSchema. On-chain conversion via toOnchainScore().
- **D-15:** Structured reasoning with evidence citations per JudgeVerdictSchema pattern.
- **D-16:** Deterministic scoring: fixed random seeds, pinned weights.
- **D-17:** Initial models use synthetic training data.
- **D-18:** Evaluation benchmark suite with human-assigned ground-truth scores.
- **D-19:** Adversarial test cases: keyword stuffing, prompt injection, plagiarized content, gaming patterns.

### Claude's Discretion
- Exact neural network architecture per model (layer count, hidden dimensions, activation functions)
- Training hyperparameters (learning rate, batch size, epochs)
- Feature vector dimensionality and normalization approach
- Test/validation split ratios
- Specific sentence transformer model selection (within ONNX-compatible constraints)

### Deferred Ideas (OUT OF SCOPE)
- LLM fine-tuning on historical grants -- breaks zkML
- Real-time proposal analysis -- async evaluation pattern only
- Video/screenshot demo evaluation -- models too large for zkML
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SECU-01 | Analyze code for common vulnerabilities (reentrancy, access control, integer overflow, unchecked external calls) | Feature extraction pipeline extracts vulnerability signatures as numerical features; MLP scores severity |
| SECU-02 | Support security analysis for both Solidity and Anchor/Rust | Language-specific feature extractors produce normalized vectors; scoring model is language-agnostic |
| SECU-03 | Severity-classified findings list (critical/high/medium/low/info) | Multi-output model head or post-processing layer maps score ranges to severity classifications |
| SECU-04 | Security score reflects quantity and severity of vulnerabilities | Weighted aggregation of vulnerability counts by severity in feature vector |
| FRAD-01 | Detect plagiarized proposals via semantic similarity | Pre-computed sentence embeddings (all-MiniLM-L6-v2) with cosine similarity as feature input |
| FRAD-02 | Check code originality via git history, commit patterns, repo age | Numerical features extracted during pre-processing (git API queries) |
| FRAD-03 | Verify team legitimacy via wallet history and GitHub activity | On-chain and GitHub API features extracted during pre-processing |
| FRAD-04 | Detect sybil patterns (related wallets, identical content variations) | Wallet clustering features and content similarity scores as model inputs |
| IMPT-01 | Evaluate ecosystem impact: user benefit, technical innovation, composability | NLP-derived features (topic coherence, specificity) plus domain classification features |
| IMPT-02 | Score alignment with IPE City values | Embedding similarity to IPE City value descriptions as feature input |
| IMPT-03 | Integrate PULSE participation data into alignment scoring | PULSE numerical features (contribution count, participation rate, credential tier ordinal) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PyTorch | 2.11.0 | Model training and ONNX export | Required per D-02; `torch.onnx.export(dynamo=True)` is the export path. Available for install on this machine. [VERIFIED: pip3 dry-run shows 2.11.0] |
| ONNX Runtime | 1.18.0 | Model inference validation pre-zkML | Already installed on this machine. Catches quantization drift before circuit compilation. [VERIFIED: pip3 show] |
| scikit-learn | 1.5.0 | Feature engineering, data preprocessing, baseline models | Already installed. Used for StandardScaler, train_test_split, metrics. [VERIFIED: pip3 show] |
| EZKL (Python) | 9.1.0 | zkML circuit compilation and proof generation | Required for Phase 5 but needed in Phase 3 for ONNX compatibility validation. [VERIFIED: PyPI shows 9.1.0] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sentence-transformers | latest | Pre-compute text embeddings for plagiarism detection | Feature extraction stage only; NOT in the provable model. Embeddings become float features in the scoring model input. |
| onnx | latest | ONNX model manipulation and validation | Validating exported models before EZKL compilation |
| skl2onnx | latest | Export scikit-learn pipelines to ONNX | If any preprocessing (e.g., StandardScaler) needs to be part of the provable pipeline |
| numpy | latest | Numerical operations, feature vector construction | Throughout feature extraction and model I/O |
| bun:test | (bundled) | TypeScript test runner | Schema validation tests, integration tests for TS components |
| zod | 3.25+ | Schema definition | Feature vector schemas, PULSE data schema, model I/O validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PyTorch MLP | scikit-learn RandomForest + skl2onnx | Simpler to train, but tree-based ONNX has different operator requirements; MLP is more predictable for EZKL |
| all-MiniLM-L6-v2 | all-MiniLM-L12-v2 | Better embeddings but 2x size; L6 is sufficient for cosine similarity plagiarism detection |
| Custom feature extraction | Existing static analysis tools (Slither) | D-04 explicitly chose feature extraction over direct tool usage for zkML compatibility |

**Installation:**
```bash
# Python ML environment (use a venv)
python3 -m venv .venv && source .venv/bin/activate
pip install torch==2.11.0 onnx onnxruntime scikit-learn sentence-transformers ezkl numpy

# TypeScript dependencies (for schema definitions)
bun add zod  # already in workspace
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── models/                          # NEW: Python ML package
│   ├── pyproject.toml               # Python project config
│   ├── requirements.txt             # Pinned dependencies
│   ├── src/
│   │   ├── features/                # Feature extraction per criterion
│   │   │   ├── security_features.py # Code analysis feature extraction
│   │   │   ├── fraud_features.py    # Plagiarism, originality, sybil features
│   │   │   ├── impact_features.py   # Impact evaluation features
│   │   │   └── alignment_features.py# IPE City alignment features
│   │   ├── models/                  # Model definitions (PyTorch nn.Module)
│   │   │   ├── security_model.py
│   │   │   ├── fraud_model.py
│   │   │   ├── impact_model.py
│   │   │   └── alignment_model.py
│   │   ├── training/                # Training scripts and data generation
│   │   │   ├── synthetic_data.py    # Generate synthetic training data (D-17)
│   │   │   ├── train.py             # Training loop with deterministic seeding
│   │   │   └── evaluate.py          # Benchmark evaluation (D-18)
│   │   ├── export/                  # ONNX export and validation
│   │   │   ├── export_onnx.py       # torch.onnx.export wrapper
│   │   │   └── validate_onnx.py     # ONNX Runtime + EZKL compatibility check
│   │   └── schemas/                 # Feature vector schemas (Python side)
│   │       └── feature_schemas.py
│   ├── tests/                       # Python tests
│   │   ├── test_features.py
│   │   ├── test_models.py
│   │   ├── test_export.py
│   │   ├── test_determinism.py      # D-16: same input => same output
│   │   └── test_adversarial.py      # D-19: adversarial test cases
│   ├── benchmarks/                  # Evaluation benchmark suite (D-18)
│   │   ├── known_good_proposals.json
│   │   ├── known_bad_proposals.json
│   │   └── adversarial_proposals.json
│   └── exported/                    # ONNX model outputs
│       ├── security_model.onnx
│       ├── fraud_model.onnx
│       ├── impact_model.onnx
│       └── alignment_model.onnx
├── common/src/
│   ├── pulse.ts                     # NEW: PULSE data schema (D-13)
│   ├── feature-vectors.ts           # NEW: Feature vector type definitions
│   └── ...existing files...
└── agent/src/
    └── ...existing judge code (reference only)...
```

### Pattern 1: Two-Stage Evaluation Pipeline
**What:** Separate feature extraction (untrusted, off-chain) from scoring (provable via zkML).
**When to use:** Always -- this is the core architecture per D-03.
**Example:**
```python
# Source: D-03 decision, CLAUDE.md stack patterns
# Stage 1: Feature Extraction (off-chain, NOT proven)
def extract_security_features(code: str, language: str) -> np.ndarray:
    """Extract numerical features from source code."""
    features = {
        'function_count': count_functions(code, language),
        'external_call_count': count_external_calls(code, language),
        'has_access_control': has_access_control_pattern(code, language),
        'reentrancy_pattern_count': detect_reentrancy_patterns(code, language),
        'complexity_score': calculate_complexity(code, language),
        # ... more features
    }
    return normalize(np.array(list(features.values())))

# Stage 2: Scoring Model (provable via EZKL)
class SecurityModel(nn.Module):
    def __init__(self, input_dim: int = 20):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),  # Output 0-1, scale to 1-10
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x) * 9 + 1  # Scale to 1-10 range
```

### Pattern 2: Deterministic Model Inference (D-16)
**What:** Ensure same input always produces same output.
**When to use:** Every model inference call.
**Example:**
```python
# Source: D-16 decision
import torch
import numpy as np
import random

def set_deterministic_seed(seed: int = 42):
    """Pin all random sources for reproducible inference."""
    torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True)
    np.random.seed(seed)
    random.seed(seed)
    if torch.backends.mps.is_available():
        torch.mps.manual_seed(seed)

def deterministic_inference(model: nn.Module, features: np.ndarray) -> float:
    """Run model inference with deterministic guarantees."""
    set_deterministic_seed()
    model.eval()
    with torch.no_grad():
        input_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        score = model(input_tensor).item()
    return round(score, 2)
```

### Pattern 3: ONNX Export with EZKL Validation
**What:** Export model and immediately validate EZKL can compile it.
**When to use:** After every model architecture change.
**Example:**
```python
# Source: EZKL docs (https://docs.ezkl.xyz/getting-started/)
import torch
import ezkl
import json

def export_and_validate(model: nn.Module, input_dim: int, output_path: str):
    """Export to ONNX and validate EZKL compatibility."""
    model.eval()
    dummy_input = torch.randn(1, input_dim)

    # Export to ONNX
    torch.onnx.export(
        model, dummy_input, output_path,
        export_params=True,
        opset_version=17,
        input_names=['features'],
        output_names=['score'],
        dynamic_axes=None,  # Fixed batch size for zkML
    )

    # Validate with EZKL
    settings_path = output_path.replace('.onnx', '_settings.json')
    ezkl.gen_settings(output_path, settings_path)
    ezkl.calibrate_settings(
        output_path, settings_path,
        data='calibration_data.json'  # Sample inputs
    )
    compiled_path = output_path.replace('.onnx', '.ezkl')
    ezkl.compile_model(output_path, compiled_path, settings_path)
    print(f"EZKL compilation successful: {compiled_path}")
```

### Pattern 4: Synthetic Training Data Generation (D-17)
**What:** Generate labeled training data with known-good and known-bad proposals.
**When to use:** Initial model training before real data is available.
**Example:**
```python
# Source: D-17 decision
def generate_security_training_data(n_samples: int = 1000) -> tuple:
    """Generate synthetic security feature vectors with ground-truth scores."""
    features = []
    scores = []

    for _ in range(n_samples):
        # Generate feature vector
        vuln_count = np.random.poisson(3)
        critical_count = np.random.binomial(vuln_count, 0.1)
        has_access_control = np.random.binomial(1, 0.7)
        complexity = np.random.exponential(5)

        feature_vec = np.array([
            vuln_count, critical_count, has_access_control,
            complexity, # ... more features
        ])
        features.append(feature_vec)

        # Ground truth: high vulns + low access control = low score
        ground_truth = 10.0 - (critical_count * 3 + vuln_count * 0.5)
        ground_truth = max(1.0, min(10.0, ground_truth))
        if not has_access_control:
            ground_truth *= 0.7
        scores.append(ground_truth)

    return np.array(features), np.array(scores)
```

### Anti-Patterns to Avoid
- **Embedding models inside the provable circuit:** Sentence transformers have millions of parameters and use unsupported ONNX ops. Always pre-compute embeddings in feature extraction.
- **Dynamic batch sizes in ONNX export:** EZKL requires fixed tensor shapes. Never use `dynamic_axes` in `torch.onnx.export` for zkML models.
- **Float64 in model weights:** EZKL quantizes to fixed-point arithmetic. Use float32 throughout to minimize quantization error.
- **Non-deterministic operations:** Dropout, random sampling, etc. must be disabled at inference time (`model.eval()`).
- **Complex activation functions:** Stick to ReLU. Avoid GELU, Swish, or other activations that may not have EZKL operator support.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text embeddings | Custom word2vec or TF-IDF for proposal similarity | sentence-transformers (all-MiniLM-L6-v2) | Pre-trained on 1B+ sentence pairs, 384-dim output, ONNX exportable [CITED: huggingface.co/sentence-transformers/all-MiniLM-L6-v2] |
| Feature normalization | Manual min-max scaling | sklearn.preprocessing.StandardScaler | Handles edge cases (zero variance, NaN), serializable, well-tested |
| ONNX model validation | Manual op-by-op checking | onnx.checker.check_model + ezkl.gen_settings | EZKL's own validator catches operator incompatibilities at compile time |
| Model metrics | Custom accuracy calculation | sklearn.metrics (MSE, MAE, R2) | Standard metrics, well-tested edge cases |
| Training loop | Raw PyTorch training loop | Still use raw PyTorch (models are tiny) | For <1M param models, a framework like Lightning adds unnecessary complexity. Simple training loops are appropriate. |

**Key insight:** The models themselves are intentionally simple (2-3 layer MLPs). The complexity is in feature engineering and synthetic data generation, not in model architecture. Don't over-engineer the neural network -- the constraint is EZKL compatibility, not model expressiveness.

## Common Pitfalls

### Pitfall 1: ONNX Operator Incompatibility
**What goes wrong:** Model exports to ONNX successfully but EZKL fails with UnsupportedOp error during circuit compilation.
**Why it happens:** EZKL uses tract internally which condenses ONNX to ~20 operators. PyTorch's ONNX exporter may emit operators tract doesn't support. [CITED: docs.ezkl.xyz/troubleshooting/]
**How to avoid:** Validate EZKL compilation immediately after ONNX export. Stick to nn.Linear + nn.ReLU + nn.Sigmoid. Test EZKL compilation in CI.
**Warning signs:** Using custom layers, complex activations (GELU, Swish), or operations like BatchNorm.

### Pitfall 2: Quantization Score Drift
**What goes wrong:** Model outputs correct scores in PyTorch but EZKL proofs produce slightly different scores due to fixed-point quantization.
**Why it happens:** EZKL converts floating-point operations to fixed-point arithmetic for circuit constraints. [CITED: docs.ezkl.xyz]
**How to avoid:** Use `ezkl.calibrate_settings()` with representative calibration data. Accept tolerance of +/- 0.1 on scores. Design score thresholds with margins.
**Warning signs:** Tier boundary scores (e.g., 4.95 vs 5.05) that could flip between B and C tiers after quantization.

### Pitfall 3: Non-Deterministic Training Producing Non-Reproducible Models
**What goes wrong:** Same training data produces different model weights on different runs, violating D-16.
**Why it happens:** PyTorch uses non-deterministic algorithms by default (cuDNN, MPS).
**How to avoid:** Set `torch.use_deterministic_algorithms(True)`, pin all seeds, save and version model checkpoints. Use CPU-only training for small models (eliminates GPU non-determinism).
**Warning signs:** Score variance > 0.01 on identical inputs across model loads.

### Pitfall 4: Feature Vector Dimensionality Mismatch
**What goes wrong:** Feature extraction produces different-length vectors for different proposals (e.g., variable-length code produces variable features).
**Why it happens:** ONNX models require fixed input dimensions. Variable-length inputs must be normalized to fixed-size vectors.
**How to avoid:** Define fixed feature vector schemas upfront with Zod (TypeScript) and dataclasses (Python). Pad/truncate to fixed dimensions.
**Warning signs:** Runtime errors during inference on edge-case proposals.

### Pitfall 5: Synthetic Data Distribution Mismatch
**What goes wrong:** Model trained on synthetic data performs well on benchmarks but poorly on real proposals.
**Why it happens:** Synthetic data generation doesn't capture real-world distribution of grant proposals.
**How to avoid:** Design synthetic data generation to cover edge cases explicitly. Include adversarial examples (D-19). Plan for model retraining when real data becomes available. Validate with the existing LLM-based judge outputs as a sanity check.
**Warning signs:** Benchmark scores look good but manual review shows nonsensical scoring on realistic proposals.

### Pitfall 6: Severity Classification as Separate Problem
**What goes wrong:** Trying to make the scoring model also produce severity-classified findings (SECU-03).
**Why it happens:** Conflating the aggregate scoring model with the detailed findings output.
**How to avoid:** Feature extraction produces the severity-classified findings list (rule-based, from static analysis). The ML model only produces the aggregate 1-10 score. Findings and score are combined in the output schema.
**Warning signs:** Model architecture becoming complex to support multi-label output.

## Code Examples

### Feature Vector Schema (TypeScript, for packages/common)
```typescript
// Source: D-11, D-13, existing CriterionSchema pattern
import { z } from "zod";

export const SecurityFeatureVectorSchema = z.object({
  functionCount: z.number(),
  externalCallCount: z.number(),
  hasAccessControl: z.number().min(0).max(1),
  reentrancyPatternCount: z.number(),
  integerOverflowRisk: z.number().min(0).max(1),
  uncheckedCallCount: z.number(),
  complexityScore: z.number(),
  linesOfCode: z.number(),
  // Per-severity vulnerability counts
  criticalVulnCount: z.number(),
  highVulnCount: z.number(),
  mediumVulnCount: z.number(),
  lowVulnCount: z.number(),
});

export const FraudFeatureVectorSchema = z.object({
  maxCosineSimilarity: z.number().min(0).max(1), // vs known corpus
  avgCosineSimilarity: z.number().min(0).max(1),
  gitHistoryDepth: z.number(),
  commitPatternRegularity: z.number().min(0).max(1),
  contributorCount: z.number(),
  repoAgeDays: z.number(),
  walletAgeDays: z.number(),
  walletTxCount: z.number(),
  sharedFundingSourceCount: z.number(),
  submissionTimingCluster: z.number().min(0).max(1),
  contentSimilarityToOtherSubmissions: z.number().min(0).max(1),
});

export const ImpactFeatureVectorSchema = z.object({
  domainOrdinal: z.number(), // ProposalDomain encoded as ordinal
  requestedAmount: z.number(),
  topicCoherence: z.number().min(0).max(1),
  specificityScore: z.number().min(0).max(1),
  technicalDepthScore: z.number().min(0).max(1),
  targetAudienceSize: z.number().min(0).max(1), // normalized
  noveltyScore: z.number().min(0).max(1),
  composabilityScore: z.number().min(0).max(1),
  hasKPIs: z.number().min(0).max(1),
  hasTimeline: z.number().min(0).max(1),
});

export const AlignmentFeatureVectorSchema = z.object({
  proTechScore: z.number().min(0).max(1),
  proFreedomScore: z.number().min(0).max(1),
  proHumanProgressScore: z.number().min(0).max(1),
  startupSocietyFit: z.number().min(0).max(1),
  pulseContributionCount: z.number(),
  pulseParticipationRate: z.number().min(0).max(1),
  credentialTierOrdinal: z.number(), // Netizen=0, Explorer=1, Architect=2
  ipeCityValueEmbeddingSimilarity: z.number().min(0).max(1),
});

export const PulseDataSchema = z.object({
  walletAddress: z.string(),
  contributionCount: z.number().int().min(0),
  participationRate: z.number().min(0).max(1),
  credentialTier: z.enum(["Netizen", "Explorer", "Architect"]),
  lastPulseDate: z.number().int().positive().optional(),
  consecutivePulses: z.number().int().min(0),
});
export type PulseData = z.infer<typeof PulseDataSchema>;
```

### Model Definition (Python)
```python
# Source: Architecture Pattern 1, D-01, D-02
import torch
import torch.nn as nn

class EvaluationModel(nn.Module):
    """Base scoring model for all four criteria.

    Designed for EZKL compatibility:
    - Only uses Linear + ReLU + Sigmoid (supported by tract)
    - Fixed input dimension (no dynamic shapes)
    - Float32 weights only
    - Output range: 1.0 to 10.0
    """
    def __init__(self, input_dim: int, hidden_dims: list[int] = [64, 32]):
        super().__init__()
        layers = []
        prev_dim = input_dim
        for dim in hidden_dims:
            layers.extend([nn.Linear(prev_dim, dim), nn.ReLU()])
            prev_dim = dim
        layers.extend([nn.Linear(prev_dim, 1), nn.Sigmoid()])
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Sigmoid outputs 0-1, scale to 1-10
        return self.net(x) * 9.0 + 1.0
```

### ONNX Export Script
```python
# Source: PyTorch docs (https://docs.pytorch.org/tutorials/beginner/onnx/export_simple_model_to_onnx_tutorial.html)
import torch
import onnx

def export_model(model: nn.Module, input_dim: int, path: str):
    model.eval()
    dummy = torch.randn(1, input_dim, dtype=torch.float32)

    torch.onnx.export(
        model, dummy, path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=['features'],
        output_names=['score'],
    )

    # Validate
    onnx_model = onnx.load(path)
    onnx.checker.check_model(onnx_model)
    print(f"Exported and validated: {path}")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| torch.onnx.export() (TorchScript) | torch.onnx.export(dynamo=True) | PyTorch 2.5+ (2024) | More reliable export via torch.export + Torch FX graph capture [CITED: docs.pytorch.org/docs/stable/onnx_export.html] |
| EZKL with limited operators | EZKL with ~20 tract operators (condensed from ONNX 120+) | 2025 | Attention mechanisms now supported; simpler models remain safest [CITED: blog.icme.io/the-definitive-guide-to-zkml-2025/] |
| Bankrun for Solana testing | LiteSVM | March 2025 | N/A for this phase (no on-chain work) |
| Single monolithic evaluation model | Micro-model ensemble (one per criterion) | Architecture decision | Better transparency, per-criterion proofs, simpler EZKL circuits |

**Deprecated/outdated:**
- `torch.onnx.export()` without `dynamo=True`: Still works but the dynamo-based exporter is recommended for PyTorch 2.5+ [ASSUMED]
- `ezkl-lib` PyPI package: Superseded by `ezkl` package (ezkl-lib last updated June 2023) [VERIFIED: PyPI]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ReLU and Sigmoid are fully supported EZKL operators via tract | Architecture Patterns | HIGH -- if unsupported, need different activation functions; validate in Wave 0 |
| A2 | nn.Sequential with Linear layers exports cleanly to ONNX opset 17 | Code Examples | LOW -- this is the most basic PyTorch export path |
| A3 | all-MiniLM-L6-v2 produces 384-dim embeddings suitable for cosine similarity | Standard Stack | LOW -- well-documented model |
| A4 | EZKL 9.1.0 is compatible with PyTorch 2.11.0 ONNX exports | Standard Stack | MEDIUM -- version compatibility not explicitly verified |
| A5 | torch.onnx.export with dynamo=True is supported for simple MLPs on PyTorch 2.11.0 | Code Examples | LOW -- dynamo export is the primary path in PyTorch 2.5+ |
| A6 | Fixed-point quantization in EZKL introduces < 0.5 score deviation for simple MLPs | Pitfalls | MEDIUM -- depends on calibration quality; must test empirically |
| A7 | CPU-only training eliminates non-determinism for simple MLPs | Pitfalls | LOW -- well-known PyTorch behavior on CPU |

## Open Questions

1. **Feature vector dimensionality per model**
   - What we know: Each model needs a fixed-size input vector. Security has ~12 features, fraud ~11, impact ~10, alignment ~8 based on schema design.
   - What's unclear: Whether these dimensions are sufficient for meaningful scoring or if more features are needed.
   - Recommendation: Start with the proposed dimensions, validate with benchmark suite, expand if needed. Keep under 100 features per model for EZKL circuit efficiency.

2. **Severity classification output format (SECU-03)**
   - What we know: Need severity-classified findings list (critical/high/medium/low/info).
   - What's unclear: Whether the ML model should output per-severity counts or just the aggregate score, with findings produced by rule-based feature extraction.
   - Recommendation: Rule-based findings from feature extraction + ML aggregate score. The findings list is deterministic (rules), the aggregate score is learned (model).

3. **EZKL compilation feasibility for 4 separate models**
   - What we know: EZKL can compile simple MLPs. Each model is small (<1M params).
   - What's unclear: Memory and time requirements for circuit compilation of 4 models on macOS ARM64.
   - Recommendation: Test EZKL compilation for one model as Wave 0 validation task before committing to the full architecture.

4. **Sentence transformer embedding extraction integration**
   - What we know: Need pre-computed embeddings for plagiarism detection (FRAD-01) and alignment scoring (IMPT-02).
   - What's unclear: Where embedding computation runs in the pipeline -- during proposal submission or during evaluation trigger.
   - Recommendation: During evaluation trigger (off-chain), as part of feature extraction. Store embeddings alongside feature vectors.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.10 | ML training and export | Yes | 3.10.12 | -- |
| pip | Package installation | Yes | 24.3.1 | -- |
| PyTorch | Model training | No (not installed) | 2.11.0 (available) | pip install torch |
| ONNX Runtime | Inference validation | Yes | 1.18.0 | -- |
| scikit-learn | Feature engineering | Yes | 1.5.0 | -- |
| EZKL | Circuit compilation validation | No (not installed) | 9.1.0 (available) | pip install ezkl |
| sentence-transformers | Text embeddings | No (not installed) | latest | pip install sentence-transformers |
| ONNX | Model validation | No (not installed) | latest | pip install onnx |
| bun | TypeScript testing | Yes | 1.3.1 | -- |
| Node.js | TS runtime | Yes | v23.10.0 | -- |
| conda | Environment management | No | -- | Use pyenv + venv (available) |

**Missing dependencies with no fallback:**
- None -- all missing dependencies can be installed via pip

**Missing dependencies with fallback:**
- PyTorch, EZKL, sentence-transformers, ONNX: All installable via pip. Plan should include a setup task.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Python) | pytest (standard for ML testing) |
| Framework (TypeScript) | bun:test (already in use) |
| Config file | pytest.ini (to be created in packages/models/) |
| Quick run command | `cd packages/models && python -m pytest tests/ -x -q` |
| Full suite command | `cd packages/models && python -m pytest tests/ -v && cd ../.. && bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SECU-01 | Security features detect common vulnerabilities | unit | `pytest tests/test_features.py::test_security_features -x` | No -- Wave 0 |
| SECU-02 | Feature extraction works for both Solidity and Rust | unit | `pytest tests/test_features.py::test_dual_language -x` | No -- Wave 0 |
| SECU-03 | Severity classification produces correct categories | unit | `pytest tests/test_features.py::test_severity_classification -x` | No -- Wave 0 |
| SECU-04 | Security score correlates with vulnerability severity | integration | `pytest tests/test_models.py::test_security_scoring -x` | No -- Wave 0 |
| FRAD-01 | Plagiarism detection flags similar proposals | unit | `pytest tests/test_features.py::test_plagiarism_detection -x` | No -- Wave 0 |
| FRAD-02 | Code originality features extracted correctly | unit | `pytest tests/test_features.py::test_code_originality -x` | No -- Wave 0 |
| FRAD-03 | Team legitimacy features extracted | unit | `pytest tests/test_features.py::test_team_legitimacy -x` | No -- Wave 0 |
| FRAD-04 | Sybil detection features identify related wallets | unit | `pytest tests/test_features.py::test_sybil_detection -x` | No -- Wave 0 |
| IMPT-01 | Impact features capture ecosystem value | unit | `pytest tests/test_features.py::test_impact_features -x` | No -- Wave 0 |
| IMPT-02 | Alignment features measure IPE City value fit | unit | `pytest tests/test_features.py::test_alignment_features -x` | No -- Wave 0 |
| IMPT-03 | PULSE data integration produces correct features | unit | `pytest tests/test_features.py::test_pulse_integration -x` | No -- Wave 0 |
| D-16 | Deterministic inference (same input = same output) | unit | `pytest tests/test_determinism.py -x` | No -- Wave 0 |
| D-19 | Adversarial inputs score low | integration | `pytest tests/test_adversarial.py -x` | No -- Wave 0 |
| ONNX | Models export and pass ONNX validation | integration | `pytest tests/test_export.py -x` | No -- Wave 0 |
| EZKL | ONNX models compile to EZKL circuits | integration | `pytest tests/test_export.py::test_ezkl_compile -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd packages/models && python -m pytest tests/ -x -q`
- **Per wave merge:** Full suite including adversarial tests
- **Phase gate:** All tests green + benchmark evaluation shows < 1.5 average score deviation from ground truth

### Wave 0 Gaps
- [ ] `packages/models/pyproject.toml` -- Python project config with pytest, torch, ezkl dependencies
- [ ] `packages/models/tests/conftest.py` -- shared fixtures (sample feature vectors, trained model instances)
- [ ] `packages/models/tests/test_features.py` -- feature extraction tests
- [ ] `packages/models/tests/test_models.py` -- model inference tests
- [ ] `packages/models/tests/test_export.py` -- ONNX export + EZKL compilation tests
- [ ] `packages/models/tests/test_determinism.py` -- reproducibility tests
- [ ] `packages/models/tests/test_adversarial.py` -- adversarial input tests
- [ ] pytest installation: `pip install pytest`
- [ ] `packages/common/src/pulse.ts` -- PULSE data schema (D-13)
- [ ] `packages/common/src/feature-vectors.ts` -- feature vector type definitions

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- no auth in ML models |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A -- models are inference-only |
| V5 Input Validation | Yes | Zod schemas for feature vectors; numpy dtype enforcement; input range clamping |
| V6 Cryptography | No | Handled by EZKL in Phase 5, not in this phase |

### Known Threat Patterns for ML Scoring

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Adversarial input manipulation (crafted features to game scores) | Tampering | Input range validation, adversarial test suite (D-19), feature clamping |
| Model weight tampering | Tampering | Pinned weights with hash verification (ZKML-05, Phase 5) |
| Training data poisoning | Tampering | Synthetic data generation with explicit label logic; benchmark validation |
| Feature extraction bypass | Elevation of Privilege | Feature extraction and model inference are separate stages; both validate inputs |
| Score manipulation via quantization | Tampering | EZKL calibration; score thresholds with margins around tier boundaries |

## Sources

### Primary (HIGH confidence)
- [EZKL Documentation](https://docs.ezkl.xyz/) -- getting started workflow, troubleshooting, operator constraints
- [PyTorch ONNX Export Docs](https://docs.pytorch.org/docs/stable/onnx_export.html) -- torch.onnx.export API, dynamo exporter
- [PyTorch ONNX Tutorial](https://docs.pytorch.org/tutorials/beginner/onnx/export_simple_model_to_onnx_tutorial.html) -- export examples
- [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) -- model specs, 384-dim output
- [EZKL PyPI](https://pypi.org/project/ezkl/9.1.0/) -- version 9.1.0 confirmed
- Existing codebase: `packages/common/src/scores.ts`, `packages/common/src/verdict.ts`, `packages/agent/src/agents/judges/` -- established patterns

### Secondary (MEDIUM confidence)
- [Definitive Guide to ZKML 2025 (ICME)](https://blog.icme.io/the-definitive-guide-to-zkml-2025/) -- operator coverage (~50 of 120+), framework comparison
- [State of EZKL 2025](https://blog.ezkl.xyz/post/state_of_ezkl/) -- ecosystem adoption, GPU support roadmap
- [EZKL GitHub](https://github.com/zkonduit/ezkl) -- source code, supported operations in src/circuit/ops

### Tertiary (LOW confidence)
- Activation function support in tract (ReLU, Sigmoid assumed supported based on being basic ops -- not explicitly verified against current EZKL version)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- PyTorch, ONNX Runtime, scikit-learn are well-established; versions verified against local environment and PyPI
- Architecture: MEDIUM -- Two-stage pipeline is sound per CLAUDE.md guidance; MLP architecture for EZKL is standard but specific operator support needs Wave 0 validation
- Pitfalls: MEDIUM -- Based on EZKL documentation and zkML community knowledge; quantization drift magnitude needs empirical testing
- Feature engineering: MEDIUM -- Feature schemas are reasonable but actual scoring quality depends on synthetic data quality and feature selection

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days -- ML stack is stable; EZKL evolves faster but core API is stable)
