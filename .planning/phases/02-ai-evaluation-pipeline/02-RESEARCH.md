# Phase 2: AI Evaluation Pipeline - Research

**Researched:** 2026-04-12
**Domain:** AI/LLM structured output, durable workflows, real-time subscriptions, prompt engineering
**Confidence:** HIGH

## Summary

Phase 2 builds the core AI evaluation pipeline: 4 independent Judge Agents evaluate grant proposals across Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Each agent produces structured output (score 0-100, justification, recommendation, key findings) via OpenAI's structured output with Zod schemas. The evaluation is orchestrated as a durable Convex workflow with parallel agent execution, real-time progress via Convex subscriptions, and a complete audit trail.

The stack is fully decided: OpenAI SDK v6 direct with `zodResponseFormat` for structured output, `@convex-dev/workflow` for durable orchestration, and Convex real-time subscriptions for live progress. The highest-uncertainty area is prompt engineering for calibrated scoring rubrics -- the rubric bands (0-20, 21-40, etc.) need careful wording to produce consistent, non-inflated scores.

**Primary recommendation:** Define Zod schemas as the single source of truth for evaluation output, use them simultaneously for OpenAI structured output, Convex validators (via convex-helpers), and TypeScript types. Orchestrate the 4 agents as parallel steps in a Convex durable workflow, writing each result to the database as it completes so Convex subscriptions push real-time progress to the UI.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVAL-01 | 4 independent Judge Agents evaluate each proposal (Tech 25%, Impact 30%, Cost 20%, Team 25%) | Convex workflow parallel steps pattern; each agent is a separate Convex action |
| EVAL-02 | Each agent produces structured output: score (0-100), justification, recommendation, key findings (max 3) | OpenAI zodResponseFormat with Zod schema; auto-parsed typed response |
| EVAL-03 | Weighted aggregate score (S0) computed from 4 dimension scores | Convex mutation after all 4 steps complete; simple weighted sum |
| EVAL-04 | IPE City values embedded as evaluation context | System prompt engineering; values injected into each agent's system message |
| EVAL-05 | Structured scoring rubric with calibrated bands per dimension | Prompt engineering; rubric bands defined as constants, embedded in prompts |
| EVAL-06 | Evaluation audit trail stored (prompt sent, model used, raw response, parsed score, timestamp) | Convex schema with audit fields; action logs raw response before parsing |
| EVAL-07 | Real-time evaluation progress visible to users | Convex subscriptions on evaluation records; each agent writes result on completion |
| EVAL-08 | Before/after prompt comparison (naive vs structured) | Static demo comparison; run same proposal through naive prompt + structured prompt |
| UI-01 | Evaluation results page with per-dimension breakdown | Next.js page with Convex useQuery subscription |
| UI-03 | Progressive "live judging" experience | Convex useQuery on evaluations table; UI shows agents completing as records appear |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun as package manager and runner
- **Framework:** Next.js App Router on Vercel
- **Language:** TypeScript strict mode -- no `any`, no `as Type`, no `!`, no `@ts-ignore`
- **Database:** Convex DB with domain-driven `server/` structure
- **AI provider:** OpenAI direct (GPT-4o) via OpenAI SDK -- NOT AI SDK, NOT Anthropic
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod at all boundaries
- **Prompt transparency:** AI-generated docs need `.prompt.md` companions
- **Naming:** Semantic business-domain names, no `Helper`/`Util` suffixes
- **Code style:** Guard clauses over nesting, no magic numbers, no flag arguments, grouped parameters

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | 6.34.0 | OpenAI API client | Direct SDK with native Zod structured output support via `zodResponseFormat`. Supports both Zod v3 and v4 auto-detected at runtime. [VERIFIED: npm registry] |
| convex | 1.35.1 | Database + backend functions | Real-time subscriptions, actions for external API calls, scheduling. [VERIFIED: npm registry] |
| @convex-dev/workflow | 0.3.9 | Durable evaluation workflow | Orchestrates 4 parallel agent steps with retry, exactly-once mutations, and completion handlers. [VERIFIED: npm registry] |
| zod | 3.25.76 (latest 3.x) | Schema validation + structured output | Single source of truth for evaluation schemas: OpenAI structured output, Convex validators, TypeScript types. Use 3.x to avoid any edge-case issues with convex-helpers zod4 module. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| convex-helpers | 0.1.114 | Zod-to-Convex validator conversion | Convert Zod evaluation schemas to Convex validators; custom function wrappers. [VERIFIED: npm registry] |

