# Prompt Companion: eval-core-review-team.md

**Output:** `docs/eval-core-review-team.md` + 3 agent definitions in `.claude/agents/`

## Prompt

User request (paraphrased):
> Draft a team to focus on reviewing the core of agent evaluation. Ensure the best possible audit. Explore how to go deeply — code analysis of the codebase (if open source and auditable). Use existing skills/audits in the project. Explore each worktree and each framework to understand how to proceed (GSD/superpower/speckit) — use each framework's process for review/improvement. Use Mastra MCP and llms.txt for references.

## Agent Architecture

**Lead agent** (Claude Opus 4.6, 1M context) orchestrated 5 parallel research agents:

| Agent | Type | Purpose | Duration |
|-------|------|---------|----------|
| teams-docs | claude-code-guide | Fetch Agent Teams documentation from code.claude.com | ~31s |
| mastra-docs | general-purpose | Fetch Mastra llms.txt + docs overview | ~81s |
| explore-gsd | Explore | Deep scan of GSD worktree (files, git, code) | ~99s |
| explore-speckit | Explore | Deep scan of Speckit worktree | ~109s |
| explore-superpower | Explore | Deep scan of Superpower worktree | ~110s |

All 5 launched in parallel. Additional sequential web fetches for Mastra-specific docs:
- `mastra.ai/llms.txt` — full framework reference URLs
- `github.com/mastra-ai/mastra` — open source status, license, structure
- `mastra.ai/docs/evals/overview` — evaluation system architecture
- `mastra.ai/docs/agents/guardrails` — security processor details
- `mastra.ai/docs/agents/supervisor-agents` — multi-agent orchestration pattern

## Methodology

1. **Research phase** (parallel): Gathered Agent Teams config format, Mastra framework capabilities, and current state of all 3 worktrees simultaneously
2. **Synthesis phase**: Cross-referenced worktree capabilities against Mastra features to identify audit angles that would catch the most issues
3. **Team design**: Created specialized agent definitions for distinct audit concerns (pipeline logic, prompt quality, framework usage) rather than generic "audit everything" agents
4. **Framework integration**: Mapped each worktree to its native review commands (GSD: `/gsd-code-review`, Speckit: `/speckit-analyze`, Superpower: Superpowers code review)

## Key Design Decisions

**Why 3 audit angles per worktree (not 1 generic auditor)?**
A single auditor per worktree would conflate code correctness, prompt quality, and framework usage into one pass. Separating concerns means each auditor goes deeper in its domain. The eval-pipeline-auditor traces score computation with concrete examples; the prompt-engineering-auditor evaluates injection resistance and bias; the mastra-source-auditor cross-references framework source code.

**Why Opus for auditors (not Sonnet)?**
The existing `worktree-audit-runner` uses Sonnet for broad security scanning. These evaluation-specific auditors need deeper reasoning — tracing score computation through multiple files, reasoning about prompt injection vectors, and cross-referencing Mastra source patterns. Opus provides better analytical depth for adversarial code review.

**Why Mastra source audit only on superpower worktree?**
Only the superpower worktree uses Mastra (`@mastra/core` ^1.24.1, `@mastra/evals` ^1.2.1). For GSD and Speckit worktrees, the mastra-source-auditor would produce a "not installed" finding. Instead, the eval-pipeline-auditor covers the equivalent concerns (structured output validation, parallel execution patterns) for non-Mastra worktrees.

**Why include framework-native reviewers?**
Each SDD framework has its own quality gates. Using `/gsd-code-review` on the GSD worktree and `/speckit-analyze` on the Speckit worktree exercises the framework's own review methodology — this is both an audit of the code AND a test of the framework's review capabilities.

## Model & Tools

- **Model:** Claude Opus 4.6 (1M context) for lead + agent definitions; Sonnet-class Explore agents for worktree scanning
- **Tools used:** Agent (5x parallel), WebFetch (5x), Read, Glob, Grep, Bash, Write, TaskCreate/Update, SendMessage
- **External references:** Mastra docs (mastra.ai/docs/*), Mastra GitHub (github.com/mastra-ai/mastra), Claude Code docs (code.claude.com/docs/en/agent-teams)

## Limitations

- **No live Mastra source audit:** The mastra-source-auditor agent definition references Mastra's GitHub repo but doesn't clone or read it directly. Deep source review would require cloning `mastra-ai/mastra` into the audit workspace.
- **Prompt injection testing is theoretical:** The prompt-engineering-auditor reasons about injection vectors but cannot execute actual injection attempts against running judge agents.
- **Token estimates are rough:** Actual token usage depends on codebase size and auditor thoroughness. The 3M estimate for 9 teammates assumes ~300K per auditor.
- **Framework-native reviewers lack agent definitions:** The GSD and Speckit framework reviewers use inline instructions rather than `.claude/agents/` definitions because they invoke framework-specific skills (`/gsd-code-review`, `/speckit-analyze`) that are already defined elsewhere.
- **Cross-worktree comparison depends on lead synthesis:** Individual auditors work in isolation per worktree. The comparative analysis happens only in the lead's final synthesis step, which could miss cross-cutting patterns that would be visible to a single auditor reviewing all 3.

## Sources

- [Claude Code Agent Teams documentation](https://code.claude.com/docs/en/agent-teams)
- [Mastra llms.txt](https://mastra.ai/llms.txt) — framework reference index
- [Mastra GitHub](https://github.com/mastra-ai/mastra) — Apache 2.0, 22.9K stars
- [Mastra Evals Overview](https://mastra.ai/docs/evals/overview)
- [Mastra Guardrails](https://mastra.ai/docs/agents/guardrails)
- [Mastra Supervisor Agents](https://mastra.ai/docs/agents/supervisor-agents)
- Existing project docs: `docs/audit-skills-toolkit.md`, `docs/agent-team-audit-launch.md`
- Existing agent definitions: `.claude/agents/worktree-audit-runner.md`, design auditors

## Reproduction

To reproduce this team design:
1. Start Claude Code in the agent-reviewer repo root
2. Provide the same user prompt with the Mastra docs URLs
3. The parallel research agents will gather the same data (worktree states may differ if code changes)
4. The synthesis step produces the team design based on current worktree capabilities
