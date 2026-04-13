# Project Research Summary

**Project:** Agent Reviewer (AI Judge for IPE City Grants)
**Domain:** AI-powered grant evaluation with on-chain reputation (ERC-8004)
**Researched:** 2026-04-12
**Confidence:** HIGH

## Executive Summary

Agent Reviewer is an AI Judge system for evaluating grant proposals at ipe.city/grants. It operates as a fan-out evaluation pipeline: proposals are submitted, then evaluated in parallel by 4 independent Judge Agents (Technical Feasibility 25%, Impact Potential 30%, Cost Efficiency 20%, Team Capability 25%), with results aggregated and published on-chain via the ERC-8004 ReputationRegistry. The recommended approach uses Next.js App Router with Convex as the unified backend — replacing a traditional Postgres + BullMQ + Redis stack with a single reactive system that handles persistence, scheduling, and real-time subscriptions natively. Mastra (`@mastra/core`) built on Vercel AI SDK with Anthropic handles all AI evaluation via structured output (Zod + `generateObject`), and viem handles server-side on-chain interaction from Convex Node.js actions.

The most important architectural constraint is the fan-out parallel evaluation pattern: each judge must be an independent Convex action receiving only its own dimension's rubric (no cross-contamination). A completion gate mutation fires the aggregation step only when all 4 dimensions are saved. This design prevents both score cross-contamination and the Convex action timeout that results from sequential LLM calls in a single action. The on-chain integration via ERC-8004 is genuine differentiation but carries the highest scope creep risk — it must be a distinct phase, not added during the core evaluation build.

The primary risks are prompt-engineering quality (uncalibrated LLM scores with temperature > 0 and vague rubrics produce high variance and clustering in the 65-75 band) and ERC-8004 scope creep derailing the core pipeline. Both are preventable: temperature 0, explicit scoring bands with anchor examples, and Zod validation on every LLM response eliminate the scoring risk; strict phase separation eliminates the scope creep risk.

## Key Findings

### Recommended Stack

The full stack is substantially decided by the project's existing constraints (Next.js 15 App Router, TypeScript strict, Bun, Tailwind, shadcn/ui, Vercel). The research identified the remaining decisions: Convex 1.35.x as the database and backend runtime, `@convex-dev/workflow` 0.3.x for durable orchestration, Mastra (`@mastra/core`, `@mastra/evals`) built on Vercel AI SDK with Anthropic for structured judge output, viem 2.47.x for server-side Ethereum interaction, and Foundry for smart contract development. The research explicitly rejected `@convex-dev/agent` (designed for conversational AI, not stateless judges), using Vercel AI SDK directly without Mastra (missing workflow orchestration and evaluation scorers), ethers.js (weaker types, larger bundle), and Hardhat (slower than Foundry, JS dependency bloat).

**Core technologies:**
- **Next.js 15 App Router**: Web framework — RSC for initial loads, Server Actions for forms
- **Convex 1.35.x**: Database + backend + scheduler — reactive subscriptions for real-time evaluation progress
- **@convex-dev/workflow 0.3.x**: Durable evaluation orchestration — retries without re-running completed steps
- **Mastra (`@mastra/core`, `@mastra/evals`)**: Agent framework — typed workflow engine, evaluation scorers, automatic tracing, built on Vercel AI SDK with Anthropic for structured judge output
- **Zod 3.x**: Single source of truth for evaluation schemas — used for Mastra/AI SDK structured output, Convex validators, and TypeScript types simultaneously
- **viem 2.47.x**: Server-side Ethereum client — type-safe, tree-shakeable, used in Convex Node.js actions only
- **Foundry 1.6.x**: Smart contract toolchain — Solidity-native tests, fast compilation, anvil for local testnet
- **Base Sepolia**: Testnet — lower gas, more reliable faucets than Ethereum Sepolia, ERC-8004 expanding to Base

### Expected Features

Research reviewed Gitcoin Grants Stack, Optimism RPGF, Karma HQ, SoPact, and traditional grant platforms (Submit.com, Foundant, SoPact) to establish the feature landscape.

**Must have (table stakes):**
- Structured proposal submission form — every grant platform has this; applicants expect clear fields
- Multi-dimension scoring with written justification — users distrust opaque single numbers; per-criterion breakdowns are standard
- Weighted aggregate score — needed for proposal comparison
- Proposal listing with status indicators — basic navigation, sortable/filterable
- Evaluation results breakdown UI — per-dimension scores + justifications + key findings
- Evaluation audit trail — stores prompt sent, model used, raw response, parsed score, timestamp; required for trust and EU AI Act trajectory
- Public evaluations with no auth wall — consistent with IPE City transparency values and public goods framing