### Zod Version Decision

**Use Zod 3.25.x (not Zod 4).** Rationale:

1. OpenAI SDK 6.34 supports both `^3.25` and `^4.0` [VERIFIED: npm peerDependencies]
2. convex-helpers has a `zod4` module but it is newer and less battle-tested [CITED: github.com/get-convex/convex-helpers/issues/558]
3. Zod 3.x is the conservative choice that avoids any integration friction
4. If Zod 4 is desired later, OpenAI SDK auto-detects version and convex-helpers has `server/zod4` import path [VERIFIED: openai-node source, convex-helpers docs]

**Installation:**
```bash
bun add openai@6 convex @convex-dev/workflow zod@3 convex-helpers
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
convex/
  convex.config.ts          # Workflow component registration
  schema.ts                 # Evaluation tables added
  index.ts                  # WorkflowManager export
  evaluations/
    schemas.ts              # Zod schemas (single source of truth)
    workflow.ts             # Durable evaluation workflow definition
    agents.ts               # 4 judge agent actions (OpenAI calls)
    mutations.ts            # Write evaluation results, compute aggregate
    queries.ts              # Read evaluations, progress status
    prompts.ts              # System prompts, rubrics, IPE City values
    constants.ts            # Weights, score bands, model config
src/
  app/
    proposals/[id]/
      evaluation/
        page.tsx            # Evaluation results page (EVAL UI-01)
      components/
        evaluation-progress.tsx   # Live judging progress (UI-03)
        dimension-card.tsx        # Per-dimension score display
        aggregate-score.tsx       # Weighted aggregate display
        prompt-comparison.tsx     # Before/after demo (EVAL-08)
  lib/
    evaluation-types.ts     # Re-export types from Convex schemas
```

### Pattern 1: Zod as Single Source of Truth

**What:** Define evaluation output schema once in Zod, derive all other representations.
**When to use:** Always for structured AI output that must be validated, stored, and displayed.

```typescript
// convex/evaluations/schemas.ts
import { z } from "zod";

const RECOMMENDATIONS = [
  "strong_approve",
  "approve",
  "needs_revision",
  "reject",
] as const;

export const evaluationOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  justification: z.string(),
  recommendation: z.enum(RECOMMENDATIONS),
  keyFindings: z.array(z.string()).max(3),
});

// TypeScript type inferred automatically
export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>;
```

### Pattern 2: OpenAI Structured Output with zodResponseFormat

**What:** Pass Zod schema to OpenAI and get typed, validated response.
**When to use:** Every judge agent call.

```typescript
// convex/evaluations/agents.ts
// Source: https://github.com/openai/openai-node/blob/master/helpers.md
"use node";

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { evaluationOutputSchema } from "./schemas";

const openai = new OpenAI(); // uses OPENAI_API_KEY env var

export async function evaluateDimension(
  systemPrompt: string,
  proposalText: string,
): Promise<{
  parsed: EvaluationOutput;
  rawResponse: string;
  model: string;
}> {
  const completion = await openai.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: proposalText },
    ],
    response_format: zodResponseFormat(evaluationOutputSchema, "evaluation"),
    temperature: 0.3, // lower temp for more consistent scoring
  });

  const message = completion.choices[0]?.message;
  if (!message?.parsed) {
    throw new Error("Failed to parse structured output");
  }

  return {
    parsed: message.parsed,
    rawResponse: JSON.stringify(message),
    model: completion.model,
  };
}
```

### Pattern 3: Convex Durable Workflow with Parallel Steps

**What:** 4 judge agents run as parallel durable workflow steps.
**When to use:** Evaluation orchestration.

