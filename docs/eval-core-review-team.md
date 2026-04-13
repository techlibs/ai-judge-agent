# Eval Core Review Team

Deep audit of the AI judge evaluation pipeline across all 3 worktrees, using each framework's native review process plus specialized cross-cutting auditors.

**Team name:** `eval-core-review`
**Goal:** Ensure the best possible audit of the agent evaluation core — scoring correctness, prompt quality, Mastra integration, and cross-worktree comparison.

---

## Team Architecture

```
                    ┌─────────────────────────┐
                    │      TEAM LEAD          │
                    │   (you, in main repo)   │
                    │                         │
                    │  Synthesizes findings   │
                    │  from all 9 teammates   │
                    │  into EVAL-CORE-AUDIT.md│
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
   ┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
   │  GSD WORKTREE   │ │ SPECKIT WORKTREE│ │SUPERPOWER WKTREE│
   │  (3 agents)     │ │  (3 agents)     │ │  (3 agents)     │
   └────────┬────────┘ └───────┬────────┘ └───────┬────────┘
            │                   │                   │
   ┌────────┴────────┐ ┌───────┴────────┐ ┌───────┴────────┐
   │eval-pipeline    │ │eval-pipeline   │ │eval-pipeline   │
   │prompt-eng       │ │prompt-eng      │ │prompt-eng      │
   │framework-native │ │framework-native│ │mastra-source   │
   └─────────────────┘ └────────────────┘ └────────────────┘
```

**9 teammates total** — 3 per worktree, each with a distinct audit angle:

| Role | Agent Definition | Focus |
|------|-----------------|-------|
| **Eval Pipeline Auditor** | `.claude/agents/eval-pipeline-auditor.md` | Scoring logic, aggregation, storage integrity, concurrency, edge cases |
| **Prompt Engineering Auditor** | `.claude/agents/prompt-engineering-auditor.md` | Judge prompt quality, anti-injection, rubric calibration, bias, transparency |
| **Framework-Native Reviewer** | Per-framework (see below) | Uses each worktree's own SDD framework review process |
| **Mastra Source Auditor** | `.claude/agents/mastra-source-auditor.md` | Mastra framework usage, evals gap, guardrails, MCP potential (superpower only) |

---

## Per-Worktree Review Strategy

### GSD Worktree (`.worktrees/full-vision-roadmap/`)

**Current State:** Phase 1 complete (contracts + proposals), Phase 2 planned but code exists for evaluation pipeline.
**AI Stack:** Vercel AI SDK + OpenAI gpt-4o (no Mastra)
**Contracts:** 2 (IdentityRegistry, ReputationRegistry)

| Teammate | Agent Type | Prompt |
|----------|-----------|--------|
| `gsd-eval-pipe` | `eval-pipeline-auditor` | Audit the evaluation pipeline at `.worktrees/full-vision-roadmap/`. Key files: `src/lib/evaluation/agents.ts`, `orchestrator.ts`, `schemas.ts`, `constants.ts`, `prompts.ts`, `storage.ts`. Write EVAL-PIPELINE-REVIEW.md at the worktree root. |
| `gsd-prompt-eng` | `prompt-engineering-auditor` | Audit judge prompts at `.worktrees/full-vision-roadmap/src/lib/evaluation/prompts.ts` and `constants.ts`. Write PROMPT-REVIEW.md at the worktree root. |
| `gsd-framework` | (inline instructions) | Use GSD code review methodology. Run `/gsd-code-review` on the evaluation source files in `.worktrees/full-vision-roadmap/`. Focus on `src/lib/evaluation/` and `src/app/api/evaluate/`. Write findings to `.planning/phases/02-REVIEW.md`. |

**Framework-native command:** `/gsd-code-review` targets the evaluation module.

### Speckit Worktree (`.worktrees/speckit/`)

**Current State:** Most advanced — phases 1-9 complete, 6 contracts, 78+ tests, monitoring system, disputes.
**AI Stack:** Vercel AI SDK + OpenAI gpt-4o (no Mastra)
**Contracts:** 6 (full set including Evaluation, Milestone, Dispute, Validation)

| Teammate | Agent Type | Prompt |
|----------|-----------|--------|
| `speckit-eval-pipe` | `eval-pipeline-auditor` | Audit the evaluation pipeline at `.worktrees/speckit/`. Key files: `src/evaluation/orchestrate.ts`, `agents/runner.ts`, `agents/prompts.ts`, `schemas.ts`, `scoring.ts`, `anomaly.ts`, `sanitization.ts`, `dispute-override.ts`. Write EVAL-PIPELINE-REVIEW.md at the worktree root. |
| `speckit-prompt-eng` | `prompt-engineering-auditor` | Audit judge prompts at `.worktrees/speckit/src/evaluation/agents/prompts.ts`. Also check monitoring agent prompt at `src/monitoring/agent-config.ts`. Write PROMPT-REVIEW.md at the worktree root. |
| `speckit-framework` | (inline instructions) | Use Spec Kit analysis methodology. Run `/speckit-analyze` on the evaluation feature artifacts in `.worktrees/speckit/`. Check consistency between spec, plan, and implementation for the evaluation feature. Write findings. |