**Should have (differentiators):**
- Independent AI Judge Agents per dimension — prevents cross-contamination; competitors use single models
- IPE City values-embedded evaluation context — culturally-aligned scoring no generic platform can offer
- On-chain score publication via ERC-8004 — verifiable tamper-proof records; ERC-8004 went live mainnet Jan 2026
- ERC-8004 project identity registry — portable project identity across funding rounds
- Before/after prompt comparison (demo feature) — shows naive vs structured multi-agent evaluation; unique educational value
- Real-time evaluation updates — Convex subscriptions make this nearly free; live judging experience
- Structured evaluation rubric with explicit scoring bands — calibrated, consistent, interpretable scores

**Defer (v2+):**
- Monitor Agents (ongoing project tracking) — different problem; requires cron + external integrations
- x402 payment flows — evaluation is the core value; payment is infrastructure
- Dispute resolution — needs governance design and historical data
- Full reputation multiplier system — needs multiple rounds of data to be meaningful
- User authentication — not needed for public goods evaluation
- Token-gated voting / governance — plutocratic bias, Sybil vulnerabilities; AI evaluation supersedes this

### Architecture Approach

The system has four layers: Next.js App Router (rendering and routing), Convex (database, mutations, queries, scheduler), AI Evaluation (Mastra agents with Anthropic via Convex Node.js actions), and On-chain (ERC-8004 registries via viem in Convex Node.js actions). The central pattern is mutation-schedules-action: mutations capture intent and schedule actions for external side effects, ensuring scheduling is atomic and actions can be independently retried. The 4 parallel judge evaluations use a completion gate — each dimension writes to its own document, and the save mutation triggers aggregation only when all 4 are present, avoiding OCC write conflicts when judges complete simultaneously.

