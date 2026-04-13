# Mastra Framework Usage Audit — Superpower Worktree

**Auditor:** Mastra Source Auditor (Agent)
**Date:** 2026-04-13
**Scope:** `/Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/superpower/`
**Packages audited:** `@mastra/core` ^1.24.1, `@mastra/evals` ^1.2.1, `ai` ^6.0.158, `@ai-sdk/anthropic` ^3.0.69

---

## Usage Inventory

| Mastra Feature | Available In | Used? | Where Used | Notes |
|---|---|---|---|---|
| `Agent` class | `@mastra/core/agent` | YES | `src/app/api/evaluate/[id]/[dimension]/route.ts:29` | Instantiated per-request inside a retry loop |
| `agent.generate()` with structured output | `@mastra/core/agent` | YES | `route.ts:36-38` | Zod schema via `structuredOutput` option |
| `Workflow` / `createStep` | `@mastra/core/workflows` | NO | — | Manual orchestration in `orchestrator.ts` instead |
| `Mastra` singleton | `@mastra/core/mastra` | NO | — | No central Mastra instance configured |
| Processors (guardrails) | `@mastra/core/processors` | NO | — | Input/output validation done manually in prompts |
| Tracing / Observability | `@mastra/core/observability` | NO | — | No OpenTelemetry or Mastra tracing configured |
| Model fallbacks | `@mastra/core/agent` (config) | NO | — | Single model hardcoded; no failover chain |
| Memory | `@mastra/memory` | NO (not installed) | — | Not applicable for stateless judge evaluations |
| `createFaithfulnessScorer` | `@mastra/evals/scorers/prebuilt` | NO | — | Package installed, never imported |
| `createHallucinationScorer` | `@mastra/evals/scorers/prebuilt` | NO | — | Package installed, never imported |
| `createBiasScorer` | `@mastra/evals/scorers/prebuilt` | NO | — | Package installed, never imported |
| `createPromptAlignmentScorerLLM` | `@mastra/evals/scorers/prebuilt` | NO | — | Package installed, never imported |
| `createToolCallAccuracyScorerCode` | `@mastra/evals/scorers/prebuilt` | NO | — | Package installed, never imported |
| MCP server integration | `@mastra/core/mcp` | NO (not installed) | — | Not applicable |

**Summary:** Of the Mastra features available in the installed packages, only 2 are used (Agent instantiation and structured output generation). The `@mastra/evals` package is a dead dependency — installed but with zero imports anywhere in the codebase.

---

## Detailed Findings

### FINDING 1: `@mastra/evals` Installed But Completely Unused (CRITICAL)

**Severity:** Critical gap
**Location:** `package.json` line declaring `"@mastra/evals": "^1.2.1"`

The project's own CLAUDE.md states the tech stack decision was driven by Mastra's `@mastra/evals` scorer pipeline: *"Separates LLM judgment from deterministic score normalization. Used for all judge agent scoring."* Yet not a single scorer is instantiated or invoked anywhere in the codebase.

The `@mastra/evals` package ships 12 LLM-based scorers directly relevant to an AI judge system:

| Scorer | Relevance to Grant Judges |
|---|---|
| `createFaithfulnessScorer` | Verify judge justifications are grounded in proposal text (not hallucinated) |
| `createHallucinationScorer` | Detect when judges fabricate evidence not present in the proposal |
| `createBiasScorer` | Check for systematic bias in judge outputs (category, team size, budget range) |
| `createPromptAlignmentScorerLLM` | Verify judge output follows the rubric and scoring anchors defined in the prompt |
| `createAnswerRelevancyScorer` | Ensure justifications address the correct dimension |
| `createContextRelevanceScorer` | Verify the judge used relevant parts of the proposal |
| `createCompleteness` scorers | Check all required aspects of the dimension were evaluated |
| `createToxicityScorer` | Guard against hostile or inappropriate judge language |

**Impact:** Without meta-evaluation, there is no automated quality assurance on judge outputs. A judge could hallucinate evidence, ignore scoring anchors, or exhibit systematic bias — and the system would publish the evaluation to IPFS and on-chain without any check.

**Recommendation:** Implement a post-generation scoring pipeline that runs at least `createFaithfulnessScorer`, `createHallucinationScorer`, and `createPromptAlignmentScorerLLM` on every judge output before persisting it. See implementation sketch in Recommendations section.

---

### FINDING 2: Agent Instantiated Per-Request Inside Retry Loop (MISUSE)

**Severity:** Medium
**Location:** `src/app/api/evaluate/[id]/[dimension]/route.ts:29-34`

