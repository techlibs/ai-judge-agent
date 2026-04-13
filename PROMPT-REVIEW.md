# Superpower Worktree -- Judge Prompt Engineering Audit

**Auditor:** Claude Opus 4.6 (automated prompt review)
**Date:** 2026-04-13
**Scope:** `src/lib/judges/prompts.ts`, `src/lib/judges/schemas.ts`, `src/lib/constants.ts`, `src/app/api/evaluate/[id]/[dimension]/route.ts`
**Model in use:** `claude-sonnet-4-20250514` (Anthropic Claude Sonnet 4) via Mastra Agent

---

## 1. Anti-Injection Robustness

### What is present

- **F-010 block** (lines 16-20 of prompts.ts): Explicit instruction to treat proposal text as DATA, not INSTRUCTIONS. Instructs the model to ignore score-overriding instructions embedded in proposals and to flag manipulation attempts in the `risks` array.
- **Security event logging**: `security-log.ts` defines an `injection_attempt` event type, and the orchestrator logs `score_anomaly` events when all scores are suspiciously high/low or diverge extremely.
- **PII detection** at submission time (`api/proposals/route.ts` lines 48-59): Email, phone, CPF, and IP patterns are scanned and rejected before proposals enter the pipeline.
- **DOMPurify sanitization** (`sanitize-html.ts`): Available for display-layer XSS prevention.
- **Anomaly detection** (`orchestrator.ts` lines 49-62): Post-hoc checks for ALL_SCORES_SUSPICIOUSLY_HIGH (>=9500), ALL_SCORES_SUSPICIOUSLY_LOW (<=500), and EXTREME_SCORE_DIVERGENCE (>5000 range).

### Findings

| ID | Severity | Finding |
|----|----------|---------|
| INJ-01 | MEDIUM | **No pre-LLM input sanitization for prompt injection patterns.** Proposal text is passed directly to the LLM via `buildProposalContext()` without any stripping of prompt-injection markers (e.g., `SYSTEM:`, `ASSISTANT:`, `</s>`, `[INST]`, XML-like closing tags). The F-010 instruction is a soft defense; a determined attacker could use role-delimiter injection that Claude may honor despite the preamble. |
| INJ-02 | LOW | **Manipulation flag is advisory only.** The prompt says "flag them in your risks array" but there is no downstream code that inspects `risks` for injection flags and escalates or blocks. A flagged injection attempt still produces a score that gets aggregated and published on-chain. |
| INJ-03 | LOW | **`injection_attempt` event type defined but never emitted.** `security-log.ts` defines `type: "injection_attempt"` but no code path calls `logSecurityEvent` with that type. The detection is entirely delegated to the LLM's self-reporting via the risks array, with no server-side pattern matching. |

### Recommendations

1. Add a server-side scan of proposal text for common prompt injection patterns before it reaches the LLM. Log matches as `injection_attempt` events. This does not need to block submission -- just instrument the threat surface.
2. After evaluation completes, check the `risks` array for injection-related keywords and escalate (e.g., flag the proposal for human review, log a security event).
3. For Claude specifically: the anti-injection block is well-positioned in the system prompt. Claude models respect system-prompt hierarchy more reliably than GPT-4o, so the current preamble placement is appropriate for the model choice.

---

## 2. Rubric Quality

### What is present

Each of the 4 dimension prompts specifies 5 evaluation criteria plus an "IPE City lens" value-alignment question. Dimensions:

- **tech** (25%): Architecture soundness, tech stack appropriateness, implementation plan, scalability, technical innovation. Lens: pro-technology.
- **impact** (30%): Problem significance, beneficiary scope, measurable outcomes, long-term value, ecosystem contribution. Lens: pro-human-progress.
- **cost** (20%): Budget justification, resource allocation, cost-to-impact ratio, timeline realism, efficiency signals. Lens: fiscal accountability.
- **team** (25%): Relevant experience, team composition, track record, IPE Village participation, community contribution plan. Lens: pro-freedom/builder ethos.

### Findings

| ID | Severity | Finding |
|----|----------|---------|
| RUB-01 | MEDIUM | **No per-criterion scoring.** The rubric lists 5 criteria per dimension plus a lens question, but the output schema only captures a single `score` per dimension. The model must mentally aggregate 5-6 sub-scores into one number with no structured decomposition. This reduces transparency and makes calibration harder. |
| RUB-02 | LOW | **Criteria lack scoring anchors.** The prompt provides overall calibration bands (8000-10000 = Exceptional, etc.) but does not define what "Exceptional" means for each specific criterion. For example, what does a 9000 look like for "Architecture soundness" vs. "Scalability considerations"? |
| RUB-03 | LOW | **IPE lens is unstructured in rubric but structured in output.** The prompt mentions the IPE lens as free-text guidance, but the Zod schema captures `ipeAlignment` as three separate 0-100 scores (`proTechnology`, `proFreedom`, `proHumanProgress`). The prompt does not explain this 0-100 scale or provide calibration for it. The model must infer what these numbers mean. |
| RUB-04 | INFO | **`scoreDecimals: z.literal(2)` is always 2.** This field adds no information -- it is a constant. It wastes output tokens and could confuse the model about whether it should produce decimal scores. |

