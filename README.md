# AI Judge Agent

AI Judge system for evaluating grant proposals and surfacing community consensus fairly. Lives at **ipe.city/grants** — the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable.

## Branch Strategy

This repo uses a **clean main** approach. Each development methodology gets its own long-lived branch, worked on in isolated git worktrees:

| Branch | Framework | Purpose |
|--------|-----------|---------|
| `main` | — | Clean default branch (README only) |
| `001-arwf-judge-system` | [Spec Kit](https://github.com/gallium-ai/speckit) | Specification-driven development: spec.md, plan.md, data-model.md, contracts/, tasks.md |
| `full-vision-roadmap` | [GSD](https://github.com/gallium-ai/gsd) + Superpowers | Phase-based roadmap with research, UI specs, and execution plans |

Each branch represents a parallel exploration of the same product using different AI-assisted development frameworks. The goal is to compare how each approach handles the same problem space — from requirements gathering through implementation planning.

### Working with branches

```bash
# Each branch is checked out in its own worktree
git worktree list

# Spec Kit branch (specification-first)
cd .claude/worktrees/test-github-spec

# GSD branch (milestone-driven)
# (checked out in the main worktree)
```

## Tech Stack

- **Runtime**: Bun + TypeScript (strict mode)
- **Framework**: Next.js (App Router) on Vercel
- **AI/LLM**: Vercel AI SDK with Anthropic (structured output via `generateObject`)
- **Storage**: On-chain (Base L2) + IPFS (Pinata) as source of truth, SQLite (Turso) as disposable read cache
- **Contracts**: Solidity (Foundry), ERC-8004 for agent identity/reputation
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Auth.js v5

## License

Private — all rights reserved.
