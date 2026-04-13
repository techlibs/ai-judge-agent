# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**agent-reviewer** is an AI Judge system for evaluating grant proposals and surfacing community consensus fairly. It lives at **ipe.city/grants** and is the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). It surfaces consensus to help funding decisions be transparent, accountable, and scalable.

### Vision vs. Current Scope

The `docs/big-reference-architecture/` contains the full ARWF (Adaptive Reputation-Weighted Funding) vision — a comprehensive system with on-chain contracts (ERC-8004, x402), monitor agents, reputation systems, and cross-platform integrations. That document is **inspiration, not the current scope**. We are building incrementally using GSD milestones.

Current milestone goals and scope are defined in `.planning/PROJECT.md` and `.planning/ROADMAP.md` (created by `/gsd-new-project`).

## Development Framework

This project uses **GSD (Get Shit Done)** as its spec-driven development framework. See `docs/spec-driven-frameworks-analysis.md` for the evaluation that led to this choice.

### Key GSD Commands

```bash
# Project initialization (run once)
/gsd-new-project          # Deep context gathering → PROJECT.md + ROADMAP.md

# Daily workflow
/gsd-progress             # Check where we are, route to next action
/gsd-next                 # Advance to next logical step
/gsd-resume-work          # Resume from previous session

# Phase lifecycle
/gsd-discuss-phase N      # Gather context before planning
/gsd-plan-phase N         # Create detailed PLAN.md
/gsd-execute-phase N      # Wave-based parallel execution
/gsd-verify-work N        # User acceptance testing
/gsd-ship                 # PR creation with auto-description

# Lightweight tasks
/gsd-quick "description"  # Skip optional agents
/gsd-fast "description"   # Inline, no subagents

# Utilities
/gsd-health               # Diagnose .planning/ issues
/gsd-stats                # Project statistics
/gsd-help                 # Full command reference
```

### Planning Artifacts

GSD stores all planning state in `.planning/`:
- `PROJECT.md` — Project definition and context
- `ROADMAP.md` — Milestone phases with dependencies
- `REQUIREMENTS.md` — Extracted requirements
- `phases/` — Per-phase plans and execution artifacts

## Commands

```bash
# Package manager
bun install               # Install dependencies
bun run dev               # Development server
bun run build             # Production build
bun run lint              # Lint check
bun run lint:fix          # Lint and auto-fix
bun run typecheck         # TypeScript type checking
bun run test              # Run tests
```

## Tech Stack

- **Runtime:** Bun
- **Framework:** Next.js (App Router) on Vercel
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **State/Data:** TBD per milestone (decided during GSD research phase)
- **AI/LLM:** TBD per milestone (decided during GSD research phase)
- **Deployment:** Vercel

## Architecture

Architecture decisions are captured incrementally through GSD phases. The reference architecture in `docs/big-reference-architecture/` informs design choices but is not prescriptive.

### Project Structure (Initial)

```
agent-reviewer/
├── docs/                            # Reference documentation
│   ├── big-reference-architecture/  # Full ARWF vision document
│   └── spec-driven-frameworks-analysis.md
├── .planning/                       # GSD planning artifacts
├── .self-improvement/               # AI learning loop
│   └── lessons.md
├── src/                             # Application source (created by GSD phases)
│   └── app/                         # Next.js App Router
├── CLAUDE.md                        # This file
├── KNOWLEDGE.md                     # Cross-project knowledge
└── package.json                     # Created during first GSD code phase
```

## Prompt Transparency

Every AI-generated document in `docs/` **must** have a companion `.prompt.md` file that records how it was produced. See `docs/PROMPTING.md` for the full convention.

- Record the exact prompt, the agent architecture (which agents, parallel vs sequential, why), methodology, model/tools used, limitations, and reproduction steps.
- The `.prompt.md` sits next to the output it describes (e.g., `analysis.md` + `analysis.prompt.md`).
- Be honest about limitations — what wasn't verified, what data might be stale, what biases exist.

## Code Conventions

### TypeScript Rules

Zero tolerance for type escapes:
- Never use `any`, `as Type`, `!` (non-null assertion)
- Never use `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`
- Use generics, type guards, `unknown` + Zod validation, discriminated unions

### Semantic Naming

Names describe what the entity represents in the business domain, not how it is accessed. No `Public`, `Helper`, `Util` suffixes.

### Guard Clauses over Nesting

Handle edge cases first with early returns. Keep the happy path un-nested.

### No Magic Numbers or Strings

Extract raw literals into well-named constants.

### No Flag Arguments

Split boolean-parameterized functions into two distinct functions.

### Group Related Parameters

Use objects instead of long parameter lists.

## Self-Improvement Loop

- After ANY correction from the user: update `.self-improvement/lessons.md` with the pattern
- Write rules that prevent the same mistake
- Review lessons at session start

## Active Technologies
- TypeScript (strict mode) on Bun >= 1.3 + Next.js (App Router), Mastra (`@mastra/core`, `@mastra/evals`) built on Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), Drizzle ORM, Auth.js v5, Tailwind CSS, shadcn/ui, Zod (001-arwf-judge-system)
- PostgreSQL via Neon (Vercel Marketplace), Drizzle ORM with `@neondatabase/serverless` driver (001-arwf-judge-system)
- TypeScript (strict mode) on Bun >= 1.3 + Next.js (App Router), Mastra (`@mastra/core`, `@mastra/evals`) built on Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), Drizzle ORM, Auth.js v5, Tailwind CSS, shadcn/ui, Zod, viem (001-arwf-judge-system)

## Recent Changes
- 001-arwf-judge-system: Added TypeScript (strict mode) on Bun >= 1.3 + Next.js (App Router), Mastra (`@mastra/core`, `@mastra/evals`) built on Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), Drizzle ORM, Auth.js v5, Tailwind CSS, shadcn/ui, Zod