```typescript
// convex/evaluations/workflow.ts
// Source: https://github.com/get-convex/workflow/blob/main/README.md

import { workflow } from "../index";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const evaluateProposal = workflow
  .define({
    args: { proposalId: v.id("proposals") },
    returns: v.null(),
  })
  .handler(async (step, args) => {
    // Run all 4 judges in parallel
    const [tech, impact, cost, team] = await Promise.all([
      step.runAction(internal.evaluations.agents.evaluateTech, {
        proposalId: args.proposalId,
      }),
      step.runAction(internal.evaluations.agents.evaluateImpact, {
        proposalId: args.proposalId,
      }),
      step.runAction(internal.evaluations.agents.evaluateCost, {
        proposalId: args.proposalId,
      }),
      step.runAction(internal.evaluations.agents.evaluateTeam, {
        proposalId: args.proposalId,
      }),
    ]);

    // Compute aggregate score (mutation for exactly-once guarantee)
    await step.runMutation(
      internal.evaluations.mutations.computeAggregate,
      { proposalId: args.proposalId },
    );

    return null;
  });
```

### Pattern 4: Real-Time Progress via Convex Subscriptions

**What:** Each agent writes its result to the database immediately on completion; UI subscribes and updates.
**When to use:** EVAL-07, UI-03 requirements.

The key insight: each agent action writes to the `evaluations` table via `ctx.runMutation` as soon as it completes. The client subscribes to a query that returns all evaluations for a proposal. As each agent finishes, the subscription fires and the UI updates. No polling, no WebSockets setup needed -- Convex handles this natively.

```typescript
// convex/evaluations/queries.ts
export const getEvaluationProgress = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();

    return {
      completedCount: evaluations.length,
      totalCount: 4,
      dimensions: evaluations,
      isComplete: evaluations.length === 4,
    };
  },
});

// Client component subscribes
// const progress = useQuery(api.evaluations.queries.getEvaluationProgress, { proposalId });
```

### Pattern 5: Audit Trail Storage

**What:** Store the complete evaluation context for reproducibility (EVAL-06).
**When to use:** Every judge agent evaluation.

```typescript
// convex/schema.ts (evaluation-related tables)
evaluations: defineTable({
  proposalId: v.id("proposals"),
  dimension: v.union(
    v.literal("technical"),
    v.literal("impact"),
    v.literal("cost"),
    v.literal("team"),
  ),
  // Evaluation output
  score: v.number(),
  justification: v.string(),
  recommendation: v.string(),
  keyFindings: v.array(v.string()),
  // Audit trail (EVAL-06)
  promptSent: v.string(),
  modelUsed: v.string(),
  rawResponse: v.string(),
  evaluatedAt: v.number(), // timestamp
})
  .index("by_proposal", ["proposalId"])
  .index("by_proposal_dimension", ["proposalId", "dimension"]),

evaluationAggregates: defineTable({
  proposalId: v.id("proposals"),
  weightedScore: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("evaluating"),
    v.literal("evaluated"),
  ),
  workflowId: v.optional(v.string()),
  completedAt: v.optional(v.number()),
})
  .index("by_proposal", ["proposalId"]),
```

### Anti-Patterns to Avoid

- **Calling OpenAI from mutations:** Mutations are transactional and cannot make external API calls. OpenAI calls MUST be in actions (or Convex `"use node"` actions). [CITED: docs.convex.dev/functions/actions]
- **Calling actions directly from client:** Anti-pattern per Convex docs. Use mutations to capture intent, then schedule actions or use workflows. [CITED: docs.convex.dev/functions/actions]
- **Non-deterministic workflow handlers:** The workflow handler replays deterministically. Do NOT use `Date.now()`, `Math.random()`, or conditional logic based on external state inside the handler. Side effects belong in steps. [CITED: github.com/get-convex/workflow README]
- **Storing parsed output only:** Must also store raw response and prompt for audit trail (EVAL-06). Store before parsing to avoid losing data on parse failure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workflow orchestration | Custom scheduler with retries | @convex-dev/workflow | Handles retries, exactly-once mutations, parallel step limits, and persistence across restarts |
| Structured LLM output | JSON.parse + manual validation | zodResponseFormat | OpenAI SDK handles schema conversion, parsing, and validation; refusal detection built-in |
| Real-time progress | Polling or WebSocket server | Convex subscriptions (useQuery) | Automatic push updates on data changes, zero setup |
| Zod-to-Convex schema | Manual parallel type definitions | convex-helpers zodToConvex | Keeps Zod and Convex validators in sync automatically |
| Score aggregation math | Custom weighted average | Simple constants object | Define weights as named constants; the math is trivial, the error is in getting weights wrong |

