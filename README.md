# AI Judge Agent

AI Judge system for evaluating grant proposals and surfacing community consensus fairly. Lives at **ipe.city/grants** — the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable.

## Branch Strategy

This repo uses a **clean main** approach. Each development methodology gets its own long-lived branch, worked on in isolated git worktrees:

| Branch | Framework | Purpose | Files | Status |
|--------|-----------|---------|-------|--------|
| `main` | — | Clean default branch (README only) | — | Stable |
| `speckit` | [Spec Kit](https://github.com/gallium-ai/speckit) | Specification-driven development: spec.md, plan.md, data-model.md, contracts/, tasks.md | 78 files (+11.9k lines) | Planning complete |
| `full-vision-roadmap` | [GSD](https://github.com/gallium-ai/gsd) | Full 4-phase roadmap with research, UI specs, phase plans, and on-chain + IPFS architecture | 43 files (+10.9k lines) | Planning complete |
| `superpower` | [GSD](https://github.com/gallium-ai/gsd) + [Superpowers](https://github.com/gallium-ai/superpowers) | Superpowers-driven workflow: brainstorming specs, writing-plans, and GSD planning artifacts | 38 files (+13.2k lines) | Planning complete |

Each branch represents a parallel exploration of the same product using different AI-assisted development frameworks. The goal is to compare how each approach handles the same problem space — from requirements gathering through implementation planning.

### What each branch explores

- **speckit** — Spec Kit's specification-first approach: formal spec, research, data model, contracts, quickstart guide, and task breakdown. Single-commit, structured artifact tree.
- **full-vision-roadmap** — GSD's milestone-driven approach: 4-phase roadmap (foundation → AI pipeline → on-chain reputation → visualization), with per-phase research, UI design contracts, and execution plans. 21 commits of incremental planning.
- **superpower** — Superpowers + GSD hybrid: brainstorming-first design spec, then implementation plans generated via the writing-plans skill, plus GSD planning artifacts for project/requirements/roadmap.

## Tech Stack

- **Runtime**: Bun + TypeScript (strict mode)
- **Framework**: Next.js (App Router) on Vercel
- **AI/LLM**: Mastra (`@mastra/core`, `@mastra/evals`) built on Vercel AI SDK with Anthropic (structured output via `agent.generate({ structuredOutput })`)
- **Storage**: On-chain (Base L2) + IPFS (Pinata) as source of truth, SQLite (Turso) as disposable read cache
- **Contracts**: Solidity (Foundry), ERC-8004 for agent identity/reputation
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Auth.js v5

## License

Private — all rights reserved.
