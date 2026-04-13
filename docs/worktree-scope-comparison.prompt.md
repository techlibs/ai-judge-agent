# Prompt: Worktree Scope Comparison

## What was produced

`worktree-scope-comparison.md` — A practical comparison of what three SDD framework worktrees (GSD, Spec Kit, Superpowers) actually built when implementing the same agent-reviewer project.

## Agent architecture

Single Claude Code session (Opus 4.6, 1M context). Three Explore subagents dispatched in parallel to gather data from each worktree's planning artifacts, git history, and source code. One Plan subagent synthesized the comparison structure.

## Prompt

User asked: "compare what [speckit and superpowers] have different [from GSD's phases]... make this report available on main."

The conversation already had full-vision-roadmap data in context. The agent explored speckit (`specs/001-arwf-judge-system/tasks.md`, `plan.md`, git log) and superpowers (`docs/superpowers/plans/`, `docs/superpowers/specs/`, git log, `src/` structure) to gather equivalent data.

## Methodology

1. Read each worktree's planning artifacts (roadmaps, specs, task lists, plan files)
2. Read git logs to verify what was actually committed vs. planned
3. Cross-referenced against the ARWF reference architecture milestones (M1-M6, Phases 1-17)
4. Built feature matrix by checking source code existence in each worktree

## Model and tools

- **Model:** Claude Opus 4.6 (1M context)
- **Tools:** Claude Code CLI with Explore subagents, Read, Grep, Glob, Bash (git commands)
- **Date:** 2026-04-13

## Limitations

- Feature presence was determined from planning artifacts and git commit messages, not by running the code. Some features may be partially implemented.
- "Complete" status comes from each framework's own tracking (GSD summaries, Spec Kit tasks.md checkmarks, Superpowers commit history). No independent verification was performed.
- The comparison measures scope and feature presence, not code quality, test coverage, or runtime correctness.
- The Superpowers worktree analysis relied heavily on plan files and commit messages; not all step-level checkboxes were individually verified against source code.

## Reproduction

```bash
# From the repo root (main branch):
# Explore each worktree's planning artifacts
ls .worktrees/full-vision-roadmap/.planning/
ls .worktrees/speckit/specs/001-arwf-judge-system/
ls .worktrees/superpower/docs/superpowers/

# Check git history per worktree
git -C .worktrees/full-vision-roadmap log --oneline
git -C .worktrees/speckit log --oneline
git -C .worktrees/superpower log --oneline
```