**Framework-native command:** `/speckit-analyze` checks cross-artifact consistency.

### Superpower Worktree (`.worktrees/superpower/`)

**Current State:** Phase 2 complete — 4 Mastra agents, 150+ unit tests, IPFS + chain publish.
**AI Stack:** Mastra + Anthropic Claude Sonnet 4 (the only worktree using Mastra)
**Contracts:** 3 (Identity, Reputation, Milestone)

| Teammate | Agent Type | Prompt |
|----------|-----------|--------|
| `sp-eval-pipe` | `eval-pipeline-auditor` | Audit the evaluation pipeline at `.worktrees/superpower/`. Key files: `src/lib/judges/prompts.ts`, `schemas.ts`, `weights.ts`, `src/lib/evaluation/orchestrator.ts`, `publish-chain.ts`, `src/app/api/evaluate/[id]/[dimension]/route.ts`. Write EVAL-PIPELINE-REVIEW.md at the worktree root. |
| `sp-prompt-eng` | `prompt-engineering-auditor` | Audit judge prompts at `.worktrees/superpower/src/lib/judges/prompts.ts`. Note: this worktree uses Mastra agents with Claude Sonnet 4 (different model from other worktrees using gpt-4o). Write PROMPT-REVIEW.md at the worktree root. |
| `sp-mastra` | `mastra-source-auditor` | Audit Mastra framework usage at `.worktrees/superpower/`. Check @mastra/core ^1.24.1 and @mastra/evals ^1.2.1 usage. Key agent code: `src/app/api/evaluate/[id]/[dimension]/route.ts`. Mastra is open source (Apache 2.0) at github.com/mastra-ai/mastra. Write MASTRA-REVIEW.md at the worktree root. |

**Framework-native command:** Superpowers code review skill (`/superpowers:requesting-code-review`).

---

## Cross-Worktree Comparison Matrix

After all 9 teammates report, the lead synthesizes these dimensions:

| Dimension | GSD | Speckit | Superpower |
|-----------|-----|---------|------------|
| **AI Provider** | OpenAI gpt-4o | OpenAI gpt-4o | Anthropic Claude Sonnet 4 |
| **Agent Framework** | Vercel AI SDK (raw) | Vercel AI SDK (raw) | Mastra + Vercel AI SDK |
| **Score Scale** | 0-100 (decimal) | 0-10000 (basis points) | 0-10000 (basis points) |
| **Parallel Execution** | Promise.all | Promise.all | Per-route (API-level) |
| **Anti-Injection** | Prompt instructions | Prompt + DOMPurify | Prompt + DOMPurify |
| **Anomaly Detection** | None yet | 3 thresholds + security log | 3 thresholds + security log |
| **IPFS Verification** | Pin only | Pin + verify | Pin + verify + integrity |
| **On-Chain Contracts** | 2 (Identity, Reputation) | 6 (full set) | 3 (Identity, Reputation, Milestone) |
| **Rate Limiting** | None | Upstash (configured) | Upstash (not configured) |
| **Test Coverage** | BDD + some unit | 78+ E2E + unit | 150+ unit + BDD |
| **Monitoring** | None | Full (GitHub, on-chain, social) | None |
| **Dispute Resolution** | None | Implemented | None |
| **Prompt Transparency** | Partial | Partial | Full (IPFS metadata) |
| **Mastra Evals (meta)** | Not installed | Not installed | Installed, NOT used |

---

## Launch Command

### Full Team (9 teammates, ~3M tokens total)

