# IPE City Grant Evaluator Agent

## What This Is

An on-chain AI agent that automatically evaluates IPE City grant proposals when they're submitted. It analyzes the full proposal package (written proposal, code repository, working demo) across weighted criteria — smart contract security, anti-fraud/legitimacy, ecosystem impact, and IPE City alignment — producing verifiable scores with detailed reasoning. Built specifically for IPE City's grant program, running on both Solana and Ethereum with zkML for cryptographically verifiable AI inference.

## Core Value

Trustless, transparent, and verifiable grant evaluation — every score can be cryptographically proven to have been computed correctly by the AI model, eliminating bias and ensuring fairness in how IPE City allocates grant funding.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] On-chain proposal submission (text + code repo URL + demo URL) on both Solana and Ethereum
- [ ] AI-powered smart contract security analysis (vulnerabilities, reentrancy, access control)
- [ ] Anti-fraud and legitimacy checks (scam detection, plagiarism, sybil attacks, fake teams)
- [ ] Impact evaluation (ecosystem value, user benefit, technical innovation)
- [ ] IPE City alignment scoring (values alignment, governance fit, community contribution potential)
- [ ] Weighted composite scoring system (individual criterion scores → weighted overall score → ranking)
- [ ] Detailed reasoning output per criterion stored on-chain
- [ ] zkML verifiable inference (cryptographic proof that AI evaluation was computed correctly)
- [ ] Multi-chain support (Solana programs + Ethereum smart contracts)
- [ ] Automated test suite for smart contracts and scoring logic (TDD)
- [ ] AI evaluation benchmarks (test known-good and known-bad proposals for scoring accuracy)

### Out of Scope

- General-purpose grant platform for other DAOs — this is IPE City specific
- Human-in-the-loop judging UI — the agent is fully automated
- Token distribution/payment execution — the agent scores, it doesn't disburse funds
- Off-chain AI with oracle pattern — committed to full on-chain verifiable inference via zkML

## Context

- **IPE City** is a startup society initiative building digital-native governance alternatives, currently running Ipê Village (April 6 - May 1, 2026) in Florianópolis, Brazil
- IPE City already has on-chain infrastructure: Ethereum address (ipecity.eth), Solana address, $IPE token planned, on-chain credentials and reputation systems
- The PULSE system already tracks collective action and contribution on-chain
- Architect passport holders are eligible for $10k+ in grants — this agent evaluates those proposals
- Proposals come from builders working on: governance, AI, privacy/ZK, DeFi, education, healthcare, and more
- **Colosseum Copilot** (Solana ecosystem) is an inspiration — its structured project database, evidence floors, gap classification, and adversarial evaluation approach inform this design, though Copilot is a research tool, not a judge
- zkML ecosystem is emerging: EZKL, Risc Zero, and similar frameworks enable verifiable ML inference

## Constraints

- **Chain:** Must run on both Solana (Anchor programs) and Ethereum (Solidity smart contracts)
- **Verifiability:** All AI inference must be cryptographically verifiable via zkML — no trust assumptions
- **Testing:** TDD throughout + evaluation benchmarks for AI scoring quality
- **Domain:** IPE City grant criteria only — not a generic evaluation tool
- **Data:** Must handle multi-modal input (text proposals, code analysis, demo evaluation)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| zkML for AI verification | Full on-chain verifiability without trust assumptions | — Pending |
| Multi-chain (Solana + Ethereum) | IPE City operates on both chains, maximizes accessibility | — Pending |
| Weighted composite scoring | Enables nuanced evaluation with transparent criterion weights | — Pending |
| Real-time evaluation on submission | Instant feedback for proposers, no waiting for judging rounds | — Pending |
| Adversarial evaluation approach | Inspired by Colosseum Copilot — challenge weak proposals, don't validate them | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*
