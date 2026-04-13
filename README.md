# AI Judge Agent

AI Judge system for evaluating grant proposals and surfacing community consensus fairly. Lives at **ipe.city/grants** — the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable.

## Branch Strategy

Main holds shared project foundation (CLAUDE.md, reference architecture, framework analysis). Each development methodology gets its own long-lived branch, worked on in isolated git worktrees:

| Branch | Framework | Purpose | Files | Status |
|--------|-----------|---------|-------|--------|
| `main` | — | Shared foundation: CLAUDE.md, reference architecture, framework analysis | — | Stable |
| `speckit` | [Spec Kit](https://github.com/gallium-ai/speckit) | Specification-first: formal spec, data model, contracts, tasks | 64 files | Planning complete |
| `full-vision-roadmap` | [GSD](https://github.com/gallium-ai/gsd) | Milestone-driven: 4-phase roadmap with research, UI specs, and execution plans | 32 files | Planning complete |
| `superpower` | [Superpowers](https://github.com/gallium-ai/superpowers) | Brainstorming-first: design spec from creative exploration, then implementation plans | 5 files | Planning complete |

Each branch represents a parallel exploration of the same product using different AI-assisted development frameworks. The goal is to compare how each approach handles the same problem space — from requirements gathering through implementation planning.

### What each branch explores

- **speckit** — Spec Kit's specification-first approach: formal spec, research, data model, contracts (webhook API, scoring schema, IPFS schemas, on-chain events), quickstart guide, and 86-task breakdown across 9 phases.
- **full-vision-roadmap** — GSD's milestone-driven approach: 4-phase roadmap (foundation → AI pipeline → on-chain reputation → visualization), with per-phase research, UI design contracts, execution plans, and cross-AI peer reviews.
- **superpower** — Superpowers' brainstorming-first approach: creative exploration of the problem space producing a design spec, then 4 structured implementation plans (smart contracts, app foundation, judge pipeline, UI pages).

## Documentation

| Document | Description |
|----------|-------------|
| [Audit Skills Toolkit](docs/audit-skills-toolkit.md) | Curated Claude Code skills for auditing across all layers: Solidity contracts, Next.js web app, TypeScript quality, dependency supply chain, and secrets management |
| [Agent Team Audit Launch Guide](docs/agent-team-audit-launch.md) | Run all audit skills across 3 worktrees in parallel using Claude Code Agent Teams |
| [Design Security Audit Report](docs/DESIGN-AUDIT-REPORT.md) | Pre-implementation security review of all plans, specs, and architecture docs across 3 worktrees |

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
