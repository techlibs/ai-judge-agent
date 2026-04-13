# Ecosystem Analysis & Expansion Vision

> Competitive landscape of AI-powered evaluation tools, grant infrastructure, and research skills — with expansion phases for agent-reviewer.

## 1. Landscape Overview

The crypto grants space distributes billions annually through programs like Gitcoin, Optimism RPGF, Arbitrum STIP, and Solana Foundation grants. Every single one of them shares the same bottleneck: **proposal evaluation is manual, unstructured, and doesn't scale**.

| Problem | Who Suffers | Current "Solution" |
|---------|-------------|-------------------|
| Reviewer fatigue | Optimism badgeholders reviewing 500+ proposals | Skim and vote on vibes |
| No standardized rubrics | Every grant program reinvents criteria | Ad-hoc forum discussion |
| Transparency deficit | Applicants who get rejected with no explanation | "We'll get back to you" |
| No reproducibility | Same proposal, wildly different outcomes | Accept it as noise |
| Post-hoc only accountability | Funders who can't track impact | Karma GAP (post-funding only) |

**No production system uses AI to score proposals against structured rubrics before funding decisions.** This is the gap agent-reviewer fills.

---

## 2. Direct Competitors & Adjacent Tools

### 2.1 Grant Evaluation Platforms

| Tool | What It Does | Uses AI? | Ecosystem | Gap Agent-Reviewer Fills |
|------|-------------|----------|-----------|--------------------------|
| **Gitcoin (Allo Protocol)** | Quadratic funding + Sybil resistance (Passport) | No | EVM | No merit evaluation — purely popularity-based |
| **Optimism RPGF** | Badgeholder voting on retroactive impact | No | Optimism | Badgeholders overwhelmed, no scoring rubrics |
| **Questbook** | Domain expert reviewers + milestone tracking | No | EVM | Closest model (structured rubrics) but fully manual |
| **Karma GAP** | Post-award milestone tracking via EAS attestations | Partial (AI progress analysis) | EVM | Post-funding only — no pre-award scoring |
| **Jokerace** | On-chain contests and community voting | No | EVM | Popularity contest, no merit evaluation |
| **Charmverse** | DAO workspace with proposal workflows | No | Chain-agnostic | Workflow tool, zero evaluation intelligence |
| **Snapshot / Tally** | Voting mechanisms (off-chain / on-chain) | No | EVM | Pure vote execution, no proposal analysis |

**Key insight:** Questbook is the closest operational model — structured reviewer roles with rubric-based evaluation. But it's fully human. Agent-reviewer is essentially "Questbook's evaluation model, automated with AI judges and published on-chain."

### 2.2 AI + Governance (Emerging)

| Tool | What It Does | Status |
|------|-------------|--------|
| **Agora** | Governance platform (Optimism, Uniswap) — has experimented with AI proposal summaries | Active, AI features limited |
| **Boardroom / Goverland** | AI-generated proposal summaries for governance voters | Active, read-only summaries |
| **ai16z (ELIZAOS)** | Autonomous AI agents participating in DAO governance | Experimental / memetic |

These tools summarize proposals for humans. None of them **score and justify** with structured rubrics. Agent-reviewer goes further: independent multi-dimensional scoring with on-chain proof.

---

## 3. Research & Intelligence Tools

Tools like Colosseum Copilot represent a category: **domain-specific AI research skills** that enrich agent context with curated datasets.

### 3.1 AI Research Skills (Claude Code / Codex plugins)

| Tool | What It Provides | Integration Model | Relevance |
|------|-----------------|-------------------|-----------|
| **Colosseum Copilot** | 84K+ docs, 5,400+ hackathon submissions, 6,300+ products (Solana) | Claude Code skill (`npx skills add`) | Architecture reference — domain-specific research skill |
| **Exa MCP** | Semantic web search, sub-200ms, 4.1K+ GitHub stars | MCP server | Judge agents search for project context during evaluation |
| **Context7 MCP** | Version-specific library documentation | MCP server | Feed judges current docs for tech stacks referenced in proposals |
| **Firecrawl MCP** | Web scraping + structured data extraction | MCP server | Scrape team websites, GitHub profiles for capability assessment |
| **Helius for Agents** | Solana on-chain data queries | MCP server / CLI | Query on-chain activity for Solana-based applicants |

### 3.2 Web3 Intelligence Platforms (APIs)