**Key insight:** The entire evaluation pipeline is an orchestration problem, not a computation problem. Every piece already has a library solution -- the value is in correct wiring and prompt engineering.

## Common Pitfalls

### Pitfall 1: Score Inflation from LLMs

**What goes wrong:** LLMs default to generating high scores (70-90 range) regardless of proposal quality. Evaluations cluster at the top and lose discriminative value.
**Why it happens:** LLMs are trained on helpful/positive text; they naturally avoid harsh criticism.
**How to avoid:** Calibrate prompts with explicit rubric bands and anchor examples. Include the instruction "Use the full 0-100 range. A score of 50 means average. Most proposals should score between 30-70." Provide concrete examples for each band (0-20: "fundamentally flawed", 81-100: "exceptional, no significant weaknesses").
**Warning signs:** All test evaluations scoring above 60 regardless of input quality.

### Pitfall 2: Cross-Contamination Between Dimensions

**What goes wrong:** A technically weak but high-impact proposal gets high tech scores because the model conflates impact with feasibility.
**Why it happens:** When all 4 dimensions are in one prompt, the model bleeds positive sentiment across categories.
**How to avoid:** Run each dimension as a completely independent agent call with a dimension-specific system prompt that explicitly instructs the model to ONLY consider that dimension. This is already the architecture (4 separate actions), but the prompts must reinforce it. [ASSUMED]
**Warning signs:** All 4 dimension scores within 5 points of each other on every proposal.

### Pitfall 3: Convex Action "use node" Gotcha

**What goes wrong:** OpenAI SDK requires Node.js APIs. Without `"use node"` directive at the top of the file, the action fails in Convex's default runtime.
**Why it happens:** Convex runs actions in a V8 isolate by default, not full Node. The `openai` package needs Node-specific APIs.
**How to avoid:** Add `"use node";` as the first line in any file that imports `openai`. Note: this means you cannot define queries or mutations in the same file.
**Warning signs:** Runtime errors about missing `process`, `Buffer`, or `crypto` in Convex actions.

### Pitfall 4: Workflow Determinism Violations

**What goes wrong:** Workflow handler uses `Date.now()` or reads env vars directly, causing replay failures.
**Why it happens:** The workflow handler replays from the beginning on each step completion. Non-deterministic code produces different results on replay.
**How to avoid:** All side effects (timestamps, random values, external reads) must be inside step functions (runQuery, runMutation, runAction). The handler itself must be pure orchestration logic.
**Warning signs:** Workflow completes but produces inconsistent results; workflow gets stuck in "running" state.

### Pitfall 5: Structured Output Refusal Handling

**What goes wrong:** OpenAI refuses to generate the structured output (e.g., content policy) and returns null parsed content.
**Why it happens:** The model may refuse based on content in the proposal text.
**How to avoid:** Check `message.refusal` before accessing `message.parsed`. Log the refusal reason and mark that dimension as "evaluation_failed" rather than crashing the workflow.
**Warning signs:** Null parsed output with no error thrown; silent evaluation failures.

### Pitfall 6: Large Prompt + Proposal Token Limits

**What goes wrong:** System prompt (rubric + values + instructions) plus proposal text exceeds context or eats into output budget.
**Why it happens:** Rubrics are verbose. Proposals can be long. GPT-4o has 128K context but output is limited.
**How to avoid:** Keep system prompts under 2000 tokens. Truncate proposal text if needed (with warning). Use `max_tokens` parameter to ensure output budget. Consider summarizing very long proposals before evaluation.
**Warning signs:** Truncated justifications, incomplete key findings arrays.

## Code Examples

### Workflow Component Setup

```typescript
// convex/convex.config.ts
// Source: https://github.com/get-convex/workflow/blob/main/README.md
import workflow from "@convex-dev/workflow/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workflow);
export default app;
```

```typescript
// convex/index.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow);
```

### Scoring Rubric Constants

