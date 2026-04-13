# Colosseum Copilot Integration — Superpowers Agent Team Plan

> **Framework**: Superpowers (autonomy-first, agent-driven)
> **Worktree**: `superpower`
> **Status**: Proposed — Phase 2 candidate
> **Author**: AI-generated integration analysis

---

## 1. Vision: Competitive Intelligence as a Judge Superpower

Today our judge agents are smart but blind. They evaluate proposals using only the text in front of them and whatever their LLM training absorbed. They don't know that 12 teams at the last Solana hackathon attempted the exact same idea, or that the problem the proposal claims to solve was already shipped by three funded startups.

[Colosseum Copilot](https://docs.colosseum.com/copilot/introduction) gives our judges **eyes on the market**. Backed by 5,400+ hackathon submissions, 84,000+ archive documents, and 6,300+ crypto products, it provides the competitive intelligence that transforms evaluation from opinion-based scoring to evidence-grounded judgment.

This isn't a 5th judge dimension — it's a **research superpower** that makes all 4 existing judges better. Like giving a panel of experts access to a research library before they deliberate.

### Integration with IPE Values

| IPE Value | How Colosseum Enhances It |
|---|---|
| **Pro-technology** | Identifies if proposed tech is truly novel (Full gap) or already built (False gap) |
| **Pro-freedom** | Surfaces whether proposal creates new access or just copies existing gatekeepers |
| **Pro-human-progress** | Validates that the problem is real and the solution addresses actual human needs |

---

## 2. Agent Team Architecture

The Superpowers framework emphasizes autonomous agent execution. This integration is designed as a **4-agent research team** that works alongside the existing 4 judge agents:

```
┌─────────────────────────────────────────────────────────────┐
│                    EVALUATION PIPELINE                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              RESEARCH TEAM (new)                      │  │
│  │                                                       │  │
│  │  ┌─────────────┐    ┌─────────────┐                  │  │
│  │  │   Market     │    │  Context    │                  │  │
│  │  │ Intelligence │───▶│   Weaver   │──┐               │  │
│  │  │   Agent      │    │   Agent    │  │               │  │
│  │  └─────────────┘    └─────────────┘  │               │  │
│  │        │                              │               │  │
│  │        │ Colosseum API               │ Enriched      │  │
│  │        │ research data               │ prompts       │  │
│  │        ▼                              ▼               │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              JUDGE TEAM (existing)                    │  │
│  │                                                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│  │
│  │  │Technical │ │ Impact   │ │   Cost   │ │   Team   ││  │
│  │  │Feasibil. │ │Potential │ │Efficiency│ │Capability││  │
│  │  │(enriched)│ │(enriched)│ │(enriched)│ │(enriched)││  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              VALIDATION (new)                         │  │
│  │                                                       │  │
│  │  ┌─────────────┐                                     │  │
│  │  │  Reality    │  Post-evaluation coherence check    │  │
│  │  │  Checker    │  Do scores match market data?       │  │
│  │  │  Agent      │                                     │  │
│  │  └─────────────┘                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│                    Aggregate + Publish                        │
└─────────────────────────────────────────────────────────────┘
```

### Agent Roles

#### 2.1 Market Intelligence Agent (`market-intelligence`)

**Role**: Calls Colosseum API and normalizes raw research data into structured output.

```typescript
// src/lib/judges/market-intelligence.ts
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { marketResearchSchema } from './schemas';
import { PromptInjectionDetector } from './injection-guard';

export const marketIntelligenceAgent = new Agent({
  id: 'market-intelligence',
  model: openai('gpt-4o'), // Cost-optimized — research synthesis, not creative scoring
  instructions: `You are a market intelligence analyst for IPE City grant evaluations.

You receive raw competitive intelligence data from the Colosseum Copilot API and 
synthesize it into a structured market context report.

Your output will be consumed by 4 independent judge agents to inform their scoring.

Rules:
- Be precise. Cite specific project names, hackathons, and data points.
- Never speculate beyond the evidence. If data is insufficient, say so.
- Classify gaps honestly: Full (nobody's built this), Partial (incomplete coverage), 
  False (already solved).
- Rate your own confidence: high (strong evidence), medium (some evidence), 
  low (sparse data).
- Never recommend funding decisions. You provide context, not verdicts.`,
  inputProcessors: [new PromptInjectionDetector()],
  outputSchema: marketResearchSchema,
});
```

#### 2.2 Context Weaver Agent (`context-weaver`)

**Role**: Takes raw research output and weaves dimension-specific context blocks for each judge.

```typescript
// src/lib/judges/context-weaver.ts
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { enrichedContextSchema } from './schemas';

export const contextWeaverAgent = new Agent({
  id: 'context-weaver',
  model: openai('gpt-4o'),
  instructions: `You transform market research into dimension-specific context 
for 4 judge agents. Each judge needs different information:

- Technical Feasibility: Similar builds, tech stacks, success/failure patterns
- Impact Potential: Gap classification, TAM, market maturity
- Cost Efficiency: Competitor pricing, revenue models, cost benchmarks
- Team Capability: Founder-market fit signals, successful team patterns

Format each context block as a structured markdown section that judges can 
parse and reference. Keep each block under 500 words — judges need signal, 
not noise.`,
  outputSchema: enrichedContextSchema,
});
```

#### 2.3 Reality Checker Agent (`reality-checker`)

**Role**: Post-evaluation validation. Compares judge scores against market data to detect coherence violations.

```typescript
// src/lib/judges/reality-checker.ts
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { coherenceReportSchema } from './schemas';

export const realityCheckerAgent = new Agent({
  id: 'reality-checker',
  model: openai('gpt-4o'),
  instructions: `You are a post-evaluation quality checker. You compare judge 
scores against market research data to identify coherence violations.

Flag when:
- Research shows "False gap" (already solved) but Impact Potential scored > 75%
- Research shows "Full gap" (novel) but Technical Feasibility scored < 30%
- Research found 10+ competitors but Cost Efficiency scored as if no competition
- Research shows "emerging" market but Team scored as if mature domain expertise needed

You produce a coherence score (0-10000 basis points) and list any flags.
A coherence score below 3000 suggests the evaluation may need human review.

You do NOT override judge scores. You flag potential issues for transparency.`,
  outputSchema: coherenceReportSchema,
});
```

---

## 3. Enhanced Evaluation Flow

### Current Flow (Phase 1)

```
Proposal → 4 Parallel Judges → Aggregate → Publish
            (10-20s each)        (instant)   (1-3s)
Total: ~20s
```

### Enhanced Flow

```
Proposal 
  │
  ▼
Market Intelligence Agent ──► Colosseum API (3-8s)
  │
  ▼
Context Weaver Agent (2-3s)
  │
  ▼ Dimension-specific context blocks
4 Parallel Judges (enriched) (10-20s each)
  │
  ▼
Reality Checker Agent (2-3s)
  │
  ▼
Aggregate + Publish (1-3s)
Total: ~30s (+10s for research phase)
```

### Timeline Impact

| Phase | Duration | Change |
|---|---|---|
| Research (sequential) | 5-11s | **NEW** |
| Judges (parallel) | 10-20s | Same |
| Validation (sequential) | 2-3s | **NEW** |
| Publish | 1-3s | Same |
| **Total** | **~30s** | **+50%** |

The 50% latency increase is justified by the qualitative improvement. Users see the research phase in the evaluation theater UI, providing transparency and building trust.

---

## 4. Integration with Existing Injection Defense

### Current 3-Layer Defense

1. **Layer 1**: Hardcoded anti-injection instructions in judge system prompts
2. **Layer 2**: `InputProcessor` detects injection patterns (SYSTEM:, INSTRUCTION:, IGNORE, OVERRIDE)
3. **Layer 3**: Score anomaly detection (divergence > 50 points between dimensions)

### Extended 4-Layer Defense

Colosseum data enters judge prompts as external content. This creates a new attack vector: a malicious project description in Colosseum's hackathon database could attempt injection through the research context.

**Layer 4: External Data Sanitization**

```typescript
// src/lib/judges/external-data-guard.ts

const INJECTION_PATTERNS = [
  /SYSTEM:/i,
  /INSTRUCTION:/i,
  /IGNORE\s+(ALL\s+)?PREVIOUS/i,
  /OVERRIDE/i,
  /YOU\s+ARE\s+NOW/i,
  /FORGET\s+(ALL\s+)?INSTRUCTIONS/i,
  /ACT\s+AS/i,
  /DISREGARD/i,
  /NEW\s+ROLE/i,
  /ADMIN\s+MODE/i,
];

export function sanitizeExternalData(text: string): string {
  let sanitized = text;
  
  // Strip control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Detect and neutralize injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      // Replace with harmless marker instead of silently removing
      sanitized = sanitized.replace(
        pattern, 
        '[FILTERED: injection pattern detected]'
      );
    }
  }
  
  // Truncate to prevent context overflow
  if (sanitized.length > 5000) {
    sanitized = sanitized.slice(0, 5000) + '\n[TRUNCATED]';
  }
  
  return sanitized;
}
```

### Defense-in-Depth Flow

```
Colosseum API Response
  │
  ▼
Zod Schema Validation (reject malformed responses)
  │
  ▼
External Data Sanitization (strip injection patterns)
  │
  ▼
Context Weaver (restructures data into judge-specific blocks)
  │
  ▼
Judge InputProcessor (existing Layer 2 — catches anything that slipped through)
  │
  ▼
Score Anomaly Detection (existing Layer 3 — catches manipulation effects)
```

---

## 5. IPE Alignment Enhancement

Colosseum's gap classification maps directly to IPE City's core values scoring:

### Pro-Technology Alignment

| Gap Type | Signal | Score Adjustment Logic |
|---|---|---|
| Full gap | Proposal advances genuinely novel technology | Supports higher pro-technology score |
| Partial gap | Proposal extends existing tech to new segment | Neutral — depends on technical differentiation |
| False gap | Technology already exists and works | Supports lower pro-technology score unless approach is fundamentally different |

### Pro-Freedom Alignment

| Market Signal | Freedom Implication |
|---|---|
| All competitors are centralized/permissioned | Proposal creating decentralized alternative → strong pro-freedom |
| Competitors are already decentralized | Less differentiation on freedom axis |
| Market dominated by regulated incumbents | Permissionless alternative has high freedom value |

### Pro-Human-Progress Alignment

| Validation Signal | Progress Implication |
|---|---|
| TAM exists and is large | Real human need validated by market |
| No TAM data available | Need is speculative — lower confidence |
| Market is "emerging" | Early-stage need, high potential impact |
| Market is "mature" | Incremental improvement, not breakthrough |

---

## 6. Real-Time UI Enhancement

### Evaluation Theater Update

The existing `evaluation-theater.tsx` shows judge progress in real-time. Extend it with a research phase:

```
┌─────────────────────────────────────────────────┐
│            EVALUATION IN PROGRESS                │
│                                                  │
│  ✅ Step 1: Market Research          [complete]  │
│     ├─ 3 similar projects found                  │
│     ├─ Gap type: PARTIAL                         │
│     └─ Market: emerging (12 competitors)         │
│                                                  │
│  🔄 Step 2: Judge Evaluation         [running]   │
│     ├─ 🔄 Technical Feasibility     scoring...   │
│     ├─ ✅ Impact Potential           82.5%       │
│     ├─ 🔄 Cost Efficiency           scoring...   │
│     └─ ⏳ Team Capability           waiting      │
│                                                  │
│  ⏳ Step 3: Reality Check            [pending]   │
│                                                  │
│  ⏳ Step 4: Publish On-Chain         [pending]   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Evaluation Results Enhancement

After evaluation completes, add a **Market Context Panel** to the results page:

```
┌─────────────────────────────────────────────────┐
│  MARKET INTELLIGENCE                             │
│                                                  │
│  Gap Classification: PARTIAL                     │
│  ┌─────────────────────────────────────────────┐ │
│  │ Existing solutions serve SME segment.       │ │
│  │ Enterprise treasury operations uncovered.   │ │
│  │ TAM for gap: $370-500M annually.           │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Similar Projects (3 found):                     │
│  ┌─────────────────────────────────────────────┐ │
│  │ 🟢 GrantDAO (Renaissance '23) — Active     │ │
│  │    On-chain voting for grants. 200 MAU.     │ │
│  │ 🔴 SolanaGrants (Radar '24) — Inactive     │ │
│  │    AI evaluation with GPT-4. Abandoned.     │ │
│  │ 🔴 FundingLens (Breakout '24) — Inactive   │ │
│  │    Hackathon scoring. Failed at >100 props. │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Market Coherence: 78.5% ✅                      │
│  Research Confidence: MEDIUM                     │
│  Source: Colosseum Copilot | View on IPFS ↗     │
└─────────────────────────────────────────────────┘
```

---

## 7. Technical Implementation Details

### 7.1 Colosseum API Client

```typescript
// src/lib/colosseum/client.ts
import { z } from 'zod';

const CONFIG = {
  baseUrl: process.env.COLOSSEUM_COPILOT_API_BASE,
  timeout: 30_000,
  maxRetries: 2,
} as const;

// In-memory cache: domain hash → research result
const researchCache = new Map<string, {
  data: ColosseumResponse;
  expiresAt: number;
}>();

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function queryColosseum(
  domain: string,
  description: string,
): Promise<ColosseumResponse | null> {
  const token = process.env.COLOSSEUM_COPILOT_PAT;
  if (!CONFIG.baseUrl || !token) {
    console.warn('[Colosseum] Missing config — research skipped');
    return null;
  }

  // Check cache
  const cacheKey = createDomainHash(domain, description);
  const cached = researchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const response = await fetchWithRetry(`${CONFIG.baseUrl}/research`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: description.slice(0, 2000),
        domain,
        mode: 'deep_dive',
      }),
      signal: AbortSignal.timeout(CONFIG.timeout),
    });

    if (!response.ok) {
      console.error(`[Colosseum] HTTP ${response.status}`);
      return null;
    }

    const raw: unknown = await response.json();
    const parsed = colosseumResponseSchema.safeParse(raw);
    
    if (!parsed.success) {
      console.error('[Colosseum] Validation failed:', parsed.error.message);
      return null;
    }

    // Cache successful response
    researchCache.set(cacheKey, {
      data: parsed.data,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return parsed.data;
  } catch (error) {
    console.error('[Colosseum] Request failed:', error);
    return null;
  }
}

function createDomainHash(domain: string, description: string): string {
  const input = `${domain}:${description.slice(0, 500)}`;
  // Simple hash for cache key — not cryptographic
  let hash = 0;
  for (const char of input) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return `colosseum:${hash.toString(36)}`;
}

async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = CONFIG.maxRetries,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 && attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}
```

### 7.2 Zod Schemas

```typescript
// src/lib/colosseum/schemas.ts
import { z } from 'zod';

export const similarProjectSchema = z.object({
  name: z.string().max(200),
  hackathon: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'unknown']),
  techStack: z.array(z.string().max(50)).max(10).optional(),
  description: z.string().max(1000),
  relevance: z.enum(['direct_competitor', 'adjacent', 'inspiration']),
});

