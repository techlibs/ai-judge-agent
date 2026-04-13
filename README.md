# AI Judge Agent

AI Judge system for evaluating grant proposals and surfacing community consensus fairly. Lives at **ipe.city/grants** — the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable.

## Branch Strategy

Main holds shared project foundation (CLAUDE.md, reference architecture, framework analysis). Each development methodology gets its own long-lived branch, worked on in isolated git worktrees. All three branches have progressed from planning through to working implementations with deployed live instances.

| Branch | Framework | Files | Status | Live URL |
|--------|-----------|-------|--------|----------|
| `main` | — | — | Shared foundation | — |
| `speckit` | [Spec Kit](https://github.com/gallium-ai/speckit) | 258 | Implemented | [Live](https://agent-reviewer-speckit-1010906320334.us-central1.run.app) |
| `full-vision-roadmap` | [GSD](https://github.com/gallium-ai/gsd) | 1103 | Implemented | [Live](https://agent-reviewer-gsd-1010906320334.us-central1.run.app) |
| `superpower` | [Superpowers](https://github.com/gallium-ai/superpowers) | 992 | Implemented | [Live](https://agent-reviewer-superpower-1010906320334.us-central1.run.app) |

Each branch represents a parallel exploration of the same product using different AI-assisted development frameworks. The goal is to compare how each approach handles the same problem space — from requirements gathering through working software.

### What each branch implements

All three branches deliver the same core product — a grant proposal evaluation system with AI judges — but arrived there through different framework workflows:

- **speckit** — Spec Kit's specification-first approach. Proposal submission form, 4-agent judge pipeline (GPT-5.4), conversational chatbot for evaluation discussion, Colosseum Copilot market intelligence agent, on-chain score publishing, Cloud Run deployment.
- **full-vision-roadmap** — GSD's milestone-driven approach. Full evaluation pipeline with multi-turn chat, Colosseum Copilot competitive intelligence integration, E2E test suite with chain and mobile coverage, GPT-5.4 judge agents, Cloud Run deployment.
- **superpower** — Superpowers' brainstorming-first approach. 3-agent Colosseum Copilot research team with 4-layer injection defense, conversational chatbot, AI SDK v6 compatibility, GPT-5.4 judges, E2E evaluation tests, Cloud Run deployment.

## Documentation

| Document | Description |
|----------|-------------|
| [Audit Skills Toolkit](docs/audit-skills-toolkit.md) | Curated Claude Code skills for auditing across all layers: Solidity contracts, Next.js web app, TypeScript quality, dependency supply chain, and secrets management |
| [Agent Team Audit Launch Guide](docs/agent-team-audit-launch.md) | Run all audit skills across 3 worktrees in parallel using Claude Code Agent Teams |
| [Design Security Audit Report](docs/DESIGN-AUDIT-REPORT.md) | Pre-implementation security review of all plans, specs, and architecture docs across 3 worktrees |

## Deployments

All three worktrees are deployed as Cloud Run services on GCP (`ipe-city` project, `us-central1`):

| Service | Worktree | URL |
|---------|----------|-----|
| `agent-reviewer-gsd` | full-vision-roadmap | https://agent-reviewer-gsd-1010906320334.us-central1.run.app |
| `agent-reviewer-speckit` | speckit | https://agent-reviewer-speckit-1010906320334.us-central1.run.app |
| `agent-reviewer-superpower` | superpower | https://agent-reviewer-superpower-1010906320334.us-central1.run.app |

Smart contracts are deployed on **Base Mainnet** and **Base Sepolia** at identical addresses:

| Contract | Address |
|----------|---------|
| IdentityRegistry | [`0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a`](https://basescan.org/address/0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a) |
| EvaluationRegistry | [`0xa86D6684De7878C36F03697657702A86D13028d8`](https://basescan.org/address/0xa86D6684De7878C36F03697657702A86D13028d8) |
| ReputationRegistry | [`0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f`](https://basescan.org/address/0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f) |
| ValidationRegistry | [`0x5A0Bf56694c8448F681c909C1F61849c1A183f17`](https://basescan.org/address/0x5A0Bf56694c8448F681c909C1F61849c1A183f17) |
| MilestoneManager | [`0xb4161cB90f2664A0d4485265ee150A7f3a7d536b`](https://basescan.org/address/0xb4161cB90f2664A0d4485265ee150A7f3a7d536b) |
| DisputeRegistry | [`0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e`](https://basescan.org/address/0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e) |

## Tech Stack

- **Runtime**: Bun + TypeScript (strict mode)
- **Framework**: Next.js (App Router)
- **AI/LLM**: Mastra agent framework + Vercel AI SDK, GPT-5.4 (primary), Claude Sonnet (fallback)
- **Storage**: On-chain (Base L2) + IPFS (Pinata) as source of truth
- **Contracts**: Solidity 0.8.24 (Foundry), ERC-8004 for agent identity/reputation
- **UI**: Tailwind CSS + shadcn/ui
- **Deployment**: Cloud Run (GCP) for all worktrees

## License

Private — all rights reserved.
