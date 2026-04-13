# Feature 004: Colosseum Copilot Competitive Intelligence Integration

> **Framework**: Spec Kit
> **Worktree**: `speckit`
> **Feature ID**: 004
> **Status**: Proposed
> **Depends On**: Feature 001 (ARWF Judge System)
> **Author**: AI-generated feature specification

---

## 1. Feature Overview

### Problem Statement

The ARWF judge agents evaluate grant proposals using only the proposal text and their LLM training knowledge. They have no access to real-world competitive intelligence — whether similar projects exist, whether the problem is already solved, or how the market landscape looks. This creates a blind spot: a proposal claiming to revolutionize a space where 15 teams have already shipped gets the same evaluation treatment as one exploring genuine whitespace.

### Solution

Integrate [Colosseum Copilot](https://docs.colosseum.com/copilot/introduction) as a pre-evaluation enrichment layer. Before the 4 Mastra judge agents run, a new **Market Intelligence Agent** queries Colosseum's competitive intelligence API to gather:
- Similar projects from 5,400+ hackathon submissions
- Gap classification (Full / Partial / False)
- Incumbent analysis from 84,000+ archive documents
- Product landscape from 6,300+ crypto products

This research data flows into each judge's context, enabling market-grounded scoring.

### Value Proposition

| Stakeholder | Value |
|---|---|
| Grant evaluators | Scores backed by competitive evidence, not just LLM opinion |
| Proposal submitters | Feedback references real market data — actionable, not generic |
| Dispute challengers | Can cite competitive intelligence when contesting scores |
| IPE City platform | Evaluation quality differentiator — no other grant system does this |

---

## 2. User Stories

### US-004.1: Market-Aware Evaluation (P1)

**As a** grant evaluator viewing evaluation results,
**I want to** see what similar projects already exist in the market,
**So that** I can assess whether the judge scores reflect market reality.

**Acceptance Criteria:**
- Evaluation results page shows a "Market Intelligence" section
- Section displays similar projects with name, hackathon origin, and status
- Gap classification (Full/Partial/False) is prominently displayed
- Market data is clearly labeled as coming from Colosseum Copilot

### US-004.2: Enriched Judge Scoring (P1)

**As a** judge agent evaluating a proposal,
**I want to** receive competitive landscape data as part of my evaluation context,
**So that** my scores are grounded in what actually exists in the market.

**Acceptance Criteria:**
- Each judge receives a structured `marketContext` block in its prompt
- Technical Feasibility judge sees similar builds and their outcomes
- Impact Potential judge sees gap classification and TAM data
- Cost Efficiency judge sees competitor pricing benchmarks
- Team Capability judge sees founder-market fit signals
- Judges explicitly instructed: market data informs, does not dictate scores

### US-004.3: Graceful Degradation (P1)

**As a** system operator,
**I want** evaluations to complete successfully even when Colosseum API is unavailable,
**So that** the evaluation pipeline is never blocked by an external dependency.

**Acceptance Criteria:**
- Evaluation runs without market context when API is down/slow/expired
- Evaluation result includes `marketResearch: null` with failure reason
- No user-facing errors — evaluation theater shows "Market research unavailable"
- Health check endpoint reports Colosseum API status

### US-004.4: Research Transparency (P2)

**As a** proposal submitter reviewing my evaluation,
**I want to** see the competitive intelligence data that informed my scores,
**So that** I can understand why judges scored the way they did and improve future proposals.

**Acceptance Criteria:**
- Market research data is pinned to IPFS alongside evaluation results
- Research IPFS CID is stored on-chain in the EvaluationRegistry
- UI links to the full research report on IPFS
- Research data is immutable — same content hash always produces same research

### US-004.5: Dispute Evidence (P2)

**As a** dispute challenger contesting an evaluation,
**I want to** reference competitive intelligence data in my dispute,
**So that** I can argue that a score doesn't match market reality.

**Acceptance Criteria:**
- Dispute form allows citing market research findings
- Dispute reviewers can see both the evaluation and the market context
- If research shows "False gap" but Impact scored high, this is flaggable
- Market coherence score is computed and displayed

---

## 3. Architecture: Mastra Agent Integration

### New Agent: Market Intelligence

The integration adds a Mastra agent that runs before the existing 4 judges:

```typescript
// src/evaluation/agents/market-intelligence.ts
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { marketResearchOutputSchema } from './schemas';

export const marketIntelligenceAgent = new Agent({
  id: 'market-intelligence',
  model: openai('gpt-4o'),
  instructions: `You are a market intelligence researcher for IPE City grant evaluations.
    
    Your role is to analyze competitive intelligence data from Colosseum Copilot 
    and produce a structured market context report that will inform judge agents.
    
    You receive raw research data (similar projects, gap classifications, market 
    signals) and synthesize it into actionable context for each evaluation dimension.
    
    Be precise. Cite specific projects and data points. Never speculate beyond 
    the evidence provided.`,
  outputSchema: marketResearchOutputSchema,
});
```

### Workflow Integration

The enhanced evaluation workflow uses Mastra's `workflow.step()` to sequence research before parallel judges:

```
┌─────────────────────────────────────────────────────┐
│                  Mastra Workflow                     │
│                                                     │
│  step("sanitize")                                   │
│       │                                             │
│       ▼                                             │
│  step("research")  ← Colosseum API + Agent          │
│       │                                             │
│       ▼                                             │
│  parallel([                                         │
│    step("judge-technical"),   ← enriched w/ context │
│    step("judge-impact"),      ← enriched w/ context │
│    step("judge-cost"),        ← enriched w/ context │
│    step("judge-team"),        ← enriched w/ context │
│  ])                                                 │
│       │                                             │
│       ▼                                             │
│  step("anomaly-detection")   ← includes market      │
│       │                          coherence check     │
│       ▼                                             │
│  step("aggregate-and-publish")                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Agent Registry Update

```typescript
// Addition to src/evaluation/agents/registration.ts
import { marketIntelligenceAgent } from './market-intelligence';

export const agentRegistry = {
  // Existing judges
  'judge-technical': technicalFeasibilityAgent,
  'judge-impact': impactPotentialAgent,
  'judge-cost': costEfficiencyAgent,
  'judge-team': teamCapabilityAgent,
  
  // New: Market intelligence
  'market-intelligence': marketIntelligenceAgent,
};
```

---

## 4. Evaluation Pipeline Enhancement

### Current Pipeline (`orchestrate.ts`)

```
Sanitize → Parallel Judges → Anomaly Detection → Score → Publish
```

### Enhanced Pipeline

```
Sanitize → Colosseum Research → Parallel Judges (enriched) → Anomaly Detection (extended) → Score → Publish
```

### Integration Points

#### 4.1 `orchestrate.ts` — Add Research Step

```typescript
// New step between sanitize and judge dispatch
async function orchestrateEvaluation(proposal: SanitizedProposal) {
  // Step 1: Research (new)
  const research = await performMarketResearch(proposal);
  const marketContext = research 
    ? synthesizeMarketContext(research)
    : null;
  
  // Step 2: Parallel judges (enriched)
  const judgeResults = await runner.evaluateAll(
    proposal,
    marketContext, // NEW parameter
  );
  
  // Step 3: Anomaly detection (extended)
  const anomalies = detectAnomalies(judgeResults, marketContext);
  
  // Step 4: Score and publish (existing)
  const score = computeScore(judgeResults);
  await publishResults(proposal, score, research);
}
```

#### 4.2 `agents/prompts.ts` — Context Enrichment

Each judge's system prompt receives a `marketContext` block appended to its instructions. The context is dimension-specific:

| Dimension | Market Context Received |
|---|---|
| Technical Feasibility | Similar builds, tech stacks used, success/failure outcomes |
| Impact Potential | Gap classification, TAM, market maturity, competitor count |
| Cost Efficiency | Competitor pricing models, revenue benchmarks, cost structures |
| Team Capability | Founder-market fit signals, ideal team composition patterns |

#### 4.3 `schemas.ts` — Extended Evaluation Input

```typescript
// New schema for market context
export const marketContextSchema = z.object({
  gapClassification: z.object({
    type: z.enum(['full', 'partial', 'false']),
    rationale: z.string(),
    uncoveredSegment: z.string().optional(),
  }),
  similarProjects: z.array(z.object({
    name: z.string(),
    hackathon: z.string().optional(),
    status: z.enum(['active', 'inactive', 'unknown']),
    description: z.string(),
    relevance: z.enum(['direct_competitor', 'adjacent', 'inspiration']),
  })),
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(['emerging', 'growing', 'mature']),
  estimatedTAM: z.string().nullable(),
  keyInsights: z.array(z.string()),
});

// Extended evaluation input
export const enrichedEvaluationInputSchema = evaluationInputSchema.extend({
  marketContext: marketContextSchema.nullable(),
});
```

#### 4.4 `anomaly.ts` — Market Coherence Detection

New anomaly type: **market coherence violation**

```typescript
// New anomaly detector
function detectMarketCoherenceAnomaly(
  judgeResults: DimensionResult[],
  marketContext: MarketContext | null,
): Anomaly | null {
  if (!marketContext) return null;
  
  const impactScore = judgeResults.find(
    r => r.dimension === 'impact_potential'
  )?.score ?? 0;
  
  // False gap + high impact = suspicious
  if (
    marketContext.gapClassification.type === 'false' && 
    impactScore > 7500 // 75% in basis points
  ) {
    return {
      type: 'market_coherence_violation',
      severity: 'warning',
      description: `Impact Potential scored ${impactScore/100}% but market research 
        classifies this as a FALSE gap (problem already solved by existing projects). 
        Review recommended.`,
      suggestedAction: 'manual_review',
    };
  }
  
  // Full gap + low impact = also suspicious
  if (
    marketContext.gapClassification.type === 'full' && 
    impactScore < 3000
  ) {
    return {
      type: 'market_coherence_violation',
      severity: 'info',
      description: `Impact Potential scored ${impactScore/100}% but market research 
        found a FULL gap (no existing solution). Judges may be undervaluing novelty.`,
      suggestedAction: 'flag_for_review',
    };
  }
  
  return null;
}
```

#### 4.5 `scoring.ts` — Optional Market Adjustment

Market data does NOT change scores directly. Instead, it produces a **market coherence score** that accompanies the evaluation:

```typescript
export function computeMarketCoherenceScore(
  judgeResults: DimensionResult[],
  marketContext: MarketContext,
): number {
  // 0-10000 basis points representing how well judge scores 
  // align with market reality
  // High coherence = judges and market data agree
  // Low coherence = potential evaluation issue
  
  let coherence = 5000; // baseline: neutral
  
  // Adjust based on gap type vs impact score alignment
  // Adjust based on competitor count vs technical novelty claims
  // Adjust based on market maturity vs cost efficiency expectations
  
  return Math.max(0, Math.min(10000, coherence));
}
```

---

## 5. Data Model Extensions

### Colosseum API Client Schemas

```typescript
// src/lib/colosseum/schemas.ts

export const colosseumQuerySchema = z.object({
  query: z.string().min(10).max(2000),
  domain: z.string().min(2).max(100),
  mode: z.enum(['conversational', 'deep_dive']),
});

export const colosseumResponseSchema = z.object({
  similarProjects: z.array(z.object({
    name: z.string(),
    hackathon: z.string().optional(),
    year: z.number().optional(),
    status: z.enum(['active', 'inactive', 'unknown']),
    techStack: z.array(z.string()),
    description: z.string(),
    accelerator: z.string().optional(),
  })),
  gapClassification: z.object({
    type: z.enum(['full', 'partial', 'false']),
    rationale: z.string(),
    existingCoverage: z.string().optional(),
    uncoveredSegment: z.string().optional(),
  }),
  archiveInsights: z.array(z.object({
    source: z.string(),
    insight: z.string(),
    relevance: z.string(),
  })),
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(['emerging', 'growing', 'mature']),
  estimatedTAM: z.string().nullable(),
  keyInsights: z.array(z.string()),
  risks: z.array(z.string()),
  furtherReading: z.array(z.string()).optional(),
});
```

### Turso Cache Schema Extension

```sql
-- New table for cached research results
CREATE TABLE market_research (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proposals(id),
  domain_hash TEXT NOT NULL,
  gap_type TEXT NOT NULL CHECK(gap_type IN ('full', 'partial', 'false')),
  competitor_count INTEGER NOT NULL DEFAULT 0,
  market_maturity TEXT NOT NULL,
  raw_response TEXT NOT NULL,        -- JSON blob
  ipfs_cid TEXT,
  researched_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,          -- 24h TTL
  
  UNIQUE(proposal_id)
);

CREATE INDEX idx_market_research_domain ON market_research(domain_hash);
CREATE INDEX idx_market_research_expires ON market_research(expires_at);
```

### IPFS Storage

Research results are pinned as a separate IPFS document:

```typescript
interface MarketResearchIPFSDocument {
  version: '1.0.0';
  proposalId: string;
  researchedAt: string;
  source: 'colosseum-copilot';
  apiVersion: string;
  gapClassification: GapClassification;
  similarProjects: SimilarProject[];
  competitorCount: number;
  marketMaturity: string;
  keyInsights: string[];
  // Content hash of the proposal that was researched
  proposalContentHash: string;
}
```

---

## 6. API Design

### New Endpoints

#### `POST /api/research/[proposalId]`

Trigger Colosseum research for a specific proposal.

```typescript
// Request: empty body (proposal data loaded from DB)
// Response:
{
  researchId: string;
  status: 'complete' | 'cached';
  gapType: 'full' | 'partial' | 'false';
  competitorCount: number;
  similarProjects: SimilarProject[];
  ipfsCid: string;
  cachedUntil: string; // ISO timestamp
}
```

#### `GET /api/research/[proposalId]`

Retrieve cached research results.

```typescript
// Response:
{
  researchId: string;
  proposalId: string;
  gapClassification: GapClassification;
  similarProjects: SimilarProject[];
  competitorCount: number;
  marketMaturity: string;
  keyInsights: string[];
  ipfsCid: string;
  researchedAt: string;
  expiresAt: string;
}
// Returns 404 if no research exists for this proposal
```

#### `GET /api/colosseum/health`

Check Colosseum API connectivity and token validity.

```typescript
// Response:
{
  status: 'healthy' | 'degraded' | 'unavailable';
  tokenValid: boolean;
  tokenExpiresAt: string | null;
  lastSuccessfulCall: string | null;
  apiVersion: string | null;
  errorMessage: string | null;
}
```

### Modified Endpoints

#### `POST /api/evaluate/[id]` (existing)

Add optional `skipResearch` query parameter:

```typescript
// POST /api/evaluate/123?skipResearch=true
// Skips Colosseum research phase, runs judges without market context
// Useful for: testing, re-evaluations, manual override
```

---

## 7. Security Considerations

### API Token Management

- `COLOSSEUM_COPILOT_PAT` stored as server-side env var only
- Never exposed to client-side code (no `NEXT_PUBLIC_` prefix)
- 90-day expiry — document rotation procedure in deployment runbook
- Health check endpoint monitors token validity without exposing token value

### Data Sanitization

Colosseum API returns external data that enters judge prompts. Security layers:

1. **PII filtering first**: Existing `sanitization.ts` strips PII from proposal before sending to Colosseum
2. **Response validation**: Zod schema rejects unexpected fields/types from API response
3. **Text sanitization**: Strip control characters, truncate string fields to maximum lengths
4. **Prompt boundary**: Research data injected in a clearly delimited `## Market Context` block, not as system instructions
5. **Judge instructions**: Explicit directive that market data is informational, not imperative

### Rate Limiting

- Colosseum API has rate limits (specific thresholds TBD from API Reference)
- Client implements exponential backoff with max 2 retries
- Research requests cached per domain hash (24h TTL) to minimize API calls
- Batch evaluations reuse domain-level research

### IPFS Transparency

All research data pinned to IPFS is public. Ensure:
- No PII in research results (proposal is sanitized before research query)
- No API tokens or internal identifiers in pinned documents
- Research document includes source attribution ("Colosseum Copilot")

---

## 8. Implementation Tasks

### Task Order and Dependencies

```
T1: API Client ──────────────────┐
T2: Zod Schemas ─────────────────┤
                                 ├──► T4: Orchestrator Integration
T3: Market Intelligence Agent ───┤    T5: Prompt Enrichment
                                 │    T6: Anomaly Detection Extension
                                 │
                                 ├──► T7: API Routes
                                 │    T8: IPFS Storage
                                 │
                                 └──► T9: UI Components
                                      T10: E2E Tests
```

### Task Details

| # | Task | Description | Depends On | Files |
|---|------|-------------|------------|-------|
| T1 | Colosseum API Client | REST client with auth, retry, timeout, caching | — | `src/lib/colosseum/client.ts` |
| T2 | Zod Schemas | Request/response schemas for Colosseum API + market context | — | `src/lib/colosseum/schemas.ts` |
| T3 | Market Intelligence Agent | Mastra agent that calls Colosseum and synthesizes research | T1, T2 | `src/evaluation/agents/market-intelligence.ts` |
| T4 | Orchestrator Integration | Add research step to `orchestrate.ts` | T3 | `src/evaluation/orchestrate.ts` |
| T5 | Prompt Enrichment | Add `marketContext` to judge prompts | T2 | `src/evaluation/agents/prompts.ts` |
| T6 | Anomaly Detection Extension | Market coherence violation detection | T2 | `src/evaluation/anomaly.ts` |
| T7 | API Routes | `/api/research/`, `/api/colosseum/health` | T1, T3 | `src/app/api/research/`, `src/app/api/colosseum/` |
| T8 | IPFS Storage | Pin research results alongside evaluations | T3 | `src/lib/ipfs/research.ts` |
| T9 | UI: Market Context Display | Show research on evaluation results page | T7 | `src/components/market-context-panel.tsx` |
| T10 | E2E Tests | Research → enriched evaluation → display flow | T7, T9 | `e2e/colosseum-integration.spec.ts` |

---

## 9. Spec Kit Artifacts

This feature would generate the following Spec Kit documents:

```
specs/
└── 004-colosseum-integration/
    ├── spec.md          ← This document (feature specification)
    ├── research.md      ← Colosseum API capabilities, limitations, alternatives
    ├── data-model.md    ← Zod schemas, DB tables, IPFS document formats
    ├── plan.md          ← Architecture decisions, integration patterns
    └── tasks.md         ← Ordered implementation tasks with estimates
```

### Spec Kit Commands to Execute

```bash
# 1. Create the feature specification
/speckit-specify "Colosseum Copilot competitive intelligence integration"

# 2. Clarify underspecified areas  
/speckit-clarify

# 3. Generate implementation plan
/speckit-plan

# 4. Generate ordered tasks
/speckit-tasks

# 5. Analyze consistency across artifacts
/speckit-analyze

# 6. Convert to GitHub issues
/speckit-taskstoissues

# 7. Execute implementation
/speckit-implement
```

---

## 10. Dependencies and Risks

### Dependencies

| Dependency | Status | Risk Level |
|---|---|---|
| Feature 001 (ARWF Judge System) | Complete | None |
| Feature 002 (Security Tests) | Complete | None |
| Colosseum Copilot API access | Requires PAT | Low |
| Mastra workflow engine | Installed (`@mastra/core@1.24.1`) | None |
| IPFS pinning (Pinata) | Configured | None |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Solana-focus mismatch**: Colosseum data is Solana-centric; our proposals target Base/Ethereum | High | Medium | Treat as general crypto ecosystem intelligence; most patterns are cross-chain. Add disclaimer. |
| **API rate limits during batch evaluations** | Medium | Medium | Cache per domain hash (24h), batch proposals by vertical, implement backoff |
| **Token expiry (90-day)** | Certain | Low | Health check endpoint, monitoring alert, documented rotation procedure |
| **Colosseum API downtime** | Low | Low | Graceful degradation — evaluations work without research |
| **Prompt injection via research data** | Low | High | Zod validation, text sanitization, prompt boundary isolation, informational-only framing |
| **Research quality for non-Solana proposals** | Medium | Medium | Accept lower confidence; market intelligence agent rates its own confidence level |

### Cross-Chain Mapping Strategy

Since Colosseum is Solana-focused but our platform evaluates cross-chain proposals:

1. **Domain-level research**: Query by problem domain ("DEX", "lending", "identity"), not chain
2. **Cross-chain relevance**: A Solana DEX submission is relevant context for a Base DEX proposal
3. **Confidence adjustment**: Research confidence is lower for non-Solana proposals — surfaced in UI
4. **Future**: As Colosseum expands coverage, cross-chain gaps close naturally
