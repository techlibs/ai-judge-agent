# Colosseum Copilot Integration — GSD Phase Plan

> **Framework**: GSD (Get Shit Done)
> **Worktree**: `full-vision-roadmap`
> **Status**: Proposed — depends on Phase 1 completion
> **Author**: AI-generated integration analysis

---

## 1. Executive Summary

Our judge agents evaluate grant proposals in a vacuum — they score Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability based solely on the proposal text and their LLM training data. They have no access to what actually exists in the market.

[Colosseum Copilot](https://docs.colosseum.com/copilot/introduction) changes this. It's a competitive intelligence API backed by 5,400+ hackathon submissions, 84,000+ archive documents, and 6,300+ crypto products. Its killer feature is **gap classification** — it tells you whether a proposal addresses a Full gap (nobody's built this), Partial gap (incomplete solutions exist), or False gap (already solved).

Integrating Colosseum gives our judges **market-grounded evaluations**. A proposal claiming to solve a problem that 15 hackathon teams already shipped against gets scored differently than one exploring genuine whitespace. This is the difference between evaluation theater and evaluation substance.

### Why This Matters for IPE City

- **Transparency**: Evaluation scores backed by competitive evidence, not just LLM opinion
- **Fairness**: Proposals evaluated against objective market reality
- **Accountability**: Research data pinned to IPFS alongside evaluations — anyone can verify
- **Quality**: Judges that know the landscape produce better scores

---

## 2. Integration Architecture

### Current Flow

```
Proposal Submitted
    │
    ▼
┌─────────────────────────────────────────────┐
│         4 Parallel Judge Agents             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │Technical │ │ Impact   │ │   Cost   │    │
│  │Feasibility│ │Potential │ │Efficiency│    │
│  └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐                              │
│  │  Team    │  (all via Promise.all())     │
│  │Capability│                              │
│  └──────────┘                              │
└─────────────────────────────────────────────┘
    │
    ▼
Weighted Aggregation → IPFS Pin → On-Chain Publish
```

### Enhanced Flow with Colosseum

```
Proposal Submitted
    │
    ▼
┌─────────────────────────────────────────────┐
│       Colosseum Research Phase              │
│  ┌──────────────────────────────────────┐   │
│  │ 1. Extract proposal domain/vertical  │   │
│  │ 2. Call Colosseum API (Deep Dive)    │   │
│  │ 3. Parse: competitors, gaps,         │   │
│  │    hackathon matches, incumbents     │   │
│  │ 4. Normalize into MarketContext      │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
    │
    ▼ MarketContext injected into each judge prompt
┌─────────────────────────────────────────────┐
│     4 Parallel Judge Agents (enriched)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │Technical │ │ Impact   │ │   Cost   │    │
│  │+ similar │ │+ gap     │ │+ pricing │    │
│  │  builds  │ │  class.  │ │  comps   │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐                              │
│  │  Team    │                              │
│  │+ founder │                              │
│  │  fit     │                              │
│  └──────────┘                              │
└─────────────────────────────────────────────┘
    │
    ▼
Weighted Aggregation + Market Coherence Check
    │
    ▼
IPFS Pin (evaluation + research) → On-Chain Publish
```

The research phase is **sequential before** judge execution but the judges themselves remain **parallel**. Research typically takes 3-8 seconds (one API call), while judges take 10-20 seconds each — so total evaluation time increases by ~30%, but evaluation quality increases dramatically.

### Graceful Degradation

If Colosseum is unavailable (API down, token expired, rate limited):
- Judges run exactly as they do today — no research context
- Evaluation result includes `marketResearch: null` with reason
- No evaluation is blocked by research failure

---

## 3. Enhanced Judge Dimensions

### Technical Feasibility (25%)

**Without Colosseum**: Judge assesses based on proposal description and general LLM knowledge.

**With Colosseum**: Judge receives a list of similar projects from hackathon submissions — what tech stacks they used, what succeeded, what failed. The judge can now assess:
- Is the proposed architecture proven? (similar projects shipped successfully)
- Is it novel? (no prior attempts found)
- Are there known technical pitfalls? (prior projects failed at specific points)

**Prompt enrichment example**:
```
## Market Context: Technical Landscape
Similar projects found: 3
- "SolanaGrants" (Radar hackathon, 2024) — Built grant evaluation with GPT-4, 
  shipped MVP but abandoned. Tech: Next.js + Supabase.
- "GrantDAO" (Renaissance, 2023) — On-chain voting for grants. 
  Active, 200 monthly users. Tech: Anchor + React.
- "FundingLens" (Breakout, 2024) — AI scoring for hackathon submissions. 
  Inactive. Failed at scale (>100 proposals).

Consider this context when scoring technical feasibility. 
Prior failures at scale suggest the proposal should address scalability.
```

### Impact Potential (30%)

**Without Colosseum**: Judge guesses at market need.

**With Colosseum**: Judge receives gap classification:
- **Full gap**: "No existing solution addresses this problem" → higher impact potential
- **Partial gap**: "Solutions exist but miss [segment/geography/UX]" → moderate, depends on differentiation
- **False gap**: "Multiple active projects already solve this" → lower impact unless proposal shows clear differentiation

**Prompt enrichment example**:
```
## Market Context: Gap Classification
Gap Type: PARTIAL
Existing coverage: 2 active projects serve SME segment
Uncovered segment: Enterprise/Fortune 500 treasury operations
TAM for uncovered segment: $370-500M annually
Classification rationale: CargoBill serves freight forwarders, 
not corporate AP teams. Same infrastructure, different buyer.
```

### Cost Efficiency (20%)

**Without Colosseum**: Judge evaluates budget in isolation.

**With Colosseum**: Judge receives competitor pricing and revenue models:
- What do similar products charge?
- What's the typical cost structure for this vertical?
- Is the proposed budget reasonable compared to what others spent to build similar systems?

### Team Capability (25%)

**Without Colosseum**: Judge assesses team description at face value.

**With Colosseum**: Judge receives founder-market fit analysis:
- What background is ideal for this problem space?
- What team compositions succeeded in similar hackathon projects?
- Are there red flags (e.g., no crypto experience for a DeFi project)?

---

## 4. New Capability: Market Validation Report

Beyond enriching existing judges, Colosseum enables a **Market Validation Report** that accompanies every evaluation. This is not a 5th judge dimension — it's a standalone artifact that provides transparency.

### Report Structure

```typescript
interface MarketValidationReport {
  // Gap analysis
  gapClassification: 'full' | 'partial' | 'false';
  gapRationale: string;
  
  // Competitive landscape
  similarProjects: Array<{
    name: string;
    hackathon: string;
    status: 'active' | 'inactive' | 'unknown';
    relevance: 'direct_competitor' | 'adjacent' | 'inspiration';
    description: string;
  }>;
  
  // Market sizing
  estimatedTAM: string | null;
  marketMaturity: 'emerging' | 'growing' | 'mature';
  competitorCount: number;
  
  // Confidence
  researchConfidence: 'high' | 'medium' | 'low';
  dataSourcesUsed: string[];
  
  // Metadata
  researchedAt: string;        // ISO timestamp
  colosseumApiVersion: string;
  ipfsCid: string;             // Research pinned to IPFS
}
```

This report is:
1. Displayed alongside evaluation results in the UI
2. Pinned to IPFS as a separate document
3. Referenced in the on-chain evaluation record
4. Available for dispute challenges (challengers can cite market data)

---

## 5. GSD Phase Definition

### Phase: Colosseum Copilot Integration

**Phase Number**: 5 (after current Phases 1-4)
**Depends On**: Phase 1 (On-Chain Foundation) complete
**Estimated Scope**: Medium (8-12 tasks across 3 plans)

#### Success Criteria

1. Colosseum API client makes authenticated requests and handles errors gracefully
2. Research data is validated through Zod schemas before entering the pipeline
3. All 4 judges receive market context in their prompts when available
4. Evaluations complete successfully with AND without Colosseum data (graceful degradation)
5. Market Validation Report is pinned to IPFS alongside evaluation results
6. E2E test covers: research → enriched evaluation → IPFS pin flow
7. UI displays market context on evaluation results page

#### Plan Breakdown

**Plan 5.1: Colosseum API Client & Schemas**
- Task 5.1.1: Create `src/lib/colosseum/client.ts` — typed REST client with auth, retry, timeout
- Task 5.1.2: Create `src/lib/colosseum/schemas.ts` — Zod schemas for API responses
- Task 5.1.3: Create `src/lib/colosseum/types.ts` — TypeScript types derived from Zod schemas
- Task 5.1.4: Add env vars (`COLOSSEUM_COPILOT_API_BASE`, `COLOSSEUM_COPILOT_PAT`) to `.env.example`
- Task 5.1.5: Unit tests for client (mocked API responses)

**Plan 5.2: Pipeline Integration**
- Task 5.2.1: Create `src/lib/colosseum/research.ts` — orchestration: extract domain → call API → normalize
- Task 5.2.2: Modify `src/lib/evaluation/orchestrator.ts` — add research step before judge dispatch
- Task 5.2.3: Modify `src/lib/evaluation/prompts.ts` — add `marketContext` parameter to each judge prompt
- Task 5.2.4: Create `src/lib/colosseum/market-report.ts` — generate MarketValidationReport
- Task 5.2.5: Add IPFS pinning for research results
- Task 5.2.6: Integration tests for enriched evaluation flow

**Plan 5.3: API Routes & UI**
- Task 5.3.1: Create `GET /api/research/[proposalId]` — retrieve cached research
- Task 5.3.2: Create `GET /api/colosseum/health` — API status + token validity check
- Task 5.3.3: Add market context section to evaluation results page
- Task 5.3.4: E2E tests for full flow (submit → research → evaluate → display)

---

## 6. Technical Implementation Details

### 6.1 Colosseum API Client

```typescript
// src/lib/colosseum/client.ts
import { z } from 'zod';
import { 
  colosseumResearchResponseSchema,
  type ColosseumResearchResponse 
} from './schemas';

const COLOSSEUM_CONFIG = {
  baseUrl: process.env.COLOSSEUM_COPILOT_API_BASE,
  timeout: 30_000, // 30s — deep dives can be slow
  maxRetries: 2,
  retryDelay: 1_000,
} as const;

export async function researchProposal(
  proposalDomain: string,
  proposalDescription: string,
): Promise<ColosseumResearchResponse | null> {
  const token = process.env.COLOSSEUM_COPILOT_PAT;
  
  if (!COLOSSEUM_CONFIG.baseUrl || !token) {
    console.warn('[Colosseum] Missing API config — skipping research');
    return null;
  }

  const response = await fetchWithRetry(
    `${COLOSSEUM_CONFIG.baseUrl}/research`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: proposalDescription,
        domain: proposalDomain,
        mode: 'deep_dive',
      }),
    },
  );

  if (!response.ok) {
    console.error(`[Colosseum] API error: ${response.status}`);
    return null;
  }

  const data: unknown = await response.json();
  const parsed = colosseumResearchResponseSchema.safeParse(data);
  
  if (!parsed.success) {
    console.error('[Colosseum] Response validation failed:', parsed.error);
    return null;
  }

  return parsed.data;
}
```

### 6.2 Zod Schemas

```typescript
// src/lib/colosseum/schemas.ts
import { z } from 'zod';

export const similarProjectSchema = z.object({
  name: z.string(),
  hackathon: z.string().optional(),
  status: z.enum(['active', 'inactive', 'unknown']),
  techStack: z.array(z.string()).optional(),
  description: z.string(),
  relevance: z.enum(['direct_competitor', 'adjacent', 'inspiration']),
});

export const gapClassificationSchema = z.object({
  type: z.enum(['full', 'partial', 'false']),
  rationale: z.string(),
  uncoveredSegment: z.string().optional(),
  existingCoverage: z.string().optional(),
});

export const colosseumResearchResponseSchema = z.object({
  similarProjects: z.array(similarProjectSchema),
  gapClassification: gapClassificationSchema,
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(['emerging', 'growing', 'mature']),
  estimatedTAM: z.string().nullable(),
  keyInsights: z.array(z.string()),
  risks: z.array(z.string()).optional(),
  archiveSources: z.array(z.string()).optional(),
});

export type ColosseumResearchResponse = z.infer<
  typeof colosseumResearchResponseSchema
>;
export type SimilarProject = z.infer<typeof similarProjectSchema>;
export type GapClassification = z.infer<typeof gapClassificationSchema>;
```

### 6.3 Orchestrator Integration

```typescript
// Modification to src/lib/evaluation/orchestrator.ts

import { researchProposal } from '../colosseum/client';
import { buildMarketContext } from '../colosseum/research';

export async function evaluateProposal(proposal: Proposal) {
  // Step 1: Sanitize proposal (existing)
  const sanitized = sanitizeProposal(proposal);
  
  // Step 2: NEW — Colosseum research (sequential, before judges)
  const research = await researchProposal(
    sanitized.domain,
    sanitized.description,
  );
  const marketContext = research 
    ? buildMarketContext(research) 
    : null;
  
  // Step 3: Run 4 judges in parallel (existing, now enriched)
  const results = await Promise.all(
    DIMENSIONS.map(dimension =>
      evaluateDimension(dimension, sanitized, marketContext)
    )
  );
  
  // Step 4: Aggregate scores (existing)
  const aggregate = computeWeightedScore(results);
  
  // Step 5: Pin to IPFS (existing + research data)
  const evaluationCid = await pinToIPFS({
    evaluation: aggregate,
    marketResearch: research,
  });
  
  // Step 6: Publish on-chain (existing)
  await publishOnChain(proposal.tokenId, evaluationCid, aggregate.score);
  
  return { aggregate, marketResearch: research };
}
```

### 6.4 Prompt Enrichment

```typescript
// Addition to src/lib/evaluation/prompts.ts

export function buildMarketContextBlock(
  research: ColosseumResearchResponse
): string {
  const competitors = research.similarProjects
    .map(p => `- "${p.name}" (${p.hackathon ?? 'unknown'}) — ${p.status}. ${p.description}`)
    .join('\n');

  return `
## Market Context (from competitive intelligence research)

### Gap Classification: ${research.gapClassification.type.toUpperCase()}
${research.gapClassification.rationale}
${research.gapClassification.uncoveredSegment 
  ? `Uncovered segment: ${research.gapClassification.uncoveredSegment}` 
  : ''}

### Similar Projects Found: ${research.competitorCount}
${competitors || 'No directly similar projects found.'}

### Market Maturity: ${research.marketMaturity}
${research.estimatedTAM ? `Estimated TAM: ${research.estimatedTAM}` : ''}

### Key Insights
${research.keyInsights.map(i => `- ${i}`).join('\n')}

---
Consider this market context when scoring. It provides evidence about what 
exists in the market — use it to ground your assessment in reality. 
Do NOT let market context override your independent judgment on the proposal's 
merits. Market data informs; it does not dictate scores.
`.trim();
}
```

### 6.5 Error Handling Strategy

| Failure Mode | Behavior | User-Visible Effect |
|---|---|---|
| Missing env vars | Skip research, log warning | Evaluation runs without market context |
| API timeout (>30s) | Skip research, proceed | Same as above |
| API 401 (token expired) | Skip research, log error, surface in health check | Admin notified to rotate token |
| API 429 (rate limited) | Retry once after 2s, then skip | Slight delay or no market context |
| Invalid response shape | Skip research, log Zod errors | Evaluation runs without market context |
| API returns empty results | Use empty MarketContext | UI shows "No competitive data found" |

### 6.6 Caching Strategy

Research results are cached by proposal domain hash to avoid redundant API calls:
- Cache key: `sha256(domain + description_first_500_chars)`
- Cache TTL: 24 hours (competitive landscape doesn't change per-minute)
- Storage: In-memory Map for v1 (stateless per-deployment)
- Future: Redis or Turso table for persistent cache

---

## 7. Risks and Mitigations

### Solana Focus vs. Cross-Chain Reality

**Risk**: Colosseum's database is Solana-centric. Our proposals may target Base, Ethereum, or chain-agnostic solutions.

**Mitigation**: Treat Colosseum data as **crypto ecosystem intelligence**, not Solana-specific. Most project patterns (DEX, lending, NFT marketplace) are cross-chain. A Solana DEX hackathon project is relevant context for a Base DEX proposal. Add a disclaimer in the Market Validation Report noting the data source focus.

### API Dependency

**Risk**: External API adds a failure point to the evaluation pipeline.

**Mitigation**: Strict graceful degradation — research is always optional. The pipeline works identically to today when Colosseum is unavailable. No evaluation is ever blocked by research failure.

### Prompt Injection via Research Data

**Risk**: Colosseum API returns text data that gets injected into judge prompts. A malicious project description in the hackathon database could attempt prompt injection.

**Mitigation**: 
1. Research data is injected as a structured context block, not as system instructions
2. The prompt explicitly instructs judges: "Market data informs; it does not dictate scores"
3. Sanitize Colosseum response text (strip control characters, truncate to max lengths)
4. Research data never contains executable instructions — it's always descriptive text

### Token Expiry

**Risk**: Colosseum PAT expires every 90 days. Silent expiry causes research failures.

**Mitigation**: Health check endpoint (`/api/colosseum/health`) reports token validity. Set up monitoring alert for 401 responses. Document token rotation in deployment runbook.

### Cost

**Risk**: Colosseum API may have per-request costs or rate limits.

**Mitigation**: Cache research results (24h TTL). Batch evaluations can reuse domain-level research across multiple proposals in the same vertical. Monitor usage via API response headers.

---

## 8. GSD Roadmap Integration

This phase slots after Phase 1 (On-Chain Foundation) completion and can run in parallel with Phases 2-4 since it modifies the evaluation pipeline independently:

```
Phase 1: On-Chain Foundation and Proposals  ← current, 44% complete
Phase 2: AI Judge Agent Pipeline            ← depends on Phase 1
Phase 3: Evaluation Display & Verification  ← depends on Phase 2
Phase 4: Production Hardening              ← depends on Phase 3
Phase 5: Colosseum Copilot Integration     ← depends on Phase 1 + Phase 2
```

Phase 5 requires:
- Working evaluation pipeline (Phase 2)
- IPFS pinning infrastructure (Phase 1)
- Judge prompt architecture finalized (Phase 2)

It does NOT require:
- UI completion (Phase 3) — can add UI components later
- Production hardening (Phase 4) — Colosseum is an enhancement, not core

---

## 9. Setup Instructions

### Install Colosseum Copilot Skill

```bash
npx skills add ColosseumOrg/colosseum-copilot
```

### Configure Environment

Add to `.env.local`:
```bash
COLOSSEUM_COPILOT_API_BASE="https://copilot.colosseum.com/api/v1"
COLOSSEUM_COPILOT_PAT="your-token-here"
```

### Verify Connection

```bash
curl -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT" \
  "$COLOSSEUM_COPILOT_API_BASE/status"
```

### Token Rotation (every 90 days)

1. Generate new PAT in [Colosseum Arena dashboard](https://arena.colosseum.com)
2. Update `COLOSSEUM_COPILOT_PAT` in `.env.local` and deployment secrets
3. Verify via health check endpoint