export const gapClassificationSchema = z.object({
  type: z.enum(['full', 'partial', 'false']),
  rationale: z.string().max(2000),
  existingCoverage: z.string().max(1000).optional(),
  uncoveredSegment: z.string().max(1000).optional(),
});

export const colosseumResponseSchema = z.object({
  similarProjects: z.array(similarProjectSchema).max(20),
  gapClassification: gapClassificationSchema,
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(['emerging', 'growing', 'mature']),
  estimatedTAM: z.string().max(200).nullable(),
  keyInsights: z.array(z.string().max(500)).max(10),
  risks: z.array(z.string().max(500)).max(10).optional(),
});

export type ColosseumResponse = z.infer<typeof colosseumResponseSchema>;

// Market context output for judge consumption
export const marketContextSchema = z.object({
  technical: z.object({
    similarBuilds: z.array(z.object({
      name: z.string(),
      techStack: z.array(z.string()),
      outcome: z.string(),
    })),
    noveltyAssessment: z.string(),
  }),
  impact: z.object({
    gapType: z.enum(['full', 'partial', 'false']),
    gapRationale: z.string(),
    tam: z.string().nullable(),
    marketMaturity: z.string(),
  }),
  cost: z.object({
    competitorPricing: z.array(z.string()),
    benchmarks: z.string(),
  }),
  team: z.object({
    idealBackground: z.string(),
    successPatterns: z.array(z.string()),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
});

// Reality checker output
export const coherenceReportSchema = z.object({
  coherenceScore: z.number().int().min(0).max(10000),
  flags: z.array(z.object({
    dimension: z.string(),
    issue: z.string(),
    severity: z.enum(['critical', 'warning', 'info']),
    marketEvidence: z.string(),
    judgeScore: z.number(),
  })),
  overallAssessment: z.string().max(500),
  recommendsReview: z.boolean(),
});
```

### 7.3 Judge Prompt Enhancement

```typescript
// Addition to src/lib/judges/prompts.ts

export function buildMarketContextSection(
  dimension: DimensionType,
  context: MarketContext,
): string {
  switch (dimension) {
    case 'technical_feasibility':
      return `
## Market Context: Technical Landscape
${context.technical.similarBuilds.length > 0 
  ? context.technical.similarBuilds.map(b => 
      `- "${b.name}" — Tech: ${b.techStack.join(', ')}. Outcome: ${b.outcome}`
    ).join('\n')
  : 'No similar technical implementations found in the database.'}

Novelty assessment: ${context.technical.noveltyAssessment}
Research confidence: ${context.confidence}

Use this context to ground your technical feasibility assessment. 
Prior builds inform what's proven vs. what's uncharted territory.`;

    case 'impact_potential':
      return `
## Market Context: Impact Landscape
Gap Classification: ${context.impact.gapType.toUpperCase()}
${context.impact.gapRationale}
${context.impact.tam ? `Estimated TAM: ${context.impact.tam}` : ''}
Market maturity: ${context.impact.marketMaturity}
Research confidence: ${context.confidence}

A FULL gap means no existing solution — high novelty potential.
A PARTIAL gap means solutions exist but miss a segment — differentiation matters.
A FALSE gap means the problem is already solved — impact requires clear differentiation.`;

    case 'cost_efficiency':
      return `
## Market Context: Cost Benchmarks
${context.cost.benchmarks}
${context.cost.competitorPricing.length > 0
  ? 'Competitor pricing:\n' + context.cost.competitorPricing.map(p => `- ${p}`).join('\n')
  : 'No competitor pricing data available.'}
Research confidence: ${context.confidence}

Use these benchmarks to assess whether the proposal's budget is realistic 
relative to what others have spent building similar solutions.`;

    case 'team_capability':
      return `
## Market Context: Team Fit
Ideal background for this domain: ${context.team.idealBackground}
${context.team.successPatterns.length > 0
  ? 'Patterns from successful teams:\n' + context.team.successPatterns.map(p => `- ${p}`).join('\n')
  : ''}
Research confidence: ${context.confidence}

Use this context to assess founder-market fit. A strong team for a DeFi protocol 
looks different from a strong team for a consumer social app.`;
  }
}
```

### 7.4 Validation Layer

```typescript
// src/lib/judges/reality-check.ts
import { realityCheckerAgent } from './reality-checker';
import type { DimensionResult } from './schemas';
import type { MarketContext } from '../colosseum/schemas';

export async function performRealityCheck(
  judgeResults: DimensionResult[],
  marketContext: MarketContext | null,
): Promise<CoherenceReport | null> {
  if (!marketContext) return null;

  const prompt = `
Evaluate the coherence between these judge scores and market research data.

## Judge Scores
${judgeResults.map(r => 
  `- ${r.dimension}: ${(r.score / 100).toFixed(1)}% (confidence: ${r.confidence})`
).join('\n')}

## Market Research
- Gap type: ${marketContext.impact.gapType}
- Gap rationale: ${marketContext.impact.gapRationale}
- TAM: ${marketContext.impact.tam ?? 'unknown'}
- Market maturity: ${marketContext.impact.marketMaturity}
- Similar projects: ${marketContext.technical.similarBuilds.length} found
- Research confidence: ${marketContext.confidence}

Identify any coherence violations and compute an overall coherence score.
`;

  const result = await realityCheckerAgent.generate(prompt);
  return result.object;
}
```

---

## 8. Scoring Schema Extension

Extend the existing basis points scoring with market validation data:

```typescript
// Addition to src/lib/judges/schemas.ts

export const marketValidationSchema = z.object({
  // Gap classification from Colosseum
  gapType: z.enum(['full', 'partial', 'false']),
  
  // How many competitors/similar projects found
  competitorCount: z.number().int().nonnegative(),
  similarProjectsFound: z.number().int().nonnegative(),
  
  // Coherence: how well judge scores align with market data
  // 0 = complete contradiction, 10000 = perfect alignment
  marketCoherenceScore: z.number().int().min(0).max(10000),
  
  // Confidence in the research data
  researchConfidence: z.enum(['high', 'medium', 'low']),
  
  // Any flags from the reality checker
  coherenceFlags: z.array(z.object({
    dimension: z.string(),
    issue: z.string(),
    severity: z.enum(['critical', 'warning', 'info']),
  })),
  
  // Whether human review is recommended
  recommendsReview: z.boolean(),
});

// Extended evaluation result
export const enrichedEvaluationResultSchema = evaluationResultSchema.extend({
  marketValidation: marketValidationSchema.nullable(),
  
  // IPFS CID for the research data
  researchIpfsCid: z.string().nullable(),
});
```

---

## 9. Autonomous Execution Plan (Superpowers Waves)

### Wave 1: Foundation (Independent — all parallel)

| Task | Description | Files | Estimate |
|---|---|---|---|
| 1.1 | Colosseum API client with auth, retry, caching | `src/lib/colosseum/client.ts` | 2h |
| 1.2 | Zod schemas for API requests/responses | `src/lib/colosseum/schemas.ts` | 1h |
| 1.3 | External data sanitization guard | `src/lib/judges/external-data-guard.ts` | 1h |
| 1.4 | Environment variables + health check | `.env.example`, `src/app/api/colosseum/health/route.ts` | 30m |

### Wave 2: Agent Team (Depends on Wave 1)

| Task | Description | Files | Estimate |
|---|---|---|---|
| 2.1 | Market Intelligence Agent (Mastra) | `src/lib/judges/market-intelligence.ts` | 2h |
| 2.2 | Context Weaver Agent (Mastra) | `src/lib/judges/context-weaver.ts` | 2h |
| 2.3 | Reality Checker Agent (Mastra) | `src/lib/judges/reality-checker.ts` | 2h |
| 2.4 | Judge prompt enrichment (all 4 dimensions) | `src/lib/judges/prompts.ts` | 1.5h |

### Wave 3: Integration (Depends on Wave 2)

| Task | Description | Files | Estimate |
|---|---|---|---|
| 3.1 | Evaluation pipeline integration | `src/app/api/evaluate/[id]/route.ts` | 2h |
| 3.2 | Research API routes | `src/app/api/research/[proposalId]/route.ts` | 1h |
| 3.3 | Scoring schema extensions | `src/lib/judges/schemas.ts` | 1h |
| 3.4 | Anomaly detection extension | Score coherence violation detection | 1.5h |

### Wave 4: UI + Testing (Depends on Wave 3)

| Task | Description | Files | Estimate |
|---|---|---|---|
| 4.1 | Research phase in evaluation theater | `src/components/evaluation-theater.tsx` | 2h |
| 4.2 | Market context panel on results page | `src/components/market-context-panel.tsx` | 2h |
| 4.3 | E2E tests: full research → evaluation flow | `e2e/colosseum-integration.spec.ts` | 3h |
| 4.4 | Unit tests: API client, sanitization, agents | `src/lib/colosseum/__tests__/` | 2h |

### Execution Summary

| Wave | Tasks | Duration (parallel) | Dependencies |
|---|---|---|---|
| Wave 1 | 4 tasks | ~2h (all parallel) | None |
| Wave 2 | 4 tasks | ~2h (all parallel) | Wave 1 |
| Wave 3 | 4 tasks | ~2h (all parallel) | Wave 2 |
| Wave 4 | 4 tasks | ~3h (all parallel) | Wave 3 |
| **Total** | **16 tasks** | **~9h** | Sequential waves |

### Superpowers Agent Dispatch

```bash
# Wave 1 — dispatch 4 parallel agents
/superpowers:dispatching-parallel-agents
  Agent 1: "Build Colosseum API client at src/lib/colosseum/client.ts"
  Agent 2: "Create Zod schemas at src/lib/colosseum/schemas.ts"
  Agent 3: "Build external data sanitization guard at src/lib/judges/external-data-guard.ts"
  Agent 4: "Add env vars to .env.example + health check endpoint"

# Wave 2 — dispatch 4 parallel agents after Wave 1 passes
/superpowers:dispatching-parallel-agents
  Agent 1: "Build Market Intelligence Mastra agent"
  Agent 2: "Build Context Weaver Mastra agent"  
  Agent 3: "Build Reality Checker Mastra agent"
  Agent 4: "Enrich judge prompts with market context"

# Wave 3-4: similar pattern
```

---

## 10. Risks and Superpowers Mitigations

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| **External API dependency** | Medium | High | Graceful degradation — evaluation works without research. Reality Checker skipped, judges run un-enriched. | Pipeline |
| **Prompt injection via research** | Low | Critical | 4-layer defense: Zod validation → External Data Guard → Context Weaver (restructures) → InputProcessor → Anomaly Detection | Security |
| **Solana vs Base focus** | High | Medium | Treat as general crypto intelligence. Query by domain ("DEX", "identity"), not chain. Add cross-chain disclaimer. | Market Intelligence Agent |
| **Token expiry (90 days)** | Certain | Low | Health check endpoint, monitoring alert, documented rotation in deployment runbook | Ops |
| **Rate limits during batch** | Medium | Medium | Cache per domain hash (24h), batch proposals by vertical, exponential backoff | API Client |
| **Research quality variance** | Medium | Medium | Market Intelligence Agent rates its own confidence. Low-confidence research is labeled in UI. | Market Intelligence Agent |
| **Latency increase (+50%)** | Certain | Low | Research phase visible in evaluation theater — users see value, not just delay. Cache hits eliminate research latency. | UX |

### Graceful Degradation Matrix

| Component Failed | Behavior | User Impact |
|---|---|---|
| Colosseum API down | Research skipped, judges run un-enriched | No market context shown; evaluation quality matches current baseline |
| Token expired | Research skipped, health check shows warning | Admin notified; evaluations continue normally |
| Rate limited | Single retry after 2s, then skip | Possible delay; worst case: no market context |
| Research returns empty | Empty market context used | UI shows "No competitive data found for this domain" |
| Market Intelligence Agent fails | No context for judges | Judges run with standard prompts |
| Context Weaver Agent fails | Raw research shown, no judge enrichment | Judges un-enriched; research still visible in UI |
| Reality Checker Agent fails | No coherence check | Scores published without coherence validation |

---

## 11. Setup Guide

### Prerequisites

1. Colosseum Arena account with API access
2. Personal Access Token (PAT) from Arena dashboard

### Installation

```bash
# Install the Colosseum Copilot skill (for development AI assistant)
npx skills add ColosseumOrg/colosseum-copilot

# No npm package needed — we call the REST API directly
```

### Configuration

Add to `.env.local`:

```bash
# Colosseum Copilot API
COLOSSEUM_COPILOT_API_BASE="https://copilot.colosseum.com/api/v1"
COLOSSEUM_COPILOT_PAT="your-personal-access-token"
```

### Verification

```bash
# Check API connectivity
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT" \
  "$COLOSSEUM_COPILOT_API_BASE/status"
# Expected: 200

# Or via the app's health endpoint (after deployment)
curl http://localhost:3000/api/colosseum/health
```

### Token Rotation (Every 90 Days)

1. Go to [Colosseum Arena Dashboard](https://arena.colosseum.com)
2. Generate new PAT
3. Update `COLOSSEUM_COPILOT_PAT` in:
   - `.env.local` (local development)
   - Vercel/Cloud Run deployment secrets (production)
4. Verify via health check endpoint
5. Old token auto-expires — no manual revocation needed
