# Feature Landscape

**Domain:** AI-powered grant evaluation with on-chain reputation
**Researched:** 2026-04-12
**Overall confidence:** MEDIUM-HIGH

## Table Stakes

Features users expect in any grant evaluation system. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Structured proposal submission** | Every grant platform (Gitcoin, Optimism, traditional) has this. Applicants expect a form with clear fields: title, description, team, budget, timeline, links. | Low | Use Convex schema + Next.js form. Fields from PROJECT.md: title, description, team, budget, links. |
| **Multi-dimension scoring with justification** | Users distrust opaque single-number scores. Gitcoin AI ImpactQF and traditional grant platforms (Reviewr, Submit.com, SoPact) all show per-criterion breakdowns. | Medium | 4 Judge Agents already designed (Tech 25%, Impact 30%, Cost 20%, Team 25%). Each must produce score + written justification. |
| **Weighted aggregate score** | Standard in all grant evaluation tools. Users need one number to compare proposals. | Low | Simple weighted sum (S0). Already specified in PROJECT.md. |
| **Proposal listing with status and scores** | Basic navigation requirement. Every grant dashboard has this. SoPact, Foundant, CommunityForce all provide sortable/filterable lists. | Low | Next.js page with Convex real-time subscriptions. Status: draft, submitted, evaluating, evaluated. |
| **Evaluation results breakdown UI** | Per-dimension scores, justifications, recommendations, key findings. Users expect to see *why* not just *what*. Grant reviewers and applicants both need this. | Medium | Card-based layout per dimension showing score band, justification text, key findings (max 3 per dimension). |
| **Evaluation audit trail** | Core trust requirement for AI-driven decisions. EU AI Act (phasing in 2025-2026) requires explainability for automated decisions. All serious evaluation platforms record inputs, process, and outputs. | Medium | Store: prompt sent, model used, raw response, parsed score, timestamp. Immutable once created. |
| **Public evaluations (no auth wall)** | IPE City values transparency. Optimism RPGF publishes all evaluation data publicly. Grant evaluation results are public goods. | Low | Already scoped: no auth for v1. All evaluation data publicly readable. |

## Differentiators

Features that set agent-reviewer apart from Gitcoin Grants Stack, Optimism RPGF, and traditional grant management tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Independent AI Judge Agents per dimension** | Most AI-in-grants systems use a single model or human reviewers. 4 independent agents prevent cross-contamination of scores -- a technical feasibility concern should not bias impact assessment. Gitcoin's AI ImpactQF uses "dual AI models" but not domain-specialized agents. | Medium | Each agent gets only the context relevant to its dimension + the proposal. Independent calls, no shared state during evaluation. |
| **IPE City values-embedded evaluation context** | Generic grant evaluation ignores community values. IPE City has explicit values: pro-technology, pro-freedom, pro-human-progress. Embedding these as evaluation context creates culturally-aligned scoring that generic platforms cannot offer. | Low | System prompt injection per agent with IPE City value framework. Low code complexity but high design importance. |
| **On-chain score publication (ERC-8004)** | Most grant platforms keep evaluation data in their own database. Publishing evaluation hashes on-chain (ERC-8004 ReputationRegistry) creates verifiable, tamper-proof records. ERC-8004 went live on mainnet Jan 2026 -- this is cutting-edge. | High | Testnet first (Sepolia/Base Sepolia). Write evaluation hash to ERC-8004 contract. Requires Solidity contract + Foundry + frontend integration. |
| **ERC-8004 project identity registry** | Portable project identity across funding rounds and platforms. Karma HQ does this for DAO contributors but not for project-level identity in grant contexts. ERC-8004 IdentityRegistry is designed exactly for this. | High | Register project on-chain with typed metadata. Convex stores the full data, chain stores the identity anchor. |
| **Before/after prompt comparison (demo feature)** | Unique educational/transparency feature for Demo Day. Shows the difference between naive "evaluate this grant" vs structured multi-agent evaluation. No competitor does this because they have no incentive to show their evaluation weakness. | Low | Side-by-side UI comparing naive single-prompt output vs structured agent pipeline output. Great for workshop/demo storytelling. |
| **Structured evaluation rubric with scoring bands** | Most AI evaluations use uncalibrated numeric scores. Defining explicit scoring bands (e.g., 80-100 = "Exceptional", 60-79 = "Strong") per dimension creates consistency and interpretability. Traditional grant platforms like Reviewr do this manually; doing it with AI agents is novel. | Low | Define rubric per dimension in agent system prompts. Score bands mapped to qualitative labels. |
| **Real-time evaluation updates** | Convex provides real-time subscriptions out of the box. Users can watch as each agent completes its evaluation -- creating a "live judging" experience. Traditional grant platforms batch-process and email results. | Medium | Convex subscription on evaluation status. UI updates as each of 4 agents completes. Progressive disclosure of results. |

## Anti-Features

