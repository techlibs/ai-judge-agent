# Agent Reviewer — AI Judge for IPE City Grants

## What This Is

An AI-powered grant evaluation system for IPE City (ipe.city/grants) that uses 4 specialized Judge Agents to score proposals across Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability. Evaluations are transparent, weighted, and published to an on-chain reputation registry (ERC-8004). This is the first product in the IPE City ecosystem — replacing an informal grant process with structured, accountable AI evaluation.

## Core Value

Every grant proposal gets a fair, transparent, reproducible evaluation — with scores, justifications, and on-chain proof that the process happened.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Proposal submission with structured fields (title, description, team, budget, links)
- [ ] 4 AI Judge Agents evaluate independently (Tech 25%, Impact 30%, Cost 20%, Team 25%)
- [ ] Each agent produces: score (0-100), justification, recommendation, key findings (max 3)
- [ ] Weighted aggregate score (S0) computed from 4 dimension scores
- [ ] IPE City values embedded as evaluation context (pro-technology, pro-freedom, pro-human-progress)
- [ ] Structured evaluation rubric with scoring bands per dimension
- [ ] Evaluation results UI showing per-dimension breakdown and aggregate
- [ ] Proposal list with status and scores
- [ ] ERC-8004 identity interface for projects (typed, Convex-stored, chain-ready)
- [ ] Reputation registry tracking evaluation history per project
- [ ] Testnet smart contract deployment (ERC-8004 minimal)
- [ ] On-chain score publication (write evaluation hashes to contract)
- [ ] Before/after prompt comparison (workshop demo: naive vs structured prompt output)

### Out of Scope

- Monitor Agents (ongoing project tracking) — future milestone, needs cron + external data sources
- x402 payment flows — future milestone, needs payment infrastructure
- Dispute resolution system — future milestone, needs governance design
- Full reputation multiplier system — needs historical data to be meaningful
- OAuth/user auth — evaluations are public for v1, auth deferred
- Mobile app — web-first

## Context

**IPE City** is a startup society / network state founded by Jean Hansen (Peerbase), based in Florianopolis, Brazil. Core values: pro-technological innovation, pro-freedom, pro-human progress. Runs "IPE Village" — month-long pop-up cities where builders create parallel institutions. Grants go to "Architects" (3+ week residents) who build and present at Demo Day.

**Current grant process** is informal: Architect status + build + demo + community contribution. This project adds the structured AI evaluation layer that doesn't exist yet.

**Reference architecture (ARWF)** in `docs/big-reference-architecture/` describes the full vision including on-chain contracts, monitor agents, payment flows. This milestone builds the core judge system with real on-chain integration — monitor agents and payments are future milestones.

**Convex DB patterns** follow `../learn-to-fly-prod`: domain-driven directory structure in `server/`, authentication escalation wrappers, fire-and-forget scheduling, typed schemas with indexes, HTTP endpoints for webhooks.

## Constraints

- **Timeline**: ~3 hour continuous session — build as much as possible, prioritize working end-to-end over polish
- **Tech stack**: Bun, Next.js App Router, TypeScript strict, Tailwind + shadcn/ui, Vercel
- **Database**: Convex DB (following learn-to-fly-prod patterns — domain-driven server/ structure)
- **AI provider**: OpenAI direct (GPT-4o) via OpenAI SDK
- **On-chain**: ERC-8004 on testnet (Sepolia or Base Sepolia), typed interfaces in Convex
- **Smart contracts**: Solidity + Foundry for contract development
- **Code standards**: No `any`, no `as Type`, no `!`, Zod validation at boundaries
- **Prompt transparency**: All AI-generated docs need `.prompt.md` companions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD as SDD framework | Best context management, parallel execution, flexible ceremony (scored 8.8/10 in analysis) | -- Pending |
| Convex DB over SQLite/Postgres | Team has production Convex experience (learn-to-fly-prod), real-time subscriptions for evaluation updates, built-in scheduling | -- Pending |
| OpenAI direct over OpenRouter/Anthropic | Simpler setup, structured output support, user preference | -- Pending |
| 4 separate agents over single combined | Reference architecture specifies independent dimension evaluation — prevents cross-contamination of scores | -- Pending |
| Testnet-first for contracts | Validate contract design before mainnet deployment, lower risk | -- Pending |
| No auth for v1 | Evaluations are public goods — auth adds complexity without value for MVP | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after initialization*