```typescript
for (let attempt = 0; attempt <= MAX_JUDGE_RETRIES; attempt++) {
  // ...
  const judgeAgent = new Agent({
    id: `judge-${dim}`,
    name: `Judge ${dim}`,
    model: anthropic("claude-sonnet-4-20250514"),
    instructions: getJudgePrompt(dim),
  });
  // ...
}
```

A new `Agent` instance is created on every retry attempt within every request. The Agent class constructor performs initialization work (setting up logging, configuring the model provider, etc.). Since the agent configuration is identical across retries and across requests for the same dimension, this is wasteful.

**Recommendation:** Define four singleton agent instances at module scope (one per dimension). The Agent class is stateless for `generate()` calls — the same instance can serve concurrent requests safely.

```typescript
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";

const judgeAgents: Record<JudgeDimension, Agent> = {
  tech: new Agent({ id: "judge-tech", name: "Judge tech", model: anthropic("claude-sonnet-4-20250514"), instructions: getJudgePrompt("tech") }),
  impact: new Agent({ id: "judge-impact", name: "Judge impact", model: anthropic("claude-sonnet-4-20250514"), instructions: getJudgePrompt("impact") }),
  cost: new Agent({ id: "judge-cost", name: "Judge cost", model: anthropic("claude-sonnet-4-20250514"), instructions: getJudgePrompt("cost") }),
  team: new Agent({ id: "judge-team", name: "Judge team", model: anthropic("claude-sonnet-4-20250514"), instructions: getJudgePrompt("team") }),
};
```

---

### FINDING 3: Manual Orchestration Instead of Mastra Workflow (MISSED OPPORTUNITY)

**Severity:** Medium
**Location:** `src/lib/evaluation/orchestrator.ts`, `src/app/api/evaluate/[id]/route.ts`

The evaluation pipeline is orchestrated manually:
1. `POST /api/evaluate/[id]` sets status to "evaluating" and returns stream URLs
2. Client calls each dimension endpoint individually
3. `POST /api/evaluate/[id]/finalize` checks completeness and aggregates

Mastra provides `Workflow` with `createStep()` that supports:
- **Parallel execution:** `workflow.parallel([techStep, impactStep, costStep, teamStep])` — runs all four judges concurrently with typed inputs/outputs
- **Per-step retry with backoff:** Built into step configuration, replacing the manual `runJudgeWithRetry` function
- **Typed data flow:** Output schemas from judge steps feed directly into an aggregation step
- **Built-in tracing:** Every step execution is traced automatically when a Mastra instance is configured
- **Suspend/resume:** For long-running evaluations that exceed serverless timeouts

The manual approach reimplements what Mastra Workflow provides as first-class abstractions, adding maintenance burden and losing observability.

**Recommendation:** Refactor the evaluation pipeline into a Mastra Workflow:

```typescript
import { Workflow, createStep } from "@mastra/core/workflows";

const judgeStep = (dim: JudgeDimension) => createStep(judgeAgents[dim], {
  retries: MAX_JUDGE_RETRIES,
  structuredOutput: { schema: JudgeEvaluationSchema },
});

const evaluationWorkflow = new Workflow({ id: "grant-evaluation" })
  .parallel([judgeStep("tech"), judgeStep("impact"), judgeStep("cost"), judgeStep("team")])
  .then(aggregateStep);
```

---

### FINDING 4: No Mastra Singleton — Missing Observability and Centralized Config (GAP)

**Severity:** Medium
**Location:** Entire codebase (absence)

The codebase never creates a `Mastra` instance. The `Mastra` class is the central registry that connects agents, workflows, scorers, and observability. Without it:
- No distributed tracing (OpenTelemetry spans for each agent call)
- No centralized logger configuration
- No scorer registration for automated eval runs
- No workflow execution engine

The project has a `logSecurityEvent` utility (`src/lib/security-log.ts`) for anomaly detection, but this is independent of Mastra's observability layer.

**Recommendation:** Create a `src/lib/mastra/index.ts` that instantiates the Mastra singleton:

```typescript
import { Mastra } from "@mastra/core/mastra";

export const mastra = new Mastra({
  agents: { /* judge agents */ },
  workflows: { /* evaluation workflow */ },
  scorers: { /* faithfulness, hallucination, bias, promptAlignment */ },
  logger: { /* configure based on environment */ },
});
```

---

### FINDING 5: No Input/Output Processors (Guardrails) (MISSED OPPORTUNITY)