### Recommendations

1. Consider adding sub-scores per criterion in the schema (even if only for transparency -- the aggregate can remain weighted). This would make justifications more auditable.
2. Add per-criterion anchoring examples, even brief ones. Claude models respond well to concrete examples in rubrics.
3. Add explicit calibration text for the `ipeAlignment` fields: "Rate from 0 (no alignment) to 100 (strongly advances this value). 50 = neutral."
4. Remove `scoreDecimals` or make it part of the schema description rather than an output field.

---

## 3. Calibration

### What is present

- **5-band calibration anchors** in the shared preamble: Exceptional (8000-10000), Strong (6500-7999), Adequate (5000-6499), Weak (3000-4999), Insufficient (0-2999).
- **Basis-point scale** (0-10000) with Zod validation enforcing min/max.
- **Scoring bands** defined in `constants.ts` match the prompt anchors exactly.

### Findings

| ID | Severity | Finding |
|----|----------|---------|
| CAL-01 | MEDIUM | **No worked examples (few-shot calibration).** The prompt provides band definitions but no example evaluations. Claude Sonnet 4 benefits significantly from 1-2 concrete scored examples per dimension to anchor its internal scale. Without them, scores will cluster around the model's prior (likely 5000-7500 range), reducing discriminative power. |
| CAL-02 | LOW | **Band boundaries may cause clustering.** The 5 bands create natural "magnet" points. Models tend to pick round numbers near band centers (e.g., 7000, 5500, 4000) rather than using the full range. Adding "use the full range within each band" guidance could help. |
| CAL-03 | INFO | **No inter-run consistency mechanism.** Each evaluation is independent with no reference to prior scored proposals. This is correct for independence but means calibration drift across time is undetectable. The anomaly detection in the orchestrator partially addresses this. |

### Recommendations

1. Add 1-2 few-shot examples per dimension showing a scored proposal with justification. This is the single highest-impact improvement for Claude models.
2. Add explicit instruction: "Use the full range within each band. A score of 8000 and 9500 are both Exceptional but meaningfully different."

---

## 4. Bias Detection

### What is present

- **Anti-rationalization red flags** (lines 22-28): Five explicit self-check patterns ("The proposal implies...", "It's reasonable to assume...", etc.) that instruct the model to stop and re-evaluate.
- **Evidence-only rule**: "You MUST cite specific evidence" and "MUST NOT invent evidence."
- **Independent evaluation**: "MUST NOT reference other judges' evaluations."

### Findings

| ID | Severity | Finding |
|----|----------|---------|
| BIAS-01 | MEDIUM | **IPE value alignment creates systematic bias toward technology-heavy proposals.** The three IPE lenses (pro-technology, pro-freedom, pro-human-progress) and the `ipeAlignment` scoring systematically advantage proposals that use tech-forward framing. A community garden project with high impact but low tech novelty would score lower on the tech dimension AND receive low `proTechnology` alignment, effectively double-penalizing it. |
| BIAS-02 | LOW | **"Builder ethos" in team dimension conflates execution style with capability.** The team lens asks "Are these builders who ship, not just planners?" This biases against research-oriented or community-organizing proposals where "shipping" is not the primary mode of work, despite being valid grant categories (the system supports "research", "community", "education", "creative" categories). |
| BIAS-03 | LOW | **Prior IPE participation creates incumbency advantage.** The team rubric evaluates "IPE Village participation" and `buildProposalContext` explicitly labels proposals as "returning Architect" or "first time." While relevant context, it can bias toward incumbents. The prompt does not instruct the model to avoid penalizing first-time applicants. |
| BIAS-04 | INFO | **No demographic or identity debiasing.** The prompt does not instruct the model to evaluate proposals independent of team member names (which may signal gender, ethnicity, or nationality). This is standard for current LLM judge systems but worth noting. |

### Recommendations

1. Add a debiasing instruction: "Evaluate the proposal's merits independent of team member names, nationalities, or demographics. Focus on stated credentials and evidence."
2. Clarify that IPE alignment scores should not override dimension scores -- they are supplementary context, not penalty multipliers.
3. Add a note in the team dimension: "First-time applicants should not be penalized for lack of prior IPE participation. Evaluate based on stated experience and credentials."

---

## 5. Prompt Transparency Compliance

### What is present

- **Full prompt transparency metadata on IPFS** (route.ts lines 115-141): Every evaluation published to IPFS includes a `promptTransparency` object containing:
  - `systemPrompt`: The exact prompt text sent to the model
  - `userMessage`: The exact proposal context sent
  - `model`: Model identifier
  - `structuredOutputSchema`: Schema name reference
  - `temperature`: Noted as "default"
  - `retryAttempts` / `maxRetries` / `timeoutMs`: Execution metadata
  - `evaluatedAt`: Timestamp
  - `methodology`: Free-text description of the evaluation approach
  - `limitations`: Array of 3 honest limitations

### Findings

