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

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Agent Reviewer — AI Judge for IPE City Grants**

An AI-powered grant evaluation system for IPE City (ipe.city/grants) that uses 4 specialized Judge Agents to score proposals across Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability. Evaluations are transparent, weighted, and published to an on-chain reputation registry (ERC-8004). This is the first product in the IPE City ecosystem — replacing an informal grant process with structured, accountable AI evaluation.

**Core Value:** Every grant proposal gets a fair, transparent, reproducible evaluation — with scores, justifications, and on-chain proof that the process happened.

### Constraints

- **Timeline**: ~3 hour continuous session — build as much as possible, prioritize working end-to-end over polish
- **Tech stack**: Bun, Next.js App Router, TypeScript strict, Tailwind + shadcn/ui, Vercel
- **Database**: Convex DB (following learn-to-fly-prod patterns — domain-driven server/ structure)
- **AI provider**: OpenAI direct (GPT-4o) via OpenAI SDK
- **On-chain**: ERC-8004 on testnet (Sepolia or Base Sepolia), typed interfaces in Convex
- **Smart contracts**: Solidity + Foundry for contract development
- **Code standards**: No `any`, no `as Type`, no `!`, Zod validation at boundaries
- **Prompt transparency**: All AI-generated docs need `.prompt.md` companions
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (App Router) | Web framework | Already decided. App Router enables RSC for fast initial loads, Server Actions for form handling. Convex handles real-time data, so Next.js focuses on rendering + routing. | HIGH |
| TypeScript | 5.7+ (strict) | Language | Already decided. Strict mode + no `any` policy aligns with Zod validation at boundaries. | HIGH |
| Bun | 1.3+ | Runtime & package manager | Already decided. Faster installs and test runs than Node. Convex CLI works fine under Bun. | HIGH |
### Database & Backend
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Convex | 1.35.x | Database + backend functions | Already decided. Real-time subscriptions for live evaluation updates. Actions for OpenAI calls. Scheduling for fire-and-forget evaluation pipelines. Team has production experience. | HIGH |
| @convex-dev/workflow | 0.3.x | Durable multi-step evaluation | Orchestrates the 4 judge agents as a durable workflow: if one step fails, it retries without re-running completed steps. Each agent evaluation becomes a workflow step. Perfect for the "submit proposal -> run 4 agents -> compute aggregate -> publish hash" pipeline. | HIGH |
### AI / LLM
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| openai (Node SDK) | 6.x | OpenAI API client | Already decided. Direct SDK gives full control over structured output, no abstraction layer overhead. v6 supports `client.beta.chat.completions.parse()` with Zod schemas natively. | HIGH |
| Zod | 3.x | Schema validation + structured output | Define judge evaluation schemas once, use for: (1) OpenAI structured output via `zodResponseFormat()`, (2) Convex validator generation, (3) TypeScript type inference. Single source of truth for evaluation shapes. | HIGH |
### On-Chain / Web3
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Foundry (forge, cast, anvil) | 1.6.x | Smart contract development | Best-in-class Solidity toolchain. Native Solidity tests (no JS context switching), fast compilation, built-in fuzzing. `anvil` for local testnet, `cast` for CLI interactions. | HIGH |
| Solidity | 0.8.24+ | Smart contract language | Required for ERC-8004. Use 0.8.24+ for latest optimizations and custom errors. | HIGH |
| viem | 2.47.x | TypeScript Ethereum client | Type-safe, tree-shakeable, ~35KB bundle. Used server-side in Convex actions to publish evaluation hashes on-chain. Better TypeScript inference than ethers.js, actively maintained by wagmi team. | HIGH |
| OpenZeppelin Contracts | 5.x | Contract base classes | ERC-8004 Identity Registry extends ERC-721. OpenZeppelin provides battle-tested ERC-721, access control, and upgradeable patterns. | HIGH |
### UI
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Styling | Already decided. Utility-first, works great with shadcn/ui. | HIGH |
| shadcn/ui | latest | Component library | Already decided. Copy-paste components, full control, no version lock-in. | HIGH |
### Deployment
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | -- | Frontend hosting | Already decided. Native Next.js support. Build command: `npx convex deploy --cmd 'bun run build'` to deploy Convex + Next.js together. | HIGH |
| Convex Cloud | -- | Backend hosting | Convex functions deploy to Convex Cloud automatically. Vercel integration handles env vars. | HIGH |
| Base Sepolia | -- | Testnet | Base L2 testnet over Ethereum Sepolia. Lower gas costs, ERC-8004 is confirmed expanding to Base. Faster block times for better DX during development. | MEDIUM |
### Supporting Libraries
| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| convex-helpers | latest | Convex utilities | Zod-to-Convex validator conversion, custom function wrappers, relationship helpers. Saves boilerplate. | MEDIUM |
| zod-to-json-schema | 3.x | Schema conversion | Bridge Zod schemas to OpenAI's JSON Schema format for structured output. OpenAI SDK includes this internally via `zodResponseFormat`, so may not need directly. | MEDIUM |
## Architecture Decisions
### Convex + OpenAI Integration Pattern
### Convex + On-Chain Bridge Pattern
### OpenAI Structured Output Pattern
### ERC-8004 Contract Scope
- **IdentityRegistry**: `register()`, `setAgentURI()`, `getMetadata()` -- register projects
- **ReputationRegistry**: `giveFeedback()`, `getSummary()`, `readFeedback()` -- publish evaluation scores
- **Skip ValidationRegistry** for v1 -- adds complexity without value until there are multiple validators
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| LLM Client | openai SDK direct | @ai-sdk/openai (Vercel AI SDK) | Adds streaming/provider abstraction overhead for a non-streaming, single-provider use case |
| LLM Client | openai SDK direct | @convex-dev/agent | Designed for conversational agents with threads/memory; our judges are stateless evaluators |
| Ethereum Client | viem | ethers.js v6 | Larger bundle, weaker TS types, migration fragmentation |
| Ethereum Client | viem (server-side) | wagmi (React hooks) | No wallet UI needed; on-chain writes are server-side from Convex actions |
| Contract Toolchain | Foundry | Hardhat | Foundry is faster, Solidity-native tests, no JS dependency bloat |
| Testnet | Base Sepolia | Ethereum Sepolia | Lower gas, faster blocks, ERC-8004 expanding to Base |
| Workflow | @convex-dev/workflow | Manual scheduling | Workflow provides retry, step tracking, parallel execution out of the box |
## Installation
# Core application
# Convex components
# Web3 (for Convex actions -- server-side only)
# UI
# Dev dependencies
# Smart contracts (separate directory: contracts/)
# Install Foundry via foundryup
# In contracts/ directory
## Environment Variables
### Convex Dashboard
### Vercel / .env.local
## Sources
- [Convex Actions documentation](https://docs.convex.dev/functions/actions)
- [Convex Next.js App Router setup](https://docs.convex.dev/client/nextjs/app-router/)
- [Convex + Vercel deployment](https://docs.convex.dev/production/hosting/vercel)
- [@convex-dev/workflow component](https://www.convex.dev/components/workflow)
- [OpenAI Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI Node SDK (npm)](https://www.npmjs.com/package/openai) -- v6.33.0
- [Convex npm package](https://www.npmjs.com/package/convex) -- v1.35.1
- [viem documentation](https://viem.sh/)
- [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 reference contracts](https://github.com/erc-8004/erc-8004-contracts)
- [Foundry toolchain](https://github.com/foundry-rs/foundry)
- [Zod + OpenAI structured output pattern](https://hooshmand.net/zod-zodresponseformat-structured-outputs-openai/)
- [Convex anti-pattern: calling actions from clients](https://docs.convex.dev/functions/actions)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
