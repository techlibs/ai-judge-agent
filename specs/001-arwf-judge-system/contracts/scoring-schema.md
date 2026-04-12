# Contract: Scoring Schema

**Feature**: 001-arwf-judge-system
**Type**: LLM Structured Output (Vercel AI SDK `generateObject`)
**Validation**: Zod at output boundary

## Judge Agent Output Schema

Each Judge Agent produces this schema per evaluation dimension via `generateObject`.

```typescript
import { z } from 'zod';

const DimensionScoreSchema = z.object({
  dimension: z.enum([
    'technical_feasibility',
    'impact_potential',
    'cost_efficiency',
    'team_capability',
  ]),
  score: z.number().min(0).max(10).describe('Dimension score from 0 to 10'),
  inputDataConsidered: z
    .array(z.string())
    .min(1)
    .describe('Which proposal fields were examined'),
  rubricApplied: z.object({
    criteria: z
      .array(z.string())
      .min(1)
      .describe('Evaluation criteria used for scoring'),
  }),
  reasoningChain: z
    .string()
    .min(50)
    .describe('Full reasoning chain explaining the score, referencing specific proposal data'),
});
```

## Sanitized Proposal Input Schema

Proposal data is sanitized before being sent to any LLM. This schema represents the sanitized form.

```typescript
const SanitizedProposalSchema = z.object({
  title: z.string(),
  description: z.string(),
  budgetAmount: z.number(),
  budgetCurrency: z.string(),
  budgetBreakdown: z.array(
    z.object({
      category: z.string(),
      amount: z.number(),
      description: z.string(),
    })
  ),
  technicalDescription: z.string(),
  teamSize: z.number(),
  teamProfileHash: z.string().describe('Hashed team identifier, no PII'),
  category: z.string(),
});
```

**PII removed before LLM input** (per FR-006):
- Team member names -> hashed identifiers
- Email addresses -> obfuscated (`h***@domain.com` -> removed entirely)
- Sensitive URLs -> `[URL_REDACTED]`
- Physical addresses -> removed entirely

## Weighted Score Calculation

```typescript
const DIMENSION_WEIGHTS = {
  technical_feasibility: 0.25,
  impact_potential: 0.30,
  cost_efficiency: 0.20,
  team_capability: 0.25,
} as const;

// S = 0.25 * Technical + 0.30 * Impact + 0.20 * Cost + 0.25 * Team
// Reputation multiplier: min(1 + reputationIndex / 10000, 1.05)
// Fund release: adjustedScore / 1000
```

## Monitor Agent Output Schema

```typescript
const MonitoringScoreSchema = z.object({
  score: z.number().min(0).max(10),
  justification: z.string().min(50),
  githubMetrics: z.object({
    commitFrequency: z.number().describe('Commits per week'),
    issueVelocity: z.number().describe('Issues closed per week'),
    releases: z.number().describe('Releases in monitoring period'),
  }),
  onChainMetrics: z.object({
    transactionCount: z.number(),
    fundUtilization: z.number().min(0).max(1).describe('Percentage of funds used'),
  }),
  socialMetrics: z.object({
    announcements: z.number(),
    communityEngagement: z.number().describe('Engagement score 0-10'),
  }),
  riskFlags: z.array(
    z.object({
      type: z.enum(['inactivity', 'fund_misuse', 'scope_drift', 'team_change']),
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
    })
  ),
});
```
