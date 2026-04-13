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
- **Storage**: On-chain (scores/hashes) + IPFS (content) as source of truth. Optional read cache rebuildable from chain events
- **AI provider**: Vercel AI SDK (`ai`, `@ai-sdk/openai`) — GPT-4o primary via `OPENAI_API_KEY`
- **On-chain**: ERC-8004 on Base (mainnet chain ID 8453) and Base Sepolia (testnet chain ID 84532), viem for TypeScript chain interactions
- **Deployer wallet**: `0xa7cEd6c599403B5BA0066f45074C5a5EbC70f742` (dedicated deployer — NOT a personal wallet)
- **Personal wallet**: `0x7df05b5BC76930a5376Ed9d89549C3DaD169ffC4` (Coinbase Wallet — admin role transfer target)
- **Smart contracts**: Solidity 0.8.24 + Foundry, 6 contracts deployed and verified on Basescan
- **Code standards**: No `any`, no `as Type`, no `!`, Zod validation at boundaries
- **Prompt transparency**: All AI-generated docs need `.prompt.md` companions

### On-Chain Deployment

Contracts are deployed on **both Base Sepolia (testnet) and Base Mainnet** at identical addresses (same deployer nonce):

| Contract | Address | Basescan |
|----------|---------|----------|
| IdentityRegistry | `0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a` | [view](https://basescan.org/address/0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a) |
| EvaluationRegistry | `0xa86D6684De7878C36F03697657702A86D13028d8` | [view](https://basescan.org/address/0xa86D6684De7878C36F03697657702A86D13028d8) |
| ReputationRegistry | `0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f` | [view](https://basescan.org/address/0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f) |
| ValidationRegistry | `0x5A0Bf56694c8448F681c909C1F61849c1A183f17` | [view](https://basescan.org/address/0x5A0Bf56694c8448F681c909C1F61849c1A183f17) |
| MilestoneManager | `0xb4161cB90f2664A0d4485265ee150A7f3a7d536b` | [view](https://basescan.org/address/0xb4161cB90f2664A0d4485265ee150A7f3a7d536b) |
| DisputeRegistry | `0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e` | [view](https://basescan.org/address/0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e) |

### Switching Between Testnet and Mainnet

Change **two env vars** in `.env.local`:

```bash
# Testnet (Base Sepolia)
NEXT_PUBLIC_CHAIN_ID=84532
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Mainnet (Base)
NEXT_PUBLIC_CHAIN_ID=8453
BASE_SEPOLIA_RPC_URL=https://mainnet.base.org
```

Contract addresses are the same on both networks. After switching, restart the dev server (`bun run dev`).

**Validate the switch:**
```bash
# Check which network the app connects to
cast chain-id --rpc-url $BASE_SEPOLIA_RPC_URL
# 84532 = testnet, 8453 = mainnet

# Verify contract is responding on the target network
cast call $NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS "totalSupply()(uint256)" --rpc-url $BASE_SEPOLIA_RPC_URL
```

**Key differences:**
| | Testnet (84532) | Mainnet (8453) |
|---|---|---|
| ETH | Free (faucets) | Real money |
| Transactions | No financial risk | Irreversible, costs real gas |
| Explorer | sepolia.basescan.org | basescan.org |
| Use for | Development, testing | Production |

### Contract Deployment Guide

See `contracts/DEPLOY.md` for full deployment instructions (local Anvil, testnet, mainnet).

### Wallet Architecture

- **Deployer** (`0xa7cEd...0f742`): Throwaway wallet for deploying contracts. Private key in `.env.local`. If compromised, no funds at risk.
- **Personal** (`0x7df05...ffC4`): Coinbase Wallet. Target for admin role transfer post-deployment. Never put this private key in files.
- **Anvil default** (`0xf39Fd...92266`): Local development only. Well-known key, pre-funded with 10000 ETH on Anvil.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (App Router) | Web framework | Already decided. App Router enables RSC for fast initial loads, Server Actions for form handling. Next.js API routes handle the write pipeline (IPFS pin → chain tx) and SSE for real-time progress. | HIGH |
| TypeScript | 5.7+ (strict) | Language | Already decided. Strict mode + no `any` policy aligns with Zod validation at boundaries. | HIGH |
| Bun | 1.3+ | Runtime & package manager | Already decided. Faster installs and test runs than Node. | HIGH |
### Storage & Backend
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| IPFS (Pinata/web3.storage) | -- | Content storage | Content-addressed, immutable, public, decentralized. Proposal content and evaluation results pinned to IPFS. Content hashes stored on-chain for verification. | HIGH |
| viem | 2.47.x | TypeScript Ethereum client | Type-safe, tree-shakeable. Used server-side in Next.js API routes to read/write on-chain data. Better TypeScript inference than ethers.js. | HIGH |
### AI / Agent Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Mastra | 1.x | Agent framework + evaluation scoring | TypeScript-native agent framework built on Vercel AI SDK. Provides `@mastra/evals` scorer pipeline (separates LLM judgment from deterministic score normalization), typed `workflow.parallel()` for concurrent judge execution with per-step retry, and built-in tracing for audit transparency. 22K+ stars, v1.0 stable, YC W25. | HIGH |
| Vercel AI SDK (`ai`) | latest | LLM interaction layer | Used internally by Mastra. `generateObject` with Zod schemas for type-safe structured output. Provider-agnostic via adapter pattern. | HIGH |
| @ai-sdk/anthropic | latest | Anthropic provider | Claude Sonnet 4.6 for scoring quality, Claude Haiku for cost-sensitive batch runs. | HIGH |
| @ai-sdk/openai | latest | OpenAI provider (failover) | Automatic failover when Anthropic is unavailable. Mastra handles provider failover natively. | HIGH |
| Zod | 3.x | Schema validation + structured output | Define judge evaluation schemas once, use for: (1) Mastra agent structured output, (2) API request/response validation, (3) TypeScript type inference. Single source of truth for evaluation shapes. | HIGH |
### On-Chain / Web3
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Foundry (forge, cast, anvil) | 1.6.x | Smart contract development | Best-in-class Solidity toolchain. Native Solidity tests (no JS context switching), fast compilation, built-in fuzzing. `anvil` for local testnet, `cast` for CLI interactions. | HIGH |
| Solidity | 0.8.24+ | Smart contract language | Required for ERC-8004. Use 0.8.24+ for latest optimizations and custom errors. | HIGH |
| OpenZeppelin Contracts | 5.x | Contract base classes | ERC-8004 Identity Registry extends ERC-721. OpenZeppelin provides battle-tested ERC-721, access control, and upgradeable patterns. | HIGH |
### UI
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Styling | Already decided. Utility-first, works great with shadcn/ui. | HIGH |
| shadcn/ui | latest | Component library | Already decided. Copy-paste components, full control, no version lock-in. | HIGH |
### Deployment
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | -- | Frontend + API hosting | Already decided. Native Next.js support. API routes handle IPFS pinning and chain transactions server-side. | HIGH |
| Base Sepolia | -- | Testnet | Base L2 testnet over Ethereum Sepolia. Lower gas costs, ERC-8004 is confirmed expanding to Base. Faster block times for better DX during development. | MEDIUM |
### Supporting Libraries
| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| @mastra/evals | 1.x | Evaluation scoring | Built-in scorer pipeline for LLM-as-judge pattern. Separates LLM judgment from deterministic score normalization. Used for all judge agent scoring. | HIGH |
## Architecture Decisions
### Next.js API Routes + Mastra Agent Integration Pattern
### IPFS + On-Chain Storage Pattern
### Mastra Structured Output + Scorer Pipeline Pattern
### ERC-8004 Contract Scope
- **IdentityRegistry**: `register()`, `setAgentURI()`, `getMetadata()` -- register projects
- **ReputationRegistry**: `giveFeedback()`, `getSummary()`, `readFeedback()` -- publish evaluation scores
- **Skip ValidationRegistry** for v1 -- adds complexity without value until there are multiple validators
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Agent Framework | Mastra + Vercel AI SDK | Vercel AI SDK only | Raw AI SDK requires building evaluation pipeline, retry logic, score normalization, and tracing from scratch. Mastra provides these as first-class abstractions. |
| Agent Framework | Mastra + Vercel AI SDK | LangChain | Heavy abstraction, poor TypeScript strict mode support (`any` leaks), harder to audit |
| Agent Framework | Mastra + Vercel AI SDK | Direct OpenAI/Anthropic SDK | Provider lock-in, no built-in scorer pipeline or workflow engine |
| Ethereum Client | viem | ethers.js v6 | Larger bundle, weaker TS types, migration fragmentation |
| Ethereum Client | viem (server-side) | wagmi (React hooks) | No wallet UI needed; on-chain writes are server-side from Next.js API routes |
| Contract Toolchain | Foundry | Hardhat | Foundry is faster, Solidity-native tests, no JS dependency bloat |
| Testnet | Base Sepolia | Ethereum Sepolia | Lower gas, faster blocks, ERC-8004 expanding to Base |
| Storage | On-chain + IPFS | Convex DB | All data is public and write-once; web3-native storage aligns with transparency values, eliminates vendor lock-in |
| Storage | On-chain + IPFS | Arweave | IPFS is simpler to integrate; Arweave adds permanent storage guarantee but higher complexity and cost |
## Installation
# Core application (Next.js + TypeScript + Tailwind + shadcn/ui)
# AI (Mastra + Vercel AI SDK + Zod)
# Web3 (viem for chain interactions, IPFS client for content storage)
# UI (shadcn/ui components)
# Dev dependencies
# Smart contracts (separate directory: contracts/)
# Install Foundry via foundryup
# In contracts/ directory
## Environment Variables
### IPFS Provider
### On-Chain (RPC + Contract Addresses)
### Vercel / .env.local
## Sources
- [OpenAI Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI Node SDK (npm)](https://www.npmjs.com/package/openai) -- v6.33.0
- [viem documentation](https://viem.sh/)
- [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 reference contracts](https://github.com/erc-8004/erc-8004-contracts)
- [Foundry toolchain](https://github.com/foundry-rs/foundry)
- [Zod + OpenAI structured output pattern](https://hooshmand.net/zod-zodresponseformat-structured-outputs-openai/)
- [Pinata IPFS SDK](https://docs.pinata.cloud/)
- [The Graph documentation](https://thegraph.com/docs/)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

## Persisted Worktrees — DO NOT DELETE

The `.worktrees/` directory contains **persisted git worktrees** from an SDD (Spec-Driven Development) framework comparison experiment. Each worktree holds an independent implementation of the agent-reviewer built with a different framework. They represent hours of AI-driven execution and are the primary artifact for the comparison analysis.

| Worktree | Branch | SDD Framework | Status |
|----------|--------|---------------|--------|
| `.worktrees/full-vision-roadmap/` | GSD execution | GSD (Get Shit Done) | Phase 1 in progress |
| `.worktrees/speckit/` | Spec Kit execution | Spec Kit | Phase 1-2 complete, Phase 3+ in progress |
| `.worktrees/superpower/` | Superpowers execution | Superpowers | Phase 1 complete |
| `.worktrees/audit-skills-toolkit/` | Audit branch | — | Earlier audit work |

### How Worktrees Relate to Agent Teams

These worktrees were created for the **`sdd-comparison`** Agent Team (config at `~/.claude/teams/sdd-comparison/`). The team lead dispatched teammates into separate worktrees so each framework could build in complete isolation — no merge conflicts, no shared state. Each teammate executed its assigned framework's workflow independently.

Team tasks are tracked at `~/.claude/tasks/sdd-comparison/`. Task #4 (comparative summary) is pending — it requires analyzing all three worktrees to produce the final comparison.

### Rules

- **NEVER delete `.worktrees/`** — these are the source of truth for the framework comparison
- **NEVER merge worktree branches into main** without explicit user approval
- When resuming comparison work, check each worktree's git log to understand current state
- The comparative analysis document (`docs/ecosystem-analysis-expansion-vision.md`) draws from these worktrees

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