| Platform | Data | API Access | Use for Judge Agents |
|----------|------|------------|---------------------|
| **Dune Analytics** | SQL-based blockchain analytics, 100+ chains | REST API, free tier | Verify on-chain claims in proposals (TVL, users, tx volume) |
| **DeFi Llama** | TVL tracking across thousands of protocols | Free API, no key | Benchmark DeFi proposals against competitors |
| **DeepDAO** | 2,500+ DAOs: treasuries, governance, voters | REST API (Pro) | Assess DAO health of applicant organizations |
| **Nansen** | 500M+ labeled wallets, smart money signals | Enterprise API | Whale activity and token holder analysis |
| **Messari** | Protocol fundamentals, token supply, fundraising | Paid API | Historical fundraising data for applicant teams |

---

## 4. Multi-Agent & Attestation Infrastructure

### 4.1 Orchestration Frameworks

| Framework | Pattern | Fit for Judge Agents |
|-----------|---------|---------------------|
| **OpenAI SDK (current)** | Direct structured output, parallel calls | Already chosen. Lightweight, no extra deps. Good for v1. |
| **CrewAI** | Role-based agents with goals/backstories | Natural fit for 4 judge roles. Consider if agents need memory or tool use. |
| **LangGraph** | Graph-based workflows with conditional edges | Model evaluation as DAG: parallel judges then aggregation node. Best for complex pipelines. |
| **AutoGen** | Conversation-based multi-agent (GroupChat) | Interesting for "judges debate" consensus model. |
| **OpenAI Agents SDK** | Production successor to Swarm, guardrails + tracing | Natural upgrade path from current OpenAI SDK. |

**Recommendation:** Stay with direct OpenAI SDK for v1 (already decided). Evaluate OpenAI Agents SDK or LangGraph for v2 when adding tool-augmented judges that can query external data.

### 4.2 Attestation Protocols

| Protocol | What It Does | Deployed On | Fit |
|----------|-------------|-------------|-----|
| **EAS** | Open attestation protocol, custom schemas, on/off-chain | Ethereum, Base, Optimism, Arbitrum | Most mature. Publish judge scores as typed attestations. |
| **ERC-8004** | Agent identity registry with metadata URIs | EVM (Draft EIP) | Current choice. Registers judge agent identities. |
| **Verax** | Shared attestation registry (Consensys) | Linea, Base | Alternative to EAS if composability across protocols matters. |
| **Hypercerts** | Tokenized impact certificates for public goods | EVM (uses EAS) | Direct fit — issue impact certs for funded projects with evaluation data attached. |

**Recommendation:** ERC-8004 for agent identity (current plan) + consider EAS for evaluation attestations (more composable than custom contract storage). Hypercerts integration is a natural expansion for impact tracking.

---

## 5. Expansion Vision

The current roadmap (Phases 1-4) builds the core judge system. The expansion vision below extends it into a platform that other grant programs can use.

### Expansion Phase A: Evidence-Augmented Judges

> Judges that don't just read proposals — they verify claims.

**What:** Integrate MCP tools (Exa, Firecrawl, Dune) so judge agents can autonomously research applicant teams, verify on-chain metrics, check GitHub activity, and cross-reference claims before scoring.

**Why:** Current judges score based solely on proposal text. Evidence-augmented judges produce higher-quality evaluations because they can fact-check. "Team has 3 years of Solidity experience" becomes verifiable, not just claimed.

**Tools:**
- Exa MCP for semantic web search (team background, prior work)
- Dune API for on-chain metric verification
- Firecrawl MCP for scraping team websites, GitHub profiles
- DeFi Llama API for protocol benchmarking

**Deliverables:**
- Research tool integration layer (MCP client in evaluation pipeline)
- Evidence report attached to each judge evaluation
- "Verified" vs "Unverified" claim tagging in score justifications

**Depends on:** Phase 2 (AI Evaluation Pipeline) complete

---

### Expansion Phase B: EAS Attestation Layer

> Every evaluation becomes a composable, portable attestation.

**What:** Publish evaluation results as EAS attestations in addition to (or instead of) custom contract storage. Define a standardized evaluation schema that other protocols can read.

**Why:** EAS is the emerging standard for on-chain attestations. Publishing as EAS means Gitcoin, Optimism, and any other protocol can consume agent-reviewer scores without custom integration. Composability unlocks network effects.