**Major components:**
1. **Proposal Form (frontend)** — collects structured proposal data; calls `useMutation(api.proposals.create)`
2. **Evaluation Dashboard (frontend)** — real-time per-dimension progress and results via `useQuery` subscriptions
3. **Reputation Explorer (frontend)** — evaluation history per project, on-chain publication status
4. **convex/proposals/** — CRUD, status management, triggers evaluation pipeline via scheduler on creation
5. **convex/evaluation/** — orchestrates 4 parallel judge actions, completion gate, aggregation; calls Mastra agents
6. **convex/reputation/** — publishes evaluation hashes to ERC-8004 ReputationRegistry via viem
7. **convex/prompts/** — stores and versions evaluation rubrics, system prompts, IPE City values context
8. **contracts/ (Foundry)** — minimal ERC-8004 interaction; use deployed registries directly for MVP

### Critical Pitfalls

1. **Score drift from naive prompts** — Use temperature 0, define explicit scoring bands with anchor examples per dimension (e.g., "0-20: No technical plan. 81-100: Exceptional proven approach."), and Zod-validate every response. Run the same proposal 3x in dev; variance > 5 points means the rubric needs tightening.

2. **Action timeout from sequential LLM calls** — Never call the LLM 4 times in a single action. Fan out to 4 independent actions scheduled in parallel via `ctx.scheduler.runAfter(0, ...)`. Each action handles one dimension independently; the completion gate mutation fires aggregation when all 4 are saved.

3. **Structured output schema mismatch crashes pipeline** — The LLM provider returns 429/500 responses that are not JSON at all. Always wrap with `schema.safeParse()`, save structured error state on failure, and classify errors as retryable (429/5xx) vs non-retryable. Use the `ActionRetrier` Convex component for exponential backoff.

4. **ERC-8004 scope creep derails the core pipeline** — Do not touch Solidity until the AI evaluation pipeline works end-to-end. Store typed TypeScript ERC-8004 interfaces in Convex first; actual on-chain transactions are Phase 2+. Warning sign: more than 30 minutes on Foundry setup before evaluation works = stop.

5. **Cross-contaminated judge scores** — Each judge action must receive ONLY its own rubric + the proposal. Never pass other judges' outputs as input. The aggregate is computed purely mathematically: `S0 = 0.25*tech + 0.30*impact + 0.20*cost + 0.25*team`.

6. **Convex OCC write conflicts in fan-out** — Store each judge's result as a separate document (one per dimension), not as fields on a shared evaluation document. This eliminates concurrent write conflicts when all 4 judges complete near-simultaneously.

7. **Generic/useless justifications** — Require `key_findings` (max 3) that must directly quote or reference specific proposal content. Prompt instruction: "Your justification MUST reference specific claims, numbers, or details from the proposal." Test: can you identify which proposal this evaluation was for from the justification alone?

## Implications for Roadmap

Based on the combined research, the architecture's build-order dependencies and pitfall-prevention phase mapping strongly suggest a 4-phase structure:

### Phase 1: Foundation and Proposal Submission
**Rationale:** Everything reads and writes proposals. No other phase can proceed without the proposal data model and submission UI. Schema design also determines whether OCC conflicts occur in the fan-out — it must be correct from the start.
**Delivers:** Convex schema (all tables with correct indexes), proposal mutation/query layer, proposal submission form, proposal list with status filters
**Addresses:** Structured proposal submission (table stakes), evaluation audit trail data structures, proposal listing
**Avoids:** OCC write conflicts (separate dimension-score documents from day one), private key exposure (Convex env vars pattern established early)

### Phase 2: AI Evaluation Pipeline
**Rationale:** The core value proposition. Depends on proposals existing (Phase 1). Must be built and validated before on-chain work — on-chain publishes scores that must already exist. This is also the highest-uncertainty phase (prompt engineering) and needs the most iteration time.
**Delivers:** Prompt/rubric storage + seeding, evaluateDimension action (Mastra agent with Anthropic), fan-out orchestration, completion gate + aggregation, evaluation dashboard with real-time progress, before/after prompt comparison demo feature
**Addresses:** Multi-dimension scoring, weighted aggregate, evaluation audit trail population, real-time updates, scoring rubric with bands, IPE City values context, before/after prompt comparison
**Uses:** Mastra agents (`@mastra/core`) with Anthropic via Vercel AI SDK, Zod schemas, Convex Node.js actions, `ctx.scheduler.runAfter`, `@convex-dev/workflow`
**Avoids:** Score drift (temperature 0, explicit scoring bands), sequential LLM timeout (fan-out pattern), structured output crashes (Zod safeParse + error states), cross-contaminated scores (isolated action per dimension), generic justifications (key_findings schema requirement)

### Phase 3: On-Chain Integration (ERC-8004)
**Rationale:** Can only publish scores that exist. Depends on Phase 2 completing successfully. Strictly separate to prevent ERC-8004 scope creep from consuming Phase 2 time. This is genuine differentiation — worth building — but only after the core pipeline is validated.
**Delivers:** ERC-8004 IdentityRegistry registration via viem, publishEvaluation action writing hashes to ReputationRegistry, on-chain publication status UI, chain status tracking in Convex
**Addresses:** On-chain score publication (differentiator), ERC-8004 project identity registry (differentiator)
**Uses:** viem 2.47.x (server-side in Convex Node.js action), Foundry for contract interaction, Base Sepolia testnet
**Implements:** convex/reputation/ domain (publishEvaluation action, saveOnChainRef mutation)

### Phase 4: Polish and Demo Readiness
**Rationale:** Can partially overlap with Phase 3. Focuses on production quality, edge cases, and Demo Day storytelling. Score visualization and error handling belong here — Phase 2 focuses on correct behavior, Phase 4 focuses on robustness and presentation.
**Delivers:** Score visualization (radar/bar chart for 4 dimensions), ActionRetrier integration for transient failures, edge case handling (partial failures, timeouts), rate limiting on proposal submission, Demo Day flow optimization
**Addresses:** UX pitfalls (loading states, score explanations, rubric transparency), performance traps (pagination, indexes), security hardening (input sanitization)

### Phase Ordering Rationale

- Phase 1 before everything: Convex schema is foundational; retrofitting separate dimension-score documents after fan-out is built requires painful migration
- Phase 2 before Phase 3: On-chain work requires scores to exist; also, ERC-8004 scope creep risk is highest when you try to build both simultaneously
- Phase 3 before Phase 4: Polish is meaningless until the full pipeline (submit → evaluate → publish) works end-to-end
- The before/after prompt comparison demo feature goes in Phase 2 because it's independent of on-chain work and is the primary Demo Day story — it should be validated early

### Research Flags

Phases likely needing `/gsd-research-phase` during planning:
- **Phase 2:** LLM prompt engineering for calibrated scoring is domain-specific. The rubric design, anchor examples, and scoring band definitions need iterative testing. No standard templates exist — this is the highest-uncertainty area of the entire build.
- **Phase 3:** ERC-8004 deployed contract addresses on Base Sepolia need verification before planning. The erc-8004-contracts repo must be checked for current testnet deployments and any API changes since Jan 2026 mainnet launch.

Phases with standard patterns (skip `/gsd-research-phase`):
- **Phase 1:** Convex schema + Next.js form submission is thoroughly documented. Standard patterns apply.
- **Phase 4:** Error handling, pagination, and UI polish follow established Convex and shadcn/ui patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All decisions based on official docs. Convex 1.35.1, Mastra, and Vercel AI SDK are confirmed current versions. |
| Features | MEDIUM-HIGH | Competitive landscape well-researched (Gitcoin, Optimism, traditional platforms). ERC-8004 feature is live standard but cutting-edge with limited production examples. |
| Architecture | HIGH | Convex patterns (mutation-schedules-action, completion gate, OCC avoidance) verified from official docs and community guidelines. Fan-out pattern is canonical Convex. |
| Pitfalls | HIGH | LLM-as-judge domain is well-studied academically. Convex limits verified from official docs. ERC-8004 pitfalls based on live standard documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **ERC-8004 deployed addresses on Base Sepolia**: Research confirmed the standard is live and Sepolia addresses exist, but exact Base Sepolia addresses for ReputationRegistry were not verified. Must check `github.com/erc-8004/erc-8004-contracts` during Phase 3 planning.
- **Anthropic structured output compliance with specific Zod shapes via Mastra/AI SDK**: Vercel AI SDK's `generateObject` with Anthropic provider handles structured output, but edge case behavior with our specific schema is not verified. Must test with intentional malformed responses during Phase 2 execution.
- **Convex ActionRetrier compatibility with @convex-dev/workflow**: Both are recommended but their interaction was not verified. May need to choose one or validate compatibility during Phase 2 planning.
- **Anthropic rate limits at concurrent fan-out scale**: At low proposal volumes this is fine. If multiple proposals are submitted simultaneously, RPM limits could be hit. Rate limiting on submission (Phase 4) mitigates this.

## Sources

### Primary (HIGH confidence)
- [Convex Actions documentation](https://docs.convex.dev/functions/actions) — action execution model, Node.js runtime, scheduler API
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/) — mutation vs action separation
- [Convex Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions) — fire-and-forget pattern
- [Mastra documentation](https://mastra.ai/docs) — agent framework, workflows, evaluation scorers
- [Vercel AI SDK Structured Output](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data) — generateObject, Zod schema compliance
- [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004) — IdentityRegistry, ReputationRegistry interfaces
- [viem documentation](https://viem.sh/) — TypeScript Ethereum client
- [@convex-dev/workflow component](https://www.convex.dev/components/workflow) — durable workflow patterns

### Secondary (MEDIUM confidence)
- [LLM-as-a-Judge: Complete Guide (Evidently AI)](https://www.evidentlyai.com/llm-guide/llm-as-a-judge) — bias types, scoring calibration
- [LLMs-as-Judges: Comprehensive Survey (arXiv)](https://arxiv.org/html/2412.05579v2) — academic survey on variance and mitigation
- [ERC-8004 Developer Guide (QuickNode)](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/) — implementation guide
- [Gitcoin Deep Funding (AI-PGF)](https://gitcoin.co/mechanisms/deep-funding) — competitive landscape
- [Optimism RetroPGF Round 4 Docs](https://community.optimism.io/citizens-house/rounds/retropgf-4) — competitive landscape

### Tertiary (LOW confidence — needs validation)
- [Grading Scale Impact on LLM-as-a-Judge (arXiv)](https://arxiv.org/html/2601.03444v1) — suggests 0-5 scales align better with humans than 0-100; our 0-100 system requires strong scoring band anchors to compensate
- [Automatically Retry Actions (Convex Stack)](https://stack.convex.dev/retry-actions) — ActionRetrier + @convex-dev/workflow compatibility unverified
- ERC-8004 Base Sepolia deployed addresses — need verification from erc-8004-contracts repo before Phase 3

---
*Research completed: 2026-04-12*
*Ready for roadmap: yes*