| ID | Severity | Finding |
|----|----------|---------|
| PT-01 | GOOD | **Excellent prompt transparency.** This is the strongest prompt transparency implementation across all three worktrees. The full system prompt and user message are stored immutably on IPFS alongside the evaluation result. This means any evaluation can be independently reproduced or audited. |
| PT-02 | GOOD | **Honest limitations disclosure.** The three stated limitations are accurate and non-trivial: LLM variance, prompt-anchored calibration, and single-source input. |
| PT-03 | LOW | **Temperature recorded as string "default" rather than actual value.** Mastra/Anthropic SDK defaults should be resolved to the actual temperature value (likely 0 or 1) for reproducibility. |
| PT-04 | LOW | **`structuredOutputSchema` is a string name, not the schema itself.** For full reproducibility, the actual Zod schema definition (or its JSON Schema equivalent) should be included. Schema changes between versions would make the name reference ambiguous. |
| PT-05 | INFO | **No `.prompt.md` companion file for the prompts themselves.** The CLAUDE.md requires `.prompt.md` files for AI-generated documents. While the prompts in `prompts.ts` are code (not docs), the prompt design rationale is not documented anywhere. |

### Recommendations

1. Resolve temperature to its actual numeric value before storing.
2. Include the JSON Schema representation of `JudgeEvaluationSchema` in the IPFS payload for full reproducibility.
3. Consider adding a `docs/judge-prompts.prompt.md` documenting the rationale behind the prompt design choices (why these 5 criteria, why these calibration bands, why anti-rationalization red flags).

---

## 6. Claude Sonnet 4 vs GPT-4o: Model-Specific Prompt Engineering

This worktree uses `claude-sonnet-4-20250514` while the other worktrees use `gpt-4o`. Key differences in how the prompts should be (and are) tuned:

### What works well for Claude

| Aspect | Assessment |
|--------|------------|
| **System prompt hierarchy** | The anti-injection instructions in the system prompt are well-positioned. Claude models respect system/user prompt boundaries more strictly than GPT-4o, making the F-010 defense more effective here. |
| **Structured output via Zod** | Claude Sonnet 4 handles Zod-schema structured output natively through the Anthropic SDK. The schema is clean and well-constrained. |
| **Anti-rationalization red flags** | This section is unique to the Superpower worktree and is well-suited for Claude, which tends to be more self-reflective about its reasoning process. Claude will actually "catch itself" on these patterns more reliably than GPT-4o. |
| **IPE alignment values** | Claude handles multi-dimensional scoring well when the dimensions are clearly defined. The three IPE values are distinct and non-overlapping. |

### What could be improved for Claude

| Aspect | Recommendation |
|--------|----------------|
| **Few-shot examples** | Claude Sonnet 4 calibrates significantly better with concrete examples. The absence of few-shot examples is a bigger gap for Claude than it would be for GPT-4o, because Claude is more sensitive to prompt anchoring. |
| **XML structure** | Claude models parse XML-structured prompts more reliably than markdown. Consider wrapping rubric sections in `<rubric>`, `<criteria>`, `<calibration>` tags for clearer semantic boundaries. GPT-4o prefers markdown; Claude prefers XML. |
| **Explicit JSON output format** | While Zod structured output handles this, Claude benefits from seeing an example JSON shape in the prompt itself. This reduces schema-mismatch retries. |
| **Temperature** | For scoring consistency, Claude Sonnet 4 should use temperature 0. The current code uses Mastra defaults (which may not be 0). This should be explicitly set. |

---

## 7. Test Coverage

The file `src/__tests__/lib/judge-prompts.test.ts` contains 4 tests:

1. Anti-injection guard presence (F-010 string check)
2. Unique prompts per dimension
3. Calibration anchor presence in all prompts
4. IPE City lens presence in all prompts

### Assessment

These are structural/content tests -- they verify the prompt contains expected strings but do not test prompt effectiveness. This is appropriate for unit tests. Prompt quality testing would require LLM-in-the-loop evaluation tests (which are expensive and non-deterministic).

**Missing test:** No test verifies that `buildProposalContext` output does not contain prompt injection delimiters or that the proposal fields are properly escaped/formatted.

---

## 8. Summary Scorecard

| Category | Rating | Key Issue |
|----------|--------|-----------|
| Anti-Injection | 7/10 | Good prompt-level defense; missing server-side pattern detection and downstream escalation |
| Rubric Quality | 6/10 | Clear criteria but no per-criterion scoring or anchoring; IPE alignment scale undocumented |
| Calibration | 5/10 | Band definitions present but no few-shot examples (critical gap for Claude) |
| Bias Detection | 6/10 | Strong anti-rationalization; IPE values create systematic pro-tech bias; incumbency advantage |
| Prompt Transparency | 9/10 | Best-in-class among all three worktrees; full prompt+context stored on IPFS |
| Model-Specific Tuning | 6/10 | Correct model choice; anti-rationalization is Claude-appropriate; missing XML structure, few-shot, explicit temperature |
| Test Coverage | 7/10 | Good structural tests; no prompt injection input tests |

**Overall: 6.6/10** -- A solid foundation with excellent transparency. The two highest-impact improvements would be (1) adding few-shot calibration examples and (2) restructuring prompts with XML tags for better Claude parsing.