**Schema design:**
```
EvaluationAttestation {
  proposalHash: bytes32      // IPFS CID of proposal
  evaluatorAgent: address    // ERC-8004 agent identity
  dimension: string          // "technical" | "impact" | "cost" | "team"
  score: uint8               // 0-100
  justificationHash: bytes32 // IPFS CID of full justification
  rubricVersion: string      // Versioned scoring rubric
  modelId: string            // "gpt-4o-2024-08-06"
  timestamp: uint256
}
```

**Deliverables:**
- EAS schema registration on Base
- Attestation publishing in evaluation pipeline
- Schema documentation for third-party consumers
- Attestation explorer UI

**Depends on:** Phase 1 (On-Chain Foundation) complete

---

### Expansion Phase C: Grant Program SDK

> Let any grant program plug in AI evaluation.

**What:** Extract the judge agent pipeline into a configurable SDK that other grant programs (Gitcoin rounds, Optimism RPGF, Arbitrum grants) can integrate. Customizable dimensions, weights, rubrics, and evaluation criteria per program.

**Why:** The biggest value of agent-reviewer isn't the IPE City instance — it's the evaluation pattern. Every grant program has the same pain points. An SDK turns a single product into a platform.

**SDK surface:**
```typescript
const evaluator = createGrantEvaluator({
  dimensions: [
    { name: "technical", weight: 0.25, rubric: technicalRubric },
    { name: "impact", weight: 0.30, rubric: impactRubric },
    // ... customizable per program
  ],
  attestation: { provider: "eas", schema: "0x..." },
  storage: { ipfs: pinataClient },
  model: { provider: "openai", model: "gpt-4o" },
});

const result = await evaluator.evaluate(proposal);
// Returns: scores, justifications, IPFS CID, attestation UID
```

**Deliverables:**
- `@ipe-city/grant-evaluator` npm package
- Configurable dimension/rubric system
- Provider-agnostic (OpenAI, Anthropic, local models)
- Documentation + example integrations

**Depends on:** Expansion Phase A + B

---

### Expansion Phase D: Copilot Research Skill

> A Colosseum Copilot for the grants ecosystem.

**What:** Build a Claude Code / Codex skill (like Colosseum Copilot) that provides AI-powered research specifically for grant evaluation contexts. Curated dataset of past grant proposals, evaluation outcomes, funded project results, and ecosystem intelligence.

**Why:** Colosseum Copilot proved the model: domain-specific curated data + AI coding assistant = powerful research tool. The grants ecosystem lacks this entirely. A skill that knows "what proposals got funded, what worked, what didn't" is valuable for both evaluators and applicants.

**Data sources:**
- Gitcoin Grants historical data (public)
- Optimism RPGF rounds (public applications + outcomes)
- Arbitrum/Nouns/Aave grant program histories
- Karma GAP milestone completion data
- DeepDAO governance analytics
- Agent-reviewer's own evaluation history

**Capabilities:**
- "Has anyone built something similar to this proposal?" (competitive analysis)
- "What's the success rate for projects with this team size and budget?" (historical benchmarking)
- "Which grant programs have funded similar work?" (funding landscape)
- Gap classification: full (nobody doing this), partial (similar but different), false (already solved)

**Deliverables:**
- `npx skills add ipe-city/grant-copilot` installable skill
- Curated dataset pipeline (ingest + index public grant data)
- Conversational + deep-dive research modes
- Evidence requirements (citations, not speculation)

**Depends on:** Expansion Phase C (needs evaluation data history)

---

### Expansion Phase E: Hypercerts Impact Loop

> Close the feedback loop: evaluation before funding, impact certificates after.

**What:** Integrate with Hypercerts to issue impact certificates for funded projects. Judge agent evaluations become the "predicted impact" attached to the hypercert. Post-funding, Monitor Agents (from the ARWF reference architecture) update the certificate with actual outcomes.

**Why:** This closes the accountability loop that no grant program has today. Pre-funding: AI judges predict impact and score feasibility. Post-funding: Monitor agents track delivery. The delta between predicted and actual impact feeds back into the reputation system, making future evaluations better.

**Flow:**
```
Proposal → AI Judge Evaluation (predicted impact) → Funding Decision
    → Hypercert Issued (with predicted scores)
        → Monitor Agents Track Progress
            → Actual Impact Updated on Hypercert
                → Reputation Score Adjusted
                    → Better Future Evaluations
```