```text
Create an agent team called "eval-core-review" to deeply audit the AI judge evaluation pipeline across 3 worktrees.

Spawn 9 teammates — 3 per worktree:

=== GSD Worktree ===

1. Teammate "gsd-eval-pipe" using eval-pipeline-auditor agent type:
   "Audit the evaluation pipeline in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/full-vision-roadmap/. 
   Key files: src/lib/evaluation/agents.ts, orchestrator.ts, schemas.ts, constants.ts, prompts.ts, storage.ts. 
   Also check src/app/api/evaluate/route.ts and src/app/api/proposals/submit/route.ts.
   Write EVAL-PIPELINE-REVIEW.md at the worktree root."

2. Teammate "gsd-prompt-eng" using prompt-engineering-auditor agent type:
   "Audit judge prompts in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/full-vision-roadmap/src/lib/evaluation/prompts.ts and constants.ts.
   Write PROMPT-REVIEW.md at the worktree root."

3. Teammate "gsd-framework":
   "You are a GSD code reviewer. Work in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/full-vision-roadmap/.
   Review the evaluation module (src/lib/evaluation/ and src/app/api/evaluate/) using GSD methodology:
   - Check code against phase plans in .planning/phases/02-*.md
   - Verify requirements coverage from .planning/REQUIREMENTS.md
   - Look for bugs, security issues, code quality problems
   - Write structured findings to .planning/phases/02-REVIEWS.md"

=== Speckit Worktree ===

4. Teammate "speckit-eval-pipe" using eval-pipeline-auditor agent type:
   "Audit the evaluation pipeline in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/speckit/.
   Key files: src/evaluation/orchestrate.ts, agents/runner.ts, agents/prompts.ts, schemas.ts, scoring.ts, anomaly.ts, sanitization.ts, dispute-override.ts.
   Also check src/app/api/webhooks/ and src/app/api/evaluate/.
   Write EVAL-PIPELINE-REVIEW.md at the worktree root."

5. Teammate "speckit-prompt-eng" using prompt-engineering-auditor agent type:
   "Audit judge prompts in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/speckit/src/evaluation/agents/prompts.ts.
   Also review the monitoring agent prompt at src/monitoring/agent-config.ts.
   Write PROMPT-REVIEW.md at the worktree root."

6. Teammate "speckit-framework":
   "You are a Spec Kit analyst. Work in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/speckit/.
   Run cross-artifact consistency analysis on the evaluation feature:
   - Check spec.md, plan.md, and tasks.md for the evaluation phase
   - Verify implementation matches the spec
   - Identify underspecified areas and spec drift
   - Write findings as a structured analysis report at the worktree root as SPECKIT-ANALYSIS.md"

=== Superpower Worktree ===

7. Teammate "sp-eval-pipe" using eval-pipeline-auditor agent type:
   "Audit the evaluation pipeline in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/superpower/.
   Key files: src/lib/judges/prompts.ts, schemas.ts, weights.ts, src/lib/evaluation/orchestrator.ts, publish-chain.ts, src/app/api/evaluate/[id]/[dimension]/route.ts.
   Write EVAL-PIPELINE-REVIEW.md at the worktree root."

8. Teammate "sp-prompt-eng" using prompt-engineering-auditor agent type:
   "Audit judge prompts in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/superpower/src/lib/judges/prompts.ts.
   This worktree uses Mastra agents with Claude Sonnet 4 (not gpt-4o like the others).
   Write PROMPT-REVIEW.md at the worktree root."

9. Teammate "sp-mastra" using mastra-source-auditor agent type:
   "Audit Mastra framework usage in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/superpower/.
   @mastra/core ^1.24.1, @mastra/evals ^1.2.1 are installed.
   Key agent code: src/app/api/evaluate/[id]/[dimension]/route.ts.
   Mastra is open source (Apache 2.0) at github.com/mastra-ai/mastra.
   Reference docs: https://mastra.ai/docs/evals/overview, https://mastra.ai/docs/agents/guardrails, https://mastra.ai/docs/agents/supervisor-agents.
   Write MASTRA-REVIEW.md at the worktree root."

After all 9 teammates complete, synthesize a EVAL-CORE-AUDIT.md at the repo root that compares:
1. Scoring correctness across worktrees (different scales, rounding, edge cases)
2. Prompt quality comparison (anti-injection, rubric calibration, bias)
3. Mastra integration assessment (what superpower gains vs what GSD/speckit miss)
4. Fairness and reproducibility comparison
5. Top 15 highest-impact findings across all worktrees
6. Recommended improvements per worktree, using each framework's process
```

### Lightweight Version (3 teammates, ~1M tokens)

For a faster run focusing only on the evaluation pipeline:

```text
Create an agent team "eval-quick-review" with 3 teammates — one per worktree.

1. "gsd-reviewer" using eval-pipeline-auditor: audit .worktrees/full-vision-roadmap/ evaluation pipeline
2. "speckit-reviewer" using eval-pipeline-auditor: audit .worktrees/speckit/ evaluation pipeline  
3. "sp-reviewer" using eval-pipeline-auditor: audit .worktrees/superpower/ evaluation pipeline

Synthesize EVAL-CORE-AUDIT.md at repo root when all complete.
```

### Mastra-Focused Version (1 teammate, ~300K tokens)

For just the Mastra integration review:

