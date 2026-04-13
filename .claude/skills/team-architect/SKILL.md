---
name: team-architect
description: "Design and validate agent team compositions for multi-worktree or multi-concern tasks. Evaluates whether a task is suited for agent teams vs subagents vs single session, selects the right subagent types from .claude/agents/, sizes the team, and outputs the team creation prompt. Use when the user wants to run parallel audits, cross-worktree comparisons, multi-perspective reviews, or any task that benefits from coordinated parallel agents. Triggers on: 'create a team', 'audit all worktrees', 'run parallel', 'cross-worktree', 'compare worktrees', 'team for', 'agent team'."
---

# Team Architect

Design optimal agent teams by matching tasks to available subagent definitions and worktree topology.

## Decision: Teams vs Subagents vs Single Session

Before composing a team, validate the use case:

```
Is the task parallelizable?
  NO  -> Single session. Stop.
  YES -> Do workers need to communicate or share findings?
    NO  -> Subagents (Agent tool with run_in_background). Stop.
    YES -> Do workers need independent context windows (large codebases, different worktrees)?
      NO  -> Subagents may still suffice. Consider team only if >3 workers.
      YES -> Agent Team. Continue.
```

### Strong Team Use Cases

| Pattern | Example | Why Team Wins |
|---------|---------|---------------|
| Cross-worktree audit | "Audit all 3 worktrees for test coverage" | Each teammate gets full worktree context without sharing a window |
| Competing hypotheses | "Debug why evaluations differ across worktrees" | Teammates challenge each other's findings |
| Multi-perspective review | "Security + performance + correctness review of PR" | Independent reviewers with different lenses |
| Parallel feature build | "Add chatbot to all 3 worktrees" | Each teammate owns a worktree, no file conflicts |

### Weak Team Use Cases (redirect to subagents)

| Pattern | Why Not a Team |
|---------|----------------|
| Sequential pipeline | Steps depend on previous output |
| Same-file edits | File conflicts between teammates |
| Quick lookups | Coordination overhead exceeds benefit |
| Single worktree task | One context window suffices |

## Team Composition

### Step 1: Discover Available Agents

Scan `.claude/agents/` for subagent definitions. Each `.md` file with YAML frontmatter defines a reusable role.

### Step 2: Match Agents to Task

For each task concern, find the best-fit agent:

| Task Concern | Agent Type | Model |
|-------------|------------|-------|
| Full security + quality sweep | `worktree-audit-runner` | sonnet |
| AI eval pipeline deep review | `eval-pipeline-auditor` | opus |
| Judge prompt quality + safety | `prompt-engineering-auditor` | opus |
| Mastra framework usage review | `mastra-source-auditor` | opus |
| Smart contract security | `superpowers-design-auditor` | opus |
| Architecture + threat model | `vision-design-auditor` | opus |
| API contract + data flow | `speckit-design-auditor` | opus |

### Step 3: Size the Team

- **1 teammate per worktree** for cross-worktree tasks (typical: 3 worktrees = 3 teammates)
- **1 teammate per concern** for single-worktree multi-perspective tasks
- **Max 5-6 teammates** — beyond this, coordination overhead dominates
- **5-6 tasks per teammate** is the sweet spot for productivity

### Step 4: Choose Models

- Use **sonnet** for broad sweeps (worktree-audit-runner) — cost-efficient, good enough
- Use **opus** for deep analysis (eval-pipeline, prompt-engineering, mastra) — quality matters
- The lead should always be **opus** for coordination quality

### Step 5: Plan Approval

For audit/review teams: teammates should NOT need plan approval (read-only work).
For implementation teams: ALWAYS require plan approval before code changes.

## Worktree Topology

This project has 3 implementation worktrees:

| Worktree | Path | Framework | Focus |
|----------|------|-----------|-------|
| GSD | `.worktrees/full-vision-roadmap/` | GSD (Get Shit Done) | Phase 1 in progress |
| Spec Kit | `.worktrees/speckit/` | Spec Kit | Most advanced, Phase 3+ |
| Superpowers | `.worktrees/superpower/` | Superpowers | Phase 1 complete |