```typescript
// convex/evaluations/constants.ts

export const DIMENSION_WEIGHTS = {
  technical: 0.25,
  impact: 0.30,
  cost: 0.20,
  team: 0.25,
} as const;

export const SCORE_BANDS = {
  exceptional: { min: 81, max: 100, label: "Exceptional" },
  strong: { min: 61, max: 80, label: "Strong" },
  adequate: { min: 41, max: 60, label: "Adequate" },
  weak: { min: 21, max: 40, label: "Weak" },
  insufficient: { min: 0, max: 20, label: "Insufficient" },
} as const;

export const IPE_CITY_VALUES = `
IPE City core values that should inform evaluation:
1. Pro-technological innovation: Favor proposals that advance technology
2. Pro-freedom: Favor proposals that increase individual autonomy and decentralization
3. Pro-human progress: Favor proposals that measurably improve human capability and quality of life
`;

export const MODEL_CONFIG = {
  model: "gpt-4o" as const,
  temperature: 0.3,
  maxTokens: 1500,
};
```

### Triggering Evaluation from Proposal Submission

```typescript
// convex/evaluations/mutations.ts
// Anti-pattern avoided: client does NOT call action directly.
// Instead, mutation captures intent and starts workflow.

export const startEvaluation = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    // Check proposal exists and is in "submitted" status
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Create aggregate record (tracks overall status)
    const aggregateId = await ctx.db.insert("evaluationAggregates", {
      proposalId: args.proposalId,
      weightedScore: 0,
      status: "evaluating",
    });

    // Update proposal status
    await ctx.db.patch(args.proposalId, { status: "evaluating" });

    // Start the durable workflow
    const workflowId = await workflow.start(
      ctx,
      internal.evaluations.workflow.evaluateProposal,
      { proposalId: args.proposalId },
    );

    await ctx.db.patch(aggregateId, { workflowId: String(workflowId) });

    return aggregateId;
  },
});
```

### Before/After Prompt Comparison (EVAL-08)

```typescript
// convex/evaluations/agents.ts

// Naive prompt (for comparison demo)
const NAIVE_PROMPT = "Evaluate this grant proposal and give it a score.";

// Structured prompt (the real one)
const STRUCTURED_PROMPT = `You are a Technical Feasibility Judge for IPE City grants.

## Your Role
Evaluate ONLY the technical feasibility of the proposal. Do NOT consider impact, cost, or team -- those are evaluated by other judges.

## Scoring Rubric
- 81-100 (Exceptional): Proven technology stack, clear architecture, realistic timeline with buffer
- 61-80 (Strong): Solid technical approach with minor gaps in architecture or timeline
- 41-60 (Adequate): Feasible but with significant technical risks or unclear implementation details
- 21-40 (Weak): Major technical challenges unaddressed, unclear how this would be built
- 0-20 (Insufficient): Technically infeasible or no technical detail provided

## Scoring Guidance
Use the full 0-100 range. A score of 50 means adequate. Most proposals should score between 30-70. Scores above 80 require exceptional technical merit with no significant gaps.

${IPE_CITY_VALUES}

