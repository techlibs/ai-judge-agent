# Evaluation Core Audit — Cross-Worktree Synthesis

**Date:** 2026-04-13
**Team:** eval-core-review (9 agents, 3 per worktree)
**Lead:** Claude Opus 4.6
**Reports synthesized:** 9 of 9 (all complete)

---

## Executive Summary

The AI judge evaluation pipeline is **architecturally sound across all 3 worktrees** — scores are computed correctly, Zod validation is applied at boundaries, and the weighted aggregation math is accurate. However, the audit uncovered **systemic gaps shared across all implementations** and **one critical missed opportunity** in the Superpower worktree.

**Top-level findings:**
1. **Speckit reputation lookup is hardcoded to agent ID `0n`** — every proposal gets the same reputation multiplier regardless of team history. The entire reputation system is a no-op. (CRITICAL)
2. **No meta-evaluation anywhere.** None of the 3 worktrees validate judge output quality (hallucination, faithfulness, bias). The Superpower worktree has `@mastra/evals` installed but completely unused. (CRITICAL)
3. **Anti-injection is prompt-only.** All worktrees rely on system prompt instructions to defend against proposal-based injection. None use structural defenses (XML delimiters, Mastra's `PromptInjectionDetector`). Speckit's specified Layer 3 defense is unimplemented.
4. **Speckit PII detection has a regex state bug** — `g` flag + `.test()` causes false negatives on every other invocation. PII could leak into IPFS and LLM inputs.
5. **No cross-dimension calibration.** Each judge operates in isolation — if one dimension is systematically generous, the weighted aggregate is silently skewed.
6. **Storage failures can lose computed evaluations.** In GSD and Speckit, an IPFS or chain failure after scoring discards all judge results.

---

## 1. Scoring Correctness

| Aspect | GSD | Speckit | Superpower |
|--------|-----|---------|------------|
| **Score scale** | 0-100 (decimal) | 0-10 (2 decimal) | 0-10000 (basis points) |
| **Weights sum** | 1.0 | 1.0 | 1.0 |
| **Aggregation** | `sum(s*w)/totalW` | `sum(s*w)` | `sum(s*w)` rounded |
| **Partial failure** | Re-normalizes (correct) | Requires all 4 | Requires all 4 (throws) |
| **Reputation multiplier** | None | 1.0-1.05x | None |
| **Anomaly detection** | None | 3 thresholds | 3 thresholds |
| **On-chain precision** | Truncated to integer | Basis points (x100) | Basis points (native) |

**Key differences:**
- GSD handles partial failures gracefully (re-normalizes weights); Speckit and Superpower require all 4 dimensions to complete.
- GSD loses decimal precision on-chain (`BigInt(Math.round(74.5))` = 75); Speckit/Superpower use basis points natively.
- Speckit adds a reputation multiplier that adjusts scores by 0-5%, creating a 0-10.5 possible range.

**Recommendation:** Standardize on basis points (0-10000) across all worktrees. GSD's partial-failure handling is the best approach — adopt it in Speckit/Superpower.

---

## 2. Prompt Quality Comparison

| Aspect | GSD | Speckit | Superpower |
|--------|-----|---------|------------|
| **Anti-injection rating** | ADEQUATE | GOOD | GOOD |
| **Preamble position** | Last (weak) | First (strong) | Early (strong) |
| **Input delimiters** | None | None | None |
| **Rubric bands** | 5 bands (0-100) | 5 criteria per dim | 5 anchors (0-10000) |
| **Calibration anchors** | "Most 30-70" guidance | None explicit | 8000-10000 = Exceptional |
| **Anti-rationalization** | None | None | Yes (red flags section) |
| **IPE values integration** | Embedded in rubric | Embedded in rubric | Separate lens per dimension |
| **Transparency metadata** | Partial (missing temp) | Partial | Full (IPFS with prompt text) |
| **Risks/injection field** | Yes (works) | References non-existent field | Yes (advisory only) |

**Cross-cutting issues found in ALL worktrees:**
1. **No input delimiters.** Proposal text flows directly into the prompt without `<proposal>` tags or fences. All 3 prompt auditors recommend adding structural boundaries.
2. **No adversarial test suite.** No worktree has behavioral tests for injection resistance.
3. **Recommendation-to-score mapping is implicit.** The prompt says "output a recommendation" but doesn't define which score ranges map to which recommendations.
4. **Team rubric bias.** All 3 disadvantage first-time teams by requiring "proven track record" for top scores.
5. **No multilingual handling.** The project locale is en_BR but no prompt addresses non-English proposals.

**Best practices by worktree:**
- **GSD:** Best naive-vs-structured comparison baseline (EVAL-08)
- **Speckit:** Best preamble positioning (first section); only worktree with monitoring agent prompt
- **Superpower:** Best calibration (anti-rationalization red flags, explicit anchors); best transparency (full prompt stored on IPFS)

---

## 3. Mastra Integration Assessment

| Feature | GSD | Speckit | Superpower |
|---------|-----|---------|------------|
| **@mastra/core installed** | No | No | Yes (^1.24.1) |
| **@mastra/evals installed** | No | No | Yes (^1.2.1) |
| **Agent class used** | No (raw AI SDK) | No (raw AI SDK) | Yes (2 features) |
| **Evals scorers used** | N/A | N/A | **NO (CRITICAL GAP)** |
| **Workflow engine used** | N/A | N/A | No (manual orchestration) |
| **Guardrails/processors** | N/A | N/A | No |
| **Tracing** | N/A | N/A | No |
| **MCP** | N/A | N/A | No |
| **Mastra singleton** | N/A | N/A | No |

**The Superpower worktree uses only 2 of ~15 available Mastra features** (Agent class + structured output). The `@mastra/evals` package is a dead dependency — installed per the tech stack decision but never imported.

**Highest-impact Mastra features NOT used:**

| Feature | Impact | Why |
|---------|--------|-----|
| `@mastra/evals` scorers | **CRITICAL** | Faithfulness, Hallucination, Bias, PromptAlignment scorers would catch bad judge outputs before they hit IPFS/chain |
| `Workflow.parallel()` | HIGH | Replaces manual orchestration with built-in retry, snapshots, tracing |
| `PromptInjectionDetector` | HIGH | Server-side injection detection before LLM call |
| Mastra singleton + tracing | MEDIUM | OpenTelemetry spans for every judge call → Langfuse transparency |
| Supervisor agent | LOW | Could replace manual 4-agent orchestration (overkill for current scope) |

---

## 4. Fairness & Reproducibility

| Aspect | GSD | Speckit | Superpower |
|--------|-----|---------|------------|
| **Temperature** | 0.3 | Not documented | Not set (model default) |
| **Judge independence** | Full (Promise.all) | Full (Promise.all) | Full (separate API routes) |
| **Cross-dimension bias** | No detection | No detection | No detection |
| **Few-shot examples** | None | None | None |
| **Seed parameter** | None | None | None |
| **Batch normalization** | None | None | None |

**No worktree addresses reproducibility beyond temperature setting.** All 3 prompt auditors recommend few-shot examples and cross-dimension calibration.

---

## 5. Top 15 Findings (Severity-Ranked)

| # | Severity | Worktree | Finding | Category |
|---|----------|----------|---------|----------|
| 1 | **CRITICAL** | Speckit | Reputation lookup hardcoded to agent ID `0n` — every proposal gets same multiplier, reputation system is a no-op | spec-drift |
| 2 | **CRITICAL** | Superpower | `@mastra/evals` installed but 0 scorers used — no meta-evaluation of judge quality | mastra-gap |
| 3 | **HIGH** | Speckit | Regex `g` flag + `.test()` causes PII check to miss matches on every other call | pipeline-bug |
| 4 | **HIGH** | Speckit | Anti-injection tells judge to flag in `risks` array, but schema has no `risks` field — silently dropped | prompt-bug |
| 5 | **HIGH** | Speckit | Layer 3 anti-injection defense specified in spec but never implemented | spec-gap |
| 6 | **HIGH** | Speckit | Dispute status map missing `voting`/`expired` states — status 1 incorrectly maps to `upheld` | spec-drift |
| 7 | **HIGH** | Speckit | No retry logic (FR-016 requires 3 retries) — `retryCount` column exists but is never used | spec-gap |
| 8 | **HIGH** | Speckit | Dispute overturn does not recalculate fund releases as spec US5 requires | spec-gap |
| 9 | **HIGH** | GSD | No retry logic for LLM calls — transient OpenAI errors permanently fail a dimension | pipeline |
| 10 | **HIGH** | GSD | Storage failure after scoring discards all computed evaluation results | pipeline |
| 11 | **HIGH** | GSD | IPFS gateway JWT leaked in URL query parameter (logged by CDNs/proxies) | security |
| 12 | **HIGH** | GSD | Body size check on submit runs AFTER full JSON parsing (no memory protection) | security |
| 13 | **MEDIUM** | ALL | No input delimiters on proposal text in any worktree — injection surface | prompt |
| 14 | **MEDIUM** | ALL | Team rubric structurally disadvantages first-time teams in all worktrees | bias |
| 15 | **MEDIUM** | Superpower | Agent instantiated per-request inside retry loop (wasteful, should be singleton) | mastra-misuse |

---

## 6. Per-Worktree Recommendations

### GSD (full-vision-roadmap) — via `/gsd-code-review-fix`

1. **Add retry logic** (1-2 attempts with exponential backoff) for `generateObject` calls
2. **Wrap storage in try/catch** — emit evaluation results even if IPFS/chain fails
3. **Move anti-injection preamble** to first section of system prompt
4. **Add `<proposal>` XML delimiters** around proposal text in user message
5. **Switch to basis points** (multiply scores by 100) for on-chain precision
6. **Fix IPFS gateway** — use dedicated gateway token, not admin JWT in URL
7. **Add body size check** before JSON parsing on evaluate endpoint

### Speckit — via `/speckit-tasks`

1. **FIX CRITICAL: Reputation lookup** — `orchestrate.ts:116` passes hardcoded `0n` to `lookupReputationIndex`. Must use the project/team identity instead
2. **Fix regex `g` flag bug** in `sanitization.ts` — reset `lastIndex` or use non-global patterns for `.test()`
3. **Add `risks` field** to `DimensionScoreSchema` so injection flags aren't silently dropped
4. **Implement Layer 3 anti-injection** — strip SYSTEM:/INSTRUCTION:/IGNORE/OVERRIDE patterns before LLM calls
5. **Add retry logic** (FR-016 requires 3 retries) — `retryCount` column exists, wire it up
6. **Fix dispute status map** in `sync.ts:345-349` — add `voting` (1) and `expired` (4) states
7. **Add fund release recalculation** to dispute override (spec US5 requirement)
8. **Fix `as Record<string, unknown>`** — use Zod `.parse()` output with proper typing
9. **Fix ABI mismatch** — reconcile `reputation-registry.ts` ABI with deployed contract
10. **Wrap dispute override** in a database transaction

### Superpower — via Superpowers plan + Mastra integration

1. **Implement `@mastra/evals` scorers** — at minimum `createFaithfulnessScorer`, `createHallucinationScorer`, `createPromptAlignmentScorerLLM` as post-generation quality gate
2. **Create Mastra singleton** with tracing configured (Langfuse recommended for transparency)
3. **Refactor to Mastra Workflow** — replace manual orchestration with `workflow.parallel()`
4. **Move Agent instantiation** to module-scope singletons (not per-request)
5. **Add `PromptInjectionDetector`** as input processor on judge agents
6. **Add input delimiters** (`<proposal>` tags) around proposal text
7. **Fix `budgetAmount.toLocaleString()`** — use `Intl.NumberFormat('en-US')` for deterministic formatting

---

## 7. Cross-Pollination Opportunities

Best patterns from each worktree that should be adopted by the others:

| Pattern | Source | Adopt In |
|---------|--------|----------|
| Partial failure re-normalization | GSD | Speckit, Superpower |
| Naive vs structured comparison baseline | GSD | Speckit, Superpower |
| Anti-injection preamble at prompt start | Speckit | GSD |
| Monitoring agent for funded projects | Speckit | GSD, Superpower |
| Anomaly detection (3 thresholds) | Speckit, Superpower | GSD |
| Anti-rationalization red flags | Superpower | GSD, Speckit |
| Full prompt transparency on IPFS | Superpower | GSD, Speckit |
| Basis points scoring (0-10000) | Superpower | GSD |
| PII detection + sanitization | Speckit, Superpower | GSD |
| Mastra evals (once implemented) | Superpower | Consider for all |

---

## 8. Synthesis.md Comparison

The [Synthesis.md hackathon](https://synthesis.md) (March 2026) uses a similar pattern — AI agents judge hackathon projects alongside humans. Key differences:

| Aspect | Agent Reviewer | Synthesis.md |
|--------|---------------|--------------|
| Judging model | AI-only (4 agents) | Hybrid (AI + human) |
| Evaluation dimensions | 4 fixed | Per-track |
| On-chain storage | ERC-8004 (Base) | Ethereum-based |
| Agent registration | Skill files | Skill files via curl |
| Reputation | On-chain registry | Event-based |

**Opportunity:** Synthesis hackathon projects could serve as test proposals for benchmarking our evaluation pipeline — real submissions provide better calibration data than synthetic examples.

---

## Appendix: Report Inventory

| Worktree | Report | File | Size | Key Finding Count |
|----------|--------|------|------|-------------------|
| GSD | Pipeline Review | EVAL-PIPELINE-REVIEW.md | 13KB | 4H, 5M, 4L |
| GSD | Prompt Review | PROMPT-REVIEW.md | 14KB | Anti-injection: ADEQUATE, Rubric: GOOD |
| GSD | Framework Review | GSD-FRAMEWORK-REVIEW.md | 16KB | 3CR, 5HI, 6MD, 3LO |
| Speckit | Pipeline Review | EVAL-PIPELINE-REVIEW.md | 20KB | 1H (regex bug), multiple M |
| Speckit | Prompt Review | PROMPT-REVIEW.md | 13KB | Anti-injection: GOOD, 1H (missing risks field) |
| Speckit | Consistency Analysis | SPECKIT-ANALYSIS.md | 12KB | 1 CRITICAL (reputation hardcoded), 8H, 4M |
| Superpower | Pipeline Review | EVAL-PIPELINE-REVIEW.md | 22KB | Multiple M, strong architecture |
| Superpower | Prompt Review | PROMPT-REVIEW.md | 16KB | Anti-injection: GOOD, best calibration |
| Superpower | Mastra Review | MASTRA-REVIEW.md | 14KB | 1 CRITICAL (evals unused), 4M |