**Severity:** Low-Medium
**Location:** `src/lib/judges/prompts.ts:16-19` (anti-injection instructions in prompt text)

The codebase handles prompt injection defense purely through prompt instructions (the "ANTI-INJECTION INSTRUCTIONS (F-010)" block in the system prompt). Mastra provides `Processor` (formerly called guardrails) — typed input/output processors that can:
- **Pre-process inputs:** Detect and flag injection attempts before they reach the LLM
- **Post-process outputs:** Validate that outputs conform to scoring anchors, detect anomalous scores, enforce business rules
- **Abort with metadata:** Return structured rejection reasons when guardrails trip

The current prompt-only defense is a single layer. Adding a processor creates defense-in-depth.

**Recommendation:** Implement an input processor that scans proposal text for injection patterns, and an output processor that validates score-justification consistency:

```typescript
const scoreValidator: Processor = {
  id: "score-range-validator",
  process: async ({ output }) => {
    // Verify score matches the confidence/recommendation
    // e.g., "strong_fund" with score < 6500 is suspicious
  },
};
```

---

### FINDING 6: No Model Fallback Configuration (GAP)

**Severity:** Low
**Location:** `src/app/api/evaluate/[id]/[dimension]/route.ts:32`

The agent is hardcoded to `anthropic("claude-sonnet-4-20250514")` with no fallback. The project's CLAUDE.md explicitly states: *"OpenAI provider (failover) — Automatic failover when Anthropic is unavailable. Mastra handles provider failover natively."*

Mastra Agent supports model fallbacks natively:

```typescript
new Agent({
  model: [
    { id: "primary", model: anthropic("claude-sonnet-4-20250514"), maxRetries: 2, enabled: true },
    { id: "fallback", model: openai("gpt-4o"), maxRetries: 2, enabled: true },
  ],
});
```

Yet `@ai-sdk/openai` is not even in `package.json`. The documented failover strategy was never implemented.

---

## Summary Assessment

| Category | Rating | Detail |
|---|---|---|
| Mastra adoption depth | **Shallow** | Only Agent + structured output; 2 of ~15 available features used |
| `@mastra/evals` utilization | **Zero** | Dead dependency — installed, documented as core to the stack, never used |
| Workflow usage | **None** | Manual orchestration reimplements Mastra Workflow capabilities |
| Observability | **None** | No Mastra tracing, no Mastra singleton, custom logging only |
| Guardrails/Processors | **None** | Defense-in-depth relies solely on prompt text |
| Model resilience | **None** | Single provider, no fallback despite documented intent |
| Overall framework utilization | **~13%** | 2 of ~15 meaningful features adopted |

## Priority Recommendations

1. **HIGH — Wire up `@mastra/evals` scorers** for post-generation quality checks (faithfulness, hallucination, bias, prompt-alignment). This is the highest-impact change: it adds automated quality assurance to the judge pipeline that currently has none.

2. **HIGH — Create a `Mastra` singleton** to unlock observability, centralized scorer registration, and workflow execution.

3. **MEDIUM — Refactor to Mastra Workflow** for the 4-judge parallel evaluation pipeline, replacing manual orchestration and retry logic.

4. **MEDIUM — Move Agent instances to module scope** instead of re-instantiating per request per retry.

5. **LOW — Add model fallbacks** per the documented architecture decision (Anthropic primary, OpenAI failover).

6. **LOW — Add input/output Processors** for defense-in-depth against prompt injection and score anomaly detection.

---

## Files Reviewed

- `src/app/api/evaluate/[id]/[dimension]/route.ts` — Primary Mastra usage (Agent + generate)
- `src/app/api/evaluate/[id]/route.ts` — Evaluation trigger (no Mastra)
- `src/app/api/evaluate/[id]/[dimension]/retry/route.ts` — Retry handler (no Mastra)
- `src/app/api/evaluate/[id]/finalize/route.ts` — Finalization (no Mastra)
- `src/app/api/evaluate/[id]/status/route.ts` — Status polling (no Mastra)
- `src/lib/evaluation/orchestrator.ts` — Manual orchestration (no Mastra Workflow)
- `src/lib/judges/prompts.ts` — Judge prompts (no Mastra Processors)
- `src/lib/judges/schemas.ts` — Zod schemas (used with Mastra structured output)
- `src/lib/judges/weights.ts` — Weight computation (pure math, no Mastra)
- `src/lib/constants.ts` — Dimension/scoring constants
- `package.json` — Dependency declarations
- `node_modules/@mastra/core/dist/` — Verified available APIs
- `node_modules/@mastra/evals/dist/` — Verified available scorers
