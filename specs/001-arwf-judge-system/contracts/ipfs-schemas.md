# Contract: IPFS Content Schemas

**Feature**: 001-arwf-judge-system
**Type**: Content-addressed documents pinned to IPFS (Pinata)
**Verification**: Fetch content from IPFS, hash it, compare to on-chain CID

## Pinning Flow

```
1. Validate content against Zod schema
2. Serialize to canonical JSON (sorted keys, no whitespace)
3. Pin to Pinata → receive CID
4. Submit CID to on-chain contract
5. Anyone can verify: fetch CID from IPFS, re-hash, compare
```

## Agent Registration Document (ERC-8004)

Each Judge Agent and Monitor Agent has a registration JSON pinned to IPFS. The CID is set as the `agentURI` in the IdentityRegistry. Follows the ERC-8004 registration-v1 schema.

```typescript
const AgentRegistrationSchema = z.object({
  type: z.literal('https://eips.ethereum.org/EIPS/eip-8004#registration-v1'),
  name: z.string(),
  description: z.string(),
  image: z.string().url(),
  services: z.array(
    z.object({
      name: z.string(),
      endpoint: z.string(),
      version: z.string().optional(),
    })
  ),
  x402Support: z.boolean(),
  active: z.boolean(),
  registrations: z.array(
    z.object({
      agentId: z.number(),
      agentRegistry: z.string(), // format: "eip155:{chainId}:{identityRegistryAddress}"
    })
  ),
  supportedTrust: z.array(z.string()).optional(),
});
```

**Example** (Technical Feasibility Judge Agent):

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "ARWF Technical Feasibility Judge",
  "description": "AI agent that evaluates grant proposals on technical feasibility: architecture quality, scalability approach, security considerations, and implementation complexity. Scores 0-10 with structured justification.",
  "image": "ipfs://bafybeig.../technical-judge-avatar.png",
  "services": [
    {
      "name": "web",
      "endpoint": "https://ipe.city/grants/agents/technical-feasibility"
    },
    {
      "name": "A2A",
      "endpoint": "https://ipe.city/.well-known/agent-card.json",
      "version": "0.3.0"
    }
  ],
  "x402Support": false,
  "active": true,
  "registrations": [
    {
      "agentId": 1,
      "agentRegistry": "eip155:8453:0x..."
    }
  ],
  "supportedTrust": ["reputation"]
}
```

**Agents registered**:
| agentId | Name | Scoring Dimension | Metadata Keys |
|---------|------|-------------------|---------------|
| 1 | Technical Feasibility Judge | `technical_feasibility` | `scoringDimension`, `promptVersion`, `modelId` |
| 2 | Impact Potential Judge | `impact_potential` | `scoringDimension`, `promptVersion`, `modelId` |
| 3 | Cost Efficiency Judge | `cost_efficiency` | `scoringDimension`, `promptVersion`, `modelId` |
| 4 | Team Capability Judge | `team_capability` | `scoringDimension`, `promptVersion`, `modelId` |
| 5 | Monitor Agent | `monitoring` | `monitoringSchedule`, `promptVersion`, `modelId` |

## Agent Feedback Document (ERC-8004)

Off-chain feedback details referenced by `feedbackURI` in `giveFeedback()`. Pinned to IPFS, hash verified via `feedbackHash` (KECCAK-256). Not required for IPFS URIs since they're content-addressed.

```typescript
const AgentFeedbackSchema = z.object({
  agentRegistry: z.string(),    // "eip155:8453:{identityRegistryAddress}"
  agentId: z.number(),
  clientAddress: z.string(),    // "eip155:8453:{clientAddress}"
  createdAt: z.string(),        // ISO 8601
  value: z.number(),            // feedback value
  valueDecimals: z.number().min(0).max(18),
  tag1: z.string().optional(),  // scoring dimension
  tag2: z.string().optional(),  // funding round
  endpoint: z.string().optional(),
  // ARWF-specific context
  proposalId: z.string().optional(),
  evaluationContentCid: z.string().optional(),
  feedbackReason: z.string().optional(),
});
```

---

## Proposal Content Document

Pinned when a proposal is ingested. CID stored in `EvaluationRegistry.proposalContentCid`.

```typescript
import { z } from 'zod';

const ProposalContentSchema = z.object({
  version: z.literal(1),
  externalId: z.string(),
  platformSource: z.string(),
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
  teamProfileHash: z.string(),
  teamSize: z.number(),
  category: z.string(),
  submittedAt: z.string(),
});
```

**PII rules** (applied before pinning):
- Team member names: hashed into `teamProfileHash`
- Emails: removed entirely
- Sensitive URLs: replaced with `[URL_REDACTED]`
- Physical addresses: removed entirely

## Evaluation Justification Document

Pinned after all 4 Judge Agents complete. CID stored in `EvaluationRegistry.evaluationContentCid`.

```typescript
const EvaluationContentSchema = z.object({
  version: z.literal(1),
  proposalId: z.string(),
  dimensions: z.array(
    z.object({
      dimension: z.enum([
        'technical_feasibility',
        'impact_potential',
        'cost_efficiency',
        'team_capability',
      ]),
      weight: z.number(),
      score: z.number().min(0).max(10),
      inputDataConsidered: z.array(z.string()).min(1),
      rubricApplied: z.object({
        criteria: z.array(z.string()).min(1),
      }),
      reasoningChain: z.string().min(50),
      modelId: z.string(),
      promptVersion: z.string(),
    })
  ).length(4),
  finalScore: z.number().min(0).max(10),
  reputationMultiplier: z.number().min(1).max(1.05),
  adjustedScore: z.number().min(0).max(10.5),
  evaluatedAt: z.string(),
});
```

## Monitoring Report Document

Pinned after each Monitor Agent cycle.

```typescript
const MonitoringReportSchema = z.object({
  version: z.literal(1),
  projectId: z.string(),
  score: z.number().min(0).max(10),
  justification: z.string().min(50),
  githubMetrics: z.object({
    commitFrequency: z.number(),
    issueVelocity: z.number(),
    releases: z.number(),
  }),
  onChainMetrics: z.object({
    transactionCount: z.number(),
    fundUtilization: z.number().min(0).max(1),
  }),
  socialMetrics: z.object({
    announcements: z.number(),
    communityEngagement: z.number(),
  }),
  riskFlags: z.array(
    z.object({
      type: z.enum(['inactivity', 'fund_misuse', 'scope_drift', 'team_change']),
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
    })
  ),
  monitoredAt: z.string(),
});
```

## Dispute Evidence Document

Uploaded by dispute initiator. CID stored in `DisputeRegistry.evidenceCid`.

```typescript
const DisputeEvidenceSchema = z.object({
  version: z.literal(1),
  proposalId: z.string(),
  disputeReason: z.string().min(100),
  evidence: z.array(
    z.object({
      type: z.enum(['text', 'link', 'document']),
      content: z.string(),
      description: z.string(),
    })
  ).min(1),
  submittedAt: z.string(),
});
```