Features to deliberately NOT build for this milestone. Some are future scope, some are fundamentally wrong for the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User authentication / login** | Adds complexity without value for v1. Evaluations are public goods. Auth gates transparency. | All data public. Submission is open. Revisit in future milestone if abuse becomes an issue. |
| **Token-gated voting / governance** | Creates plutocratic bias. IPE City grants are for builders (Architects), not token holders. Quadratic voting has known Sybil vulnerabilities (well documented in Gitcoin/academic research). | AI evaluation + human Demo Day judgment. Community consensus through transparent scores, not voting mechanisms. |
| **Monitor Agents (ongoing project tracking)** | Requires cron jobs, external data source integrations (GitHub, on-chain activity), and ongoing infrastructure. Fundamentally different problem from one-time evaluation. | Defer to future milestone. Build Judge pipeline first, validate it works, then add monitoring. |
| **x402 payment flows** | Payment infrastructure adds significant complexity (payment processing, error handling, refunds). Not needed for evaluation. | Defer to future milestone. Evaluation is the core value; payment is infrastructure. |
| **Dispute resolution system** | Requires governance design, staking mechanics, and validator selection. ERC-8004 ValidationAdapter exists but is complex. | Defer to future milestone. Need evaluation history data before disputes are meaningful. |
| **Full reputation multiplier system** | Needs historical evaluation data to compute meaningful reputation. Cannot be meaningful with zero rounds of data. | Store evaluation history in a way that supports future reputation calculations. Build the data layer, not the algorithm. |
| **Sybil resistance / identity verification** | Human Passport (formerly Gitcoin Passport) and similar tools add significant integration complexity. Not needed when evaluations are AI-driven (not vote-driven). | No voting = no Sybil incentive. Re-evaluate if community input features are added later. |
| **Multi-round grant management** | Full grant lifecycle management (multiple rounds, cohorts, reporting periods) is a product unto itself (see Foundant, Submittable, etc.). | Build single-evaluation pipeline. Round management is future scope. |
| **Mobile app** | Web-first per PROJECT.md. Responsive web covers mobile needs for v1. | Tailwind responsive design. shadcn/ui components are mobile-friendly by default. |
| **AI grant *writing* assistance** | Huge market (GrantBoost, OpenGrants, Grant Assistant) but fundamentally different product. Writing help is applicant-side; this is evaluator-side. | Stay focused on evaluation. Do not scope-creep into the applicant experience. |

## Feature Dependencies

```
Structured Proposal Submission
  --> Multi-dimension Scoring (needs proposal data to evaluate)
    --> Weighted Aggregate Score (needs dimension scores)
    --> Evaluation Results UI (needs scores + justifications to display)
    --> Evaluation Audit Trail (needs raw evaluation data to store)
  --> ERC-8004 Project Identity (needs project data for on-chain registration)
    --> On-chain Score Publication (needs project identity + evaluation scores)

Structured Evaluation Rubric
  --> Multi-dimension Scoring (agents need rubric to produce calibrated scores)

IPE City Values Context
  --> Multi-dimension Scoring (values injected into agent system prompts)

Proposal Listing
  --> Evaluation Results UI (listing links to detail view)

Before/After Prompt Comparison
  (independent -- can be built in parallel as a demo feature)

Real-time Evaluation Updates
  --> Multi-dimension Scoring (needs progressive evaluation to stream)
```

## MVP Recommendation

**Prioritize (Phase 1 - Core Pipeline):**

1. **Structured proposal submission** -- entry point for everything
2. **Structured evaluation rubric with scoring bands** -- foundation for consistent evaluation
3. **Multi-dimension scoring with justification** -- core value proposition (4 independent Judge Agents)
4. **Weighted aggregate score** -- single number for comparison
5. **Evaluation audit trail** -- trust foundation (store everything from day one)
6. **Proposal listing with status and scores** -- basic navigation
7. **Evaluation results breakdown UI** -- see the evaluation output
8. **Real-time evaluation updates** -- Convex makes this nearly free; high UX impact

**Prioritize (Phase 2 - On-chain Integration):**

1. **ERC-8004 project identity registry** -- on-chain project anchor
2. **On-chain score publication** -- verifiable evaluation records
3. **Before/after prompt comparison** -- demo day showcase

**Defer (explicitly):**

- Monitor Agents: needs cron + external integrations, fundamentally different problem
- x402 payments: not needed for evaluation
- Dispute resolution: needs governance design + historical data
- Reputation multiplier: needs multiple rounds of data
- Auth: not needed for public goods evaluation

## Sources

- [Gitcoin Grants Stack](https://gitcoin.co/apps/gitcoin-grants-stack) -- Gitcoin's modular grant infrastructure
- [Gitcoin Deep Funding (AI-PGF)](https://gitcoin.co/mechanisms/deep-funding) -- Vitalik's AI-powered public goods funding mechanism
- [GG23 Predictive Funding Retrospective](https://gitcoin.co/case-studies/gg23-predictive-funding-challenge-retrospective) -- AI/ML models for funding prediction
- [Optimism RetroPGF Round 4 Docs](https://community.optimism.io/citizens-house/rounds/retropgf-4) -- Retroactive public goods funding with badgeholder evaluation
- [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) -- Official EIP for identity, reputation, and validation registries
- [ERC-8004 Developer Guide (QuickNode)](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/) -- Implementation guide for ERC-8004
- [Karma HQ Reputation System](https://www.karmahq.xyz/how-it-works) -- On-chain DAO contributor reputation scoring
- [Ethereum Attestation Service](https://docs.attest.org/) -- Infrastructure for on/off-chain attestations
- [Human Passport (formerly Gitcoin Passport)](https://passport.human.tech/) -- Sybil resistance and identity verification
- [COCM for Quadratic Funding (Gitcoin)](https://www.gitcoin.co/blog/leveling-the-field-how-connection-oriented-cluster-matching-strengthens-quadratic-funding) -- Anti-Sybil matching in quadratic funding
- [SoPact Grant Management](https://www.sopact.com/use-case/grant-management-software) -- AI-powered grant management features
- [Submit.com Grant Management](https://submit.com/solutions/grant-management-software/) -- Traditional grant management platform features