```text
Spawn one teammate "mastra-reviewer" using mastra-source-auditor agent type.
Audit the superpower worktree at .worktrees/superpower/ for Mastra framework usage.
Focus on: are @mastra/evals scorers used for meta-evaluation? Are guardrails configured?
Is the supervisor agent pattern used? What's missing?
```

---

## Expected Outputs

Each worktree receives up to 3 review files:

| File | Author | Content |
|------|--------|---------|
| `EVAL-PIPELINE-REVIEW.md` | eval-pipeline-auditor | Scoring logic, storage integrity, concurrency findings |
| `PROMPT-REVIEW.md` | prompt-engineering-auditor | Prompt quality, injection resistance, bias analysis |
| `MASTRA-REVIEW.md` | mastra-source-auditor | Framework usage gaps (superpower only) |
| Framework-native report | per-framework reviewer | GSD: `02-REVIEWS.md`, Speckit: `SPECKIT-ANALYSIS.md` |

The lead synthesizes all into:

| File | Location | Content |
|------|----------|---------|
| `EVAL-CORE-AUDIT.md` | repo root | Cross-worktree comparison, top findings, per-worktree recommendations |

---

## Using Existing Skills in the Audit

The project has 18 installed audit skills (see `docs/audit-skills-toolkit.md`). These complement the eval-core-review team:

| Existing Skill | Complements | How |
|----------------|-------------|-----|
| `/solidity-audit` | eval-pipeline-auditor | Covers contract-level vulnerabilities the pipeline auditor notes |
| `/owasp-security-check` | eval-pipeline-auditor | Covers API route security beyond evaluation logic |
| `/code-audit-readonly` | All auditors | Full-repo sweep catches things specialized auditors miss |
| `/secrets-scanner` | All auditors | Catches leaked keys that would compromise the pipeline |
| `/code-quality` | Framework reviewers | Enforces TypeScript strict mode compliance |

**Recommended workflow:** Run the eval-core-review team first (deep evaluation audit), then run the worktree-audit-runner team (broad security audit). The eval-core team catches evaluation-specific issues; the security team catches infrastructure issues.

---

## Mastra Open Source Audit Potential

Mastra is fully open source (Apache 2.0) at `github.com/mastra-ai/mastra`:
- **22.9K stars**, 1.9K forks, 14K+ commits
- **CodeQL scanning** enabled in CI
- **Security contact:** security@mastra.ai

The `mastra-source-auditor` can cross-reference the framework source when reviewing the superpower worktree. Key areas to inspect:

| Mastra Source Area | Why Audit It |
|--------------------|--------------|
| `packages/core/src/agent/` | How `Agent.generate()` handles structured output — does it validate before returning? |
| `packages/evals/src/scorers/` | Built-in scorer implementations — are they robust? |
| `packages/core/src/workflows/` | How `.parallel()` handles partial failures vs `Promise.all` |
| `packages/core/src/processors/` | `PromptInjectionDetector` implementation quality |
| `packages/core/src/mcp/` | MCP server/client security model |

This allows us to audit not just *how the project uses* Mastra, but whether *Mastra itself* is trustworthy for the evaluation pipeline.

---

## Token Budget Estimate

| Configuration | Teammates | Est. Tokens | Duration |
|---------------|-----------|-------------|----------|
| Full team (9) | 9 | ~3M | 15-25 min |
| Lightweight (3) | 3 | ~1M | 8-12 min |
| Mastra-focused (1) | 1 | ~300K | 5-8 min |

Each teammate uses its own 1M context window. The lead's context handles coordination overhead.

---

## Prerequisites

1. **Agent Teams enabled:**
```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

2. **Agent definitions installed** (created by this document):
   - `.claude/agents/eval-pipeline-auditor.md`
   - `.claude/agents/prompt-engineering-auditor.md`
   - `.claude/agents/mastra-source-auditor.md`
   - `.claude/agents/worktree-audit-runner.md` (pre-existing)

3. **tmux recommended** for monitoring 9 concurrent teammates:
```bash
brew install tmux  # if not installed
claude --teammate-mode tmux
```

---

## Post-Audit Workflow

After `EVAL-CORE-AUDIT.md` is generated:

1. **Review findings** — prioritize CRITICAL and HIGH across all worktrees
2. **Per-worktree fixes** — use each framework's fix process:
   - GSD: `/gsd-audit-fix` or `/gsd-code-review-fix`
   - Speckit: Create tasks from findings via `/speckit-tasks`
   - Superpower: `/superpowers:executing-plans` with fix plan
3. **Re-audit** — re-run affected auditors to verify fixes
4. **Mastra upgrades** — implement mastra-source-auditor recommendations in superpower worktree
5. **Cross-pollinate** — apply best patterns from one worktree to others (e.g., speckit's anomaly detection → GSD)