Each worktree is an independent Next.js + Solidity codebase that can be audited in isolation.

## Team Templates

### Template: Cross-Worktree Audit (Full)

9 teammates (3 worktrees x 3 audit types). High token cost, comprehensive.

```
Create an agent team called "full-audit" to audit all 3 worktrees.

For EACH worktree (.worktrees/full-vision-roadmap, .worktrees/speckit, .worktrees/superpower), spawn 3 teammates:

1. A worktree-audit-runner (Sonnet) for broad security + quality sweep
2. An eval-pipeline-auditor (Opus) for deep evaluation pipeline review
3. A prompt-engineering-auditor (Opus) for judge prompt analysis

Each teammate should:
- Work in their assigned worktree directory
- Produce their structured report at the worktree root
- NOT modify any source code (read-only audit)
- Send findings summary to the lead when complete

Name teammates: {worktree}-{auditor-type} (e.g., gsd-audit-runner, speckit-eval-pipeline)

After all teammates complete, synthesize a CROSS-WORKTREE-COMPARISON.md comparing findings across all 3 implementations.
```

### Template: Cross-Worktree Audit (Focused)

3 teammates (1 per worktree, single audit type). Lower cost, targeted.

```
Create an agent team called "{audit-type}-comparison" to run {audit-type} across all 3 worktrees.

Spawn 3 teammates using the {agent-type} agent type:
1. "gsd-auditor" working in .worktrees/full-vision-roadmap/
2. "speckit-auditor" working in .worktrees/speckit/
3. "superpower-auditor" working in .worktrees/superpower/

Each teammate: run the full audit, produce the report, send summary to lead.
Lead: synthesize comparative analysis when all complete.
```

### Template: Single Worktree Deep Audit

3-5 teammates on one worktree with different lenses.

```
Create an agent team called "deep-audit-{worktree}" for comprehensive review of .worktrees/{worktree}/.

Spawn teammates:
1. "security" using worktree-audit-runner (Sonnet) — broad security sweep
2. "eval-pipeline" using eval-pipeline-auditor (Opus) — scoring logic review
3. "prompts" using prompt-engineering-auditor (Opus) — prompt quality
4. "mastra" using mastra-source-auditor (Opus) — framework usage
5. "architecture" using vision-design-auditor (Opus) — threat modeling

All work in the same worktree. No code changes.
After all complete, synthesize findings into DEEP-AUDIT-SUMMARY.md.
```

### Template: Test Coverage Audit

3 teammates checking test scenarios across worktrees.

```
Create an agent team called "test-coverage-audit" to verify BDD and test coverage across all 3 worktrees.

Spawn 3 teammates (Sonnet):
1. "gsd-tester" in .worktrees/full-vision-roadmap/
2. "speckit-tester" in .worktrees/speckit/
3. "superpower-tester" in .worktrees/superpower/

Each teammate should:
- Find ALL test files (*.test.ts, *.test.tsx, *.spec.ts, *.t.sol, *.feature, etc.)
- Map test files to source files they cover
- Identify source files with NO test coverage
- Check test configs (vitest, playwright, jest, foundry)
- Run tests if possible (bun test, forge test)
- Check for BDD/Cucumber feature files
- Verify tests pass locally
- Report: covered %, uncovered files, test health (pass/fail/skip counts)

Send findings to lead. Lead produces TEST-COVERAGE-COMPARISON.md.
```

## Output Format

After composing the team, output:

1. **Suitability verdict**: Is this a good agent team use case? (YES/NO with reasoning)
2. **Team composition table**: teammate name, agent type, model, worktree, task summary
3. **Estimated token cost**: LOW (<100K), MEDIUM (100K-500K), HIGH (500K+)
4. **The team creation prompt**: Ready to paste or execute
5. **Prerequisites check**: Agent teams enabled? tmux available? Worktrees exist?

## Prerequisites

Before creating a team, verify:

```bash
# Agent teams enabled?
grep -r "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" ~/.claude/settings.json

# tmux available? (for split panes)
which tmux

# Worktrees exist?
ls .worktrees/
```

If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is not set, instruct the user to add it to settings.json or set the environment variable.