**Deliverables:**
- Hypercert minting integration
- Monitor Agent framework (from ARWF reference architecture)
- Predicted vs actual impact dashboard
- Reputation feedback loop into judge calibration

**Depends on:** Expansion Phase B (EAS attestations) + Phase 3 (Reputation History)

---

## 6. Expansion Roadmap Summary

```
Current Roadmap (Milestone 1)
├── Phase 1: On-Chain Foundation
├── Phase 2: AI Evaluation Pipeline
├── Phase 3: Reputation History
└── Phase 4: Visualization & Polish

Expansion (Milestone 2+)
├── Phase A: Evidence-Augmented Judges ← MCP tools, Dune, Exa
├── Phase B: EAS Attestation Layer ← Composable on-chain scores
├── Phase C: Grant Program SDK ← Platform play
├── Phase D: Copilot Research Skill ← "Colosseum Copilot for grants"
└── Phase E: Hypercerts Impact Loop ← Predicted vs actual impact
```

| Phase | Effort | Value | Risk | Priority |
|-------|--------|-------|------|----------|
| **A: Evidence-Augmented Judges** | Medium | High — dramatically improves evaluation quality | Low — additive to existing pipeline | P1 |
| **B: EAS Attestation Layer** | Low-Medium | High — composability unlocks ecosystem adoption | Low — well-documented protocol | P1 |
| **C: Grant Program SDK** | High | Very High — platform economics | Medium — API design is hard to change later | P2 |
| **D: Copilot Research Skill** | High | High — unique dataset moat | Medium — data curation is ongoing effort | P3 |
| **E: Hypercerts Impact Loop** | High | Very High — closes the accountability gap | High — depends on Monitor Agent design | P3 |

---

## 7. Competitive Positioning

**What exists today:**
- Gitcoin = popularity-based funding (quadratic voting)
- Questbook = structured human review (manual, doesn't scale)
- Karma GAP = post-funding accountability (no pre-award evaluation)
- Colosseum Copilot = ecosystem research skill (Solana-only, no evaluation)

**What agent-reviewer becomes:**
- **v1 (current roadmap):** AI judge system for IPE City grants — structured scoring, on-chain proof
- **v2 (expansion A+B):** Evidence-augmented judges with composable EAS attestations
- **v3 (expansion C+D):** Platform SDK + research skill — any grant program can plug in
- **v4 (expansion E):** Full impact accountability loop with Hypercerts

**Moat:** The combination of structured AI evaluation + on-chain provenance + prompt transparency (.prompt.md) doesn't exist anywhere. Each expansion phase deepens the moat — evidence augmentation improves quality, EAS improves composability, the SDK creates switching costs, the research skill creates a data moat, and Hypercerts creates a feedback loop that makes the system smarter over time.

---

## Sources

- [Gitcoin / Allo Protocol](https://gitcoin.co) — Quadratic funding infrastructure
- [Optimism RPGF](https://app.optimism.io/retropgf) — Retroactive public goods funding
- [Questbook](https://questbook.app) — Decentralized grant orchestration
- [Karma GAP](https://gap.karmahq.xyz) — Grantee Accountability Protocol
- [EAS (Ethereum Attestation Service)](https://attest.org) — On-chain attestation protocol
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) — Agent Identity Registry
- [Hypercerts](https://hypercerts.org) — Tokenized impact certificates
- [Verax](https://verax.gitbook.io/verax/) — Shared attestation registry
- [Colosseum Copilot](https://docs.colosseum.com/copilot/introduction) — Solana research skill
- [Exa MCP](https://github.com/exa-labs/exa-mcp-server) — Semantic web search for agents
- [Context7 MCP](https://github.com/upstash/context7) — Library documentation for agents
- [Firecrawl MCP](https://github.com/firecrawl/firecrawl-mcp-server) — Web scraping for agents
- [Dune Analytics](https://dune.com) — Blockchain analytics
- [DeFi Llama](https://defillama.com) — DeFi protocol analytics
- [DeepDAO](https://deepdao.io) — DAO analytics
- [CrewAI](https://github.com/crewaiinc/crewai) — Multi-agent orchestration
- [LangGraph](https://github.com/langchain-ai/langgraph) — Graph-based agent workflows
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) — Production agent framework