Evaluate the following proposal:`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON mode + manual parsing | Structured Output with Zod via `zodResponseFormat` | OpenAI Aug 2024, SDK v4.55+ | Guaranteed valid JSON matching schema; no parse failures |
| Manual retry logic for LLM calls | Durable workflows with step-level retry | @convex-dev/workflow 0.3.x, 2024 | Automatic retry, persistence, parallel execution |
| Polling for evaluation status | Convex real-time subscriptions | Core Convex feature | Zero-latency UI updates, no polling infrastructure |
| Zod 3 only | Zod 4 with v3 compat subpath | Zod 4.0, early 2025 | Can install v4, use `zod/v3` import for libraries not yet upgraded |

**Deprecated/outdated:**
- `client.chat.completions.create()` for structured output: Use `.parse()` method instead for automatic Zod validation
- `JSON.parse()` + manual Zod `.parse()`: The SDK does both steps via `.parse()` method

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Temperature 0.3 produces consistent scoring | Code Examples | If scoring is too deterministic or too random, adjust between 0.1-0.5 |
| A2 | System prompts under 2000 tokens are sufficient for rubric + values + instructions | Pitfall 6 | May need to condense rubric or split into multi-turn |
| A3 | Cross-contamination is prevented by separate agent calls | Pitfall 2 | If scores still correlate too strongly, may need more aggressive prompt isolation |
| A4 | GPT-4o is the right model for all 4 dimensions | Standard Stack | Could use gpt-4o-mini for cost savings on simpler dimensions |
| A5 | Max 3 key findings is sufficient per dimension | Requirements | Users may want more detail; 3 keeps output focused |

## Open Questions

1. **Prompt engineering iteration strategy**
   - What we know: Rubric bands are defined (0-20, 21-40, etc.) per EVAL-05
   - What's unclear: How many iterations of prompt tuning are needed to get calibrated scores
   - Recommendation: Start with a single well-structured prompt per dimension, test with 2-3 sample proposals of varying quality, adjust rubric wording based on score distribution

2. **EVAL-08 implementation scope**
   - What we know: Need before/after comparison of naive vs structured prompt
   - What's unclear: Is this a live demo feature (user can toggle) or a static comparison page?
   - Recommendation: Implement as a static comparison section on the evaluation results page showing pre-computed examples. Running both prompts on every submission doubles API cost for no user value.

3. **Error handling for individual agent failures**
   - What we know: @convex-dev/workflow supports step-level retry
   - What's unclear: What if an agent consistently fails (content policy, API errors)?
   - Recommendation: Configure retry with backoff (3 attempts). If all retries fail, mark that dimension as "failed" and compute aggregate from available dimensions with a warning.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management, runtime | Yes | 1.3.1 | -- |
| Node.js | Convex CLI, OpenAI SDK in actions | Yes | 23.10.0 | -- |
| Docker | Not required this phase | Yes | 24.0.6 | -- |
| OpenAI API key | Judge agent calls | Not checked (env var) | -- | Must be set in Convex dashboard |

**Missing dependencies with no fallback:**
- OPENAI_API_KEY must be configured in Convex dashboard environment variables

**Missing dependencies with fallback:**
- None

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth for v1 (UI-04: public access) |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | All data is public |
| V5 Input Validation | Yes | Zod validation on all evaluation schemas; proposal text sanitized before prompt injection |
| V6 Cryptography | No | Not applicable this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via proposal text | Tampering | Separate system prompt from user content; use OpenAI's structured output mode which constrains output format |
| API key exposure | Information Disclosure | Store OPENAI_API_KEY in Convex environment variables, never in client code; all OpenAI calls via server-side actions |
| Cost abuse (repeated evaluations) | Denial of Service | Rate limit evaluation triggers; check proposal status before starting new evaluation (no re-evaluation of already-evaluated proposals) |

## Sources

### Primary (HIGH confidence)
- [OpenAI Node SDK helpers.md](https://github.com/openai/openai-node/blob/master/helpers.md) - zodResponseFormat patterns, Zod v3/v4 auto-detection
- [OpenAI Node SDK zod.ts source](https://github.com/openai/openai-node/blob/master/src/helpers/zod.ts) - Confirmed dual Zod version support
- [Convex Workflow README](https://github.com/get-convex/workflow/blob/main/README.md) - Workflow definition, parallel steps, retry config
- [Convex Actions docs](https://docs.convex.dev/functions/actions) - Action patterns, anti-patterns, "use node" directive
- npm registry - Version verification for all packages (openai 6.34.0, convex 1.35.1, @convex-dev/workflow 0.3.9, zod 3.25.76, convex-helpers 0.1.114)

### Secondary (MEDIUM confidence)
- [Convex Workflow component page](https://www.convex.dev/components/workflow) - Feature overview and use cases
- [OpenAI Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) - Official structured output documentation
- [Zod v4 versioning docs](https://zod.dev/v4/versioning) - v3 subpath permanence guarantee
- [convex-helpers Zod 4 support issue](https://github.com/get-convex/convex-helpers/issues/558) - Zod 4 compatibility status

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are project decisions from CLAUDE.md, versions verified against npm
- Architecture: HIGH - Patterns derived from official docs of each library
- Pitfalls: MEDIUM - Score inflation and cross-contamination are known LLM challenges but mitigation effectiveness is assumption-based
- Prompt engineering: MEDIUM - Rubric structure is well-understood but calibration requires iteration

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30 days; stack is stable, no fast-moving dependencies)
