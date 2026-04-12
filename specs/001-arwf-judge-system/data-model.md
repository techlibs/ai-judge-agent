# Data Model: ARWF Judge System

**Feature**: 001-arwf-judge-system
**Date**: 2026-04-12
**Architecture**: Web3-native three-layer storage

## Storage Layers

All evaluation data follows a unidirectional write path:

```
Webhook → Next.js → IPFS (pin content) → Chain (scores + hashes) → The Graph (index) → SQLite cache (materialize)
```

Each piece of data has a **canonical home** and may appear in downstream layers as a cache. The labels below clarify provenance:

- **SOURCED**: This is the original, authoritative data. If you delete it, it's gone.
- **DERIVED**: Computed from sourced data. Can be recomputed at any time.
- **MIRRORED**: Exact copy of sourced data from another layer, for read performance.

---

## Layer 1: On-Chain (Base L2) — Source of Truth for Scores and State

Smart contract state. Permanent, verifiable, public. Cannot be rebuilt — it IS the truth.

### EvaluationRegistry Contract

Stores final scores and IPFS content hashes for each proposal evaluation.

| Field | Solidity Type | Provenance | Description |
|-------|--------------|------------|-------------|
| proposalId | bytes32 | SOURCED | Unique proposal identifier (hash of platform + externalId) |
| fundingRoundId | bytes32 | SOURCED | Parent funding round |
| finalScore | uint16 | SOURCED | Weighted score (0-1000, divide by 100 for 0-10.00) |
| reputationMultiplier | uint16 | SOURCED | Multiplier (10000 = 1.0, max 10500 = 1.05) |
| adjustedScore | uint16 | DERIVED | finalScore * reputationMultiplier / 10000 |
| proposalContentCid | string | SOURCED | IPFS CID of full proposal content |
| evaluationContentCid | string | SOURCED | IPFS CID of evaluation justifications (all 4 dimensions) |
| timestamp | uint256 | SOURCED | Block timestamp of score submission |

**Events emitted**: `EvaluationSubmitted(proposalId, finalScore, adjustedScore, proposalContentCid, evaluationContentCid)`

### MilestoneManager Contract

Manages fund releases based on scores.

| Field | Solidity Type | Provenance | Description |
|-------|--------------|------------|-------------|
| projectId | bytes32 | SOURCED | Project identifier |
| milestoneIndex | uint8 | SOURCED | Milestone sequence number |
| score | uint16 | MIRRORED | Score from EvaluationRegistry |
| releasePercentage | uint16 | DERIVED | score / 10 (e.g., score 785 → 78.5%) |
| released | bool | SOURCED | Whether funds have been released |
| amount | uint256 | SOURCED | Amount released in wei |

**Events emitted**: `FundReleased(projectId, milestoneIndex, amount, releasePercentage)`

### IdentityRegistry Contract (ERC-8004 compliant)

Registers AI Judge Agents and Monitor Agents as ERC-8004 identities. Extends ERC-721 with URIStorage. Each agent is an NFT with an `agentURI` pointing to a registration JSON on IPFS.

**Registered agents**: 4 Judge Agents (one per dimension) + 1 Monitor Agent = 5 agent identities.

| Field | Solidity Type | Provenance | Description |
|-------|--------------|------------|-------------|
| agentId | uint256 | SOURCED | ERC-721 tokenId, auto-incrementing |
| owner | address | SOURCED | Address that owns/operates this agent |
| agentURI | string | SOURCED | IPFS CID of agent registration JSON (name, description, services, trust) |
| agentWallet | address | SOURCED | Payment address, set via EIP-712 signed message. Cleared on transfer. |
| metadata | mapping(string => bytes) | SOURCED | Key-value on-chain metadata (e.g., `scoringDimension`, `promptVersion`) |

**ERC-8004 interface** (all required):
- `register(string agentURI, MetadataEntry[] metadata) → uint256 agentId`
- `register(string agentURI) → uint256 agentId`
- `register() → uint256 agentId`
- `setAgentURI(uint256 agentId, string newURI)`
- `getMetadata(uint256 agentId, string metadataKey) → bytes`
- `setMetadata(uint256 agentId, string metadataKey, bytes metadataValue)`
- `setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)` — EIP-712/ERC-1271 verified
- `getAgentWallet(uint256 agentId) → address`
- `unsetAgentWallet(uint256 agentId)`

**Events emitted** (ERC-8004 required):
- `Registered(uint256 indexed agentId, string agentURI, address indexed owner)`
- `URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)`
- `MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)`

**Constraints**:
- `agentWallet` is a reserved key — cannot be set via `setMetadata()` or `register()` metadata array
- On ERC-721 transfer, `agentWallet` is automatically cleared (reset to zero address)

### ReputationRegistry Contract (ERC-8004 compliant)

Structured agent-to-agent and community-to-agent feedback. Replaces the previous simple `reputationIndex` with the full ERC-8004 feedback system. Linked to IdentityRegistry.

**Usage**: After each evaluation, community members and platform operators rate judge quality. Tags identify the scoring dimension and funding round.

| Field | Solidity Type | Provenance | Description |
|-------|--------------|------------|-------------|
| agentId | uint256 | MIRRORED | From IdentityRegistry |
| clientAddress | address | SOURCED | Who gave the feedback (MUST NOT be agent owner) |
| feedbackIndex | uint64 | SOURCED | 1-indexed counter per (agentId, clientAddress) pair |
| value | int128 | SOURCED | Feedback value (positive = good, negative = bad) |
| valueDecimals | uint8 | SOURCED | Decimal places for value (0-18) |
| tag1 | string | SOURCED | Scoring dimension (e.g., "technical_feasibility") |
| tag2 | string | SOURCED | Funding round identifier |
| isRevoked | bool | SOURCED | Whether this feedback was revoked |

**On-chain stored**: `value`, `valueDecimals`, `tag1`, `tag2`, `isRevoked`
**Event-only** (not stored): `endpoint`, `feedbackURI`, `feedbackHash`

**ERC-8004 interface** (all required):
- `initialize(address identityRegistry_)`
- `getIdentityRegistry() → address`
- `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)`
- `revokeFeedback(uint256 agentId, uint64 feedbackIndex)`
- `appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash)`
- `getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) → (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)`
- `readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) → (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)`
- `readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) → (...)`
- `getClients(uint256 agentId) → address[]`
- `getLastIndex(uint256 agentId, address clientAddress) → uint64`

**Events emitted** (ERC-8004 required):
- `NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)`
- `FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)`
- `ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)`

**Constraints**:
- Feedback submitter MUST NOT be the agent owner or an approved operator for agentId
- `clientAddresses` MUST be non-empty in `getSummary()` (anti-Sybil)
- `valueDecimals` MUST be 0-18

### ValidationRegistry Contract (ERC-8004 compliant)

Capability validation for Judge Agents. Verifies agent qualifications (e.g., "is this judge qualified to score technical feasibility?"). Validators are trusted third parties or other agents.

| Field | Solidity Type | Provenance | Description |
|-------|--------------|------------|-------------|
| requestHash | bytes32 | SOURCED | KECCAK-256 of request content |
| validatorAddress | address | SOURCED | Who was asked to validate |
| agentId | uint256 | MIRRORED | Agent being validated |
| response | uint8 | SOURCED | 0-100 score (0=failed, 100=passed) |
| responseHash | bytes32 | SOURCED | KECCAK-256 of response content |
| tag | string | SOURCED | Capability being validated (e.g., "technical_feasibility_scoring") |
| lastUpdate | uint256 | SOURCED | Block timestamp of last response |

**ERC-8004 interface** (all required):
- `initialize(address identityRegistry_)`
- `getIdentityRegistry() → address`
- `validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash)` — MUST be called by agent owner/operator
- `validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)` — MUST be called by validatorAddress
- `getValidationStatus(bytes32 requestHash) → (address, uint256, uint8, bytes32, string, uint256)`
- `getSummary(uint256 agentId, address[] validatorAddresses, string tag) → (uint64 count, uint8 averageResponse)`
- `getAgentValidations(uint256 agentId) → bytes32[]`
- `getValidatorRequests(address validatorAddress) → bytes32[]`

**Events emitted** (ERC-8004 required):
- `ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)`
- `ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)`

**Note**: `validationResponse()` can be called multiple times for the same `requestHash` (progressive validation states).

### DisputeRegistry Contract

On-chain dispute resolution. Separate from ERC-8004 — this is ARWF-specific logic for challenging evaluation scores.

| Field | Solidity Type | Provenance | Description |
|-------|--------------|------------|-------------|
| disputeId | uint256 | SOURCED | Auto-incrementing dispute ID |
| proposalId | bytes32 | MIRRORED | From EvaluationRegistry |
| initiator | address | SOURCED | Dispute initiator address |
| stakeAmount | uint256 | SOURCED | Collateral staked |
| evidenceCid | string | SOURCED | IPFS CID of dispute evidence |
| status | uint8 | SOURCED | 0=open, 1=voting, 2=upheld, 3=overturned, 4=expired |
| newScore | uint16 | SOURCED | Replacement score (only if overturned) |
| deadline | uint256 | SOURCED | Voting deadline timestamp |

**Events emitted**: `DisputeOpened(disputeId, proposalId, initiator)`, `DisputeResolved(disputeId, status, newScore)`

### ProjectWallet (ERC-4337)

Account abstraction wallets deployed per project via factory. Not ERC-8004 — project teams are not AI agents. Simple wallet with on-chain activity tracking.

---

## Layer 2: IPFS (Pinata) — Source of Truth for Content

Content-addressed, immutable, public. Each document is pinned to Pinata and its CID is recorded on-chain. Anyone can verify: fetch from IPFS, hash it, compare to on-chain CID.

### Proposal Content Document

Pinned when a proposal is ingested via webhook.

```typescript
// IPFS document schema — all fields SOURCED from webhook input
const ProposalContentSchema = z.object({
  version: z.literal(1),
  externalId: z.string(),
  platformSource: z.string(),
  title: z.string(),
  description: z.string(),
  budgetAmount: z.number(),
  budgetCurrency: z.string(),
  budgetBreakdown: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    description: z.string(),
  })),
  technicalDescription: z.string(),
  teamProfileHash: z.string(),  // PII already removed
  teamSize: z.number(),
  category: z.string(),
  submittedAt: z.string(),      // ISO 8601
});
```

**CID stored on-chain as**: `EvaluationRegistry.proposalContentCid`

### Evaluation Justification Document

Pinned after all 4 Judge Agents complete scoring.

```typescript
// IPFS document schema
const EvaluationContentSchema = z.object({
  version: z.literal(1),
  proposalId: z.string(),       // MIRRORED — matches on-chain proposalId
  dimensions: z.array(z.object({
    dimension: z.enum([
      'technical_feasibility',
      'impact_potential',
      'cost_efficiency',
      'team_capability',
    ]),
    weight: z.number(),         // SOURCED — dimension weight
    score: z.number(),          // SOURCED — dimension score (0-10)
    inputDataConsidered: z.array(z.string()),  // SOURCED
    rubricApplied: z.object({
      criteria: z.array(z.string()),           // SOURCED
    }),
    reasoningChain: z.string(), // SOURCED — full LLM reasoning
    modelId: z.string(),        // SOURCED — which LLM model
    promptVersion: z.string(),  // SOURCED — prompt template version
  })),
  finalScore: z.number(),       // DERIVED — weighted sum of dimension scores
  reputationMultiplier: z.number(), // SOURCED — from ReputationRegistry
  adjustedScore: z.number(),    // DERIVED — finalScore * reputationMultiplier
  evaluatedAt: z.string(),      // SOURCED — ISO 8601
});
```

**CID stored on-chain as**: `EvaluationRegistry.evaluationContentCid`

### Monitoring Report Document

Pinned after each Monitor Agent cycle.

```typescript
const MonitoringReportSchema = z.object({
  version: z.literal(1),
  projectId: z.string(),        // MIRRORED — matches on-chain projectId
  score: z.number(),            // SOURCED
  justification: z.string(),    // SOURCED
  githubMetrics: z.object({     // SOURCED — collected from GitHub API
    commitFrequency: z.number(),
    issueVelocity: z.number(),
    releases: z.number(),
  }),
  onChainMetrics: z.object({    // SOURCED — read from chain
    transactionCount: z.number(),
    fundUtilization: z.number(),
  }),
  socialMetrics: z.object({     // SOURCED — collected from social APIs
    announcements: z.number(),
    communityEngagement: z.number(),
  }),
  riskFlags: z.array(z.object({
    type: z.enum(['inactivity', 'fund_misuse', 'scope_drift', 'team_change']),
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string(),
  })),
  monitoredAt: z.string(),      // SOURCED — ISO 8601
});
```

### Dispute Evidence Document

Submitted by dispute initiator, pinned to IPFS.

**CID stored on-chain as**: `DisputeRegistry.evidenceCid`

---

## Layer 3: SQLite (Turso) — Disposable Read Cache

Denormalized views materialized from The Graph + IPFS for fast dashboard queries. Every field here is either MIRRORED from chain/IPFS or DERIVED by computation. **This entire database can be dropped and rebuilt.**

### Cache Rebuild Process

```
1. Query The Graph subgraph for all events (EvaluationSubmitted, FundReleased, etc.)
2. For each event, fetch the referenced IPFS CIDs from Pinata gateway
3. Denormalize into SQLite tables below
4. Recompute all DERIVED fields (aggregates, search indexes, badges)
```

### proposals (cache table)

| Field | Type | Provenance | Source |
|-------|------|------------|--------|
| id | text PK | MIRRORED | on-chain `proposalId` (hex) |
| fundingRoundId | text | MIRRORED | on-chain `fundingRoundId` |
| externalId | text | MIRRORED | IPFS `ProposalContent.externalId` |
| platformSource | text | MIRRORED | IPFS `ProposalContent.platformSource` |
| title | text | MIRRORED | IPFS `ProposalContent.title` |
| description | text | MIRRORED | IPFS `ProposalContent.description` |
| budgetAmount | real | MIRRORED | IPFS `ProposalContent.budgetAmount` |
| budgetCurrency | text | MIRRORED | IPFS `ProposalContent.budgetCurrency` |
| technicalDescription | text | MIRRORED | IPFS `ProposalContent.technicalDescription` |
| teamProfileHash | text | MIRRORED | IPFS `ProposalContent.teamProfileHash` |
| teamSize | integer | MIRRORED | IPFS `ProposalContent.teamSize` |
| category | text | MIRRORED | IPFS `ProposalContent.category` |
| proposalContentCid | text | MIRRORED | on-chain `proposalContentCid` |
| evaluationContentCid | text | MIRRORED | on-chain `evaluationContentCid` |
| finalScore | real | MIRRORED | on-chain `finalScore` / 100 |
| adjustedScore | real | MIRRORED | on-chain `adjustedScore` / 100 |
| reputationMultiplier | real | MIRRORED | on-chain `reputationMultiplier` / 10000 |
| status | text | DERIVED | Inferred from chain events (has evaluation? has dispute? has fund release?) |
| submittedAt | text | MIRRORED | IPFS `ProposalContent.submittedAt` |
| evaluatedAt | text | MIRRORED | IPFS `EvaluationContent.evaluatedAt` |
| chainTimestamp | integer | MIRRORED | on-chain block timestamp |

**Indexes**: `(fundingRoundId)`, `(platformSource, externalId) UNIQUE`, `(status)`, `(category)`
**FTS**: Full-text search on `title`, `description`, `technicalDescription`

### dimension_scores (cache table)

| Field | Type | Provenance | Source |
|-------|------|------------|--------|
| id | text PK | DERIVED | `{proposalId}_{dimension}` |
| proposalId | text FK | MIRRORED | on-chain `proposalId` |
| dimension | text | MIRRORED | IPFS `EvaluationContent.dimensions[].dimension` |
| weight | real | MIRRORED | IPFS `EvaluationContent.dimensions[].weight` |
| score | real | MIRRORED | IPFS `EvaluationContent.dimensions[].score` |
| reasoningChain | text | MIRRORED | IPFS `EvaluationContent.dimensions[].reasoningChain` |
| inputDataConsidered | text (JSON) | MIRRORED | IPFS — serialized array |
| rubricApplied | text (JSON) | MIRRORED | IPFS — serialized object |
| modelId | text | MIRRORED | IPFS `EvaluationContent.dimensions[].modelId` |
| promptVersion | text | MIRRORED | IPFS `EvaluationContent.dimensions[].promptVersion` |

### fund_releases (cache table)

| Field | Type | Provenance | Source |
|-------|------|------------|--------|
| id | text PK | DERIVED | `{projectId}_{milestoneIndex}` |
| projectId | text | MIRRORED | on-chain `projectId` |
| milestoneIndex | integer | MIRRORED | on-chain `milestoneIndex` |
| score | real | MIRRORED | on-chain `score` / 100 |
| releasePercentage | real | MIRRORED | on-chain `releasePercentage` / 10 |
| amount | text | MIRRORED | on-chain `amount` (wei as string) |
| txHash | text | MIRRORED | transaction hash from event |
| releasedAt | integer | MIRRORED | block timestamp |

### agents (cache table)

| Field | Type | Provenance | Source |
|-------|------|------------|--------|
| agentId | integer PK | MIRRORED | on-chain `agentId` from IdentityRegistry |
| owner | text | MIRRORED | on-chain `owner` from Registered event |
| agentURI | text | MIRRORED | on-chain `agentURI` |
| agentWallet | text | MIRRORED | on-chain via `getAgentWallet()` |
| name | text | MIRRORED | IPFS agent registration JSON `.name` |
| description | text | MIRRORED | IPFS agent registration JSON `.description` |
| scoringDimension | text | MIRRORED | on-chain metadata key `scoringDimension` |
| promptVersion | text | MIRRORED | on-chain metadata key `promptVersion` |
| feedbackCount | integer | DERIVED | Count of NewFeedback events for this agent |
| feedbackSummaryValue | real | DERIVED | Aggregated feedback value from `getSummary()` |
| validationScore | integer | DERIVED | Average validation response (0-100) from ValidationRegistry |
| registeredAt | integer | MIRRORED | Block timestamp of Registered event |

### agent_feedback (cache table)

| Field | Type | Provenance | Source |
|-------|------|------------|--------|
| id | text PK | DERIVED | `{agentId}_{clientAddress}_{feedbackIndex}` |
| agentId | integer | MIRRORED | on-chain `agentId` from NewFeedback event |
| clientAddress | text | MIRRORED | on-chain `clientAddress` |
| feedbackIndex | integer | MIRRORED | on-chain `feedbackIndex` |
| value | real | MIRRORED | on-chain `value` (with `valueDecimals` applied) |
| tag1 | text | MIRRORED | on-chain `tag1` (scoring dimension) |
| tag2 | text | MIRRORED | on-chain `tag2` (funding round) |
| feedbackCid | text | MIRRORED | from `feedbackURI` in NewFeedback event (IPFS CID) |
| isRevoked | integer | MIRRORED | on-chain via `readFeedback()` |
| timestamp | integer | MIRRORED | Block timestamp of NewFeedback event |

### disputes (cache table)

| Field | Type | Provenance | Source |
|-------|------|------------|--------|
| id | integer PK | MIRRORED | on-chain `disputeId` |
| proposalId | text | MIRRORED | on-chain `proposalId` |
| initiatorAddress | text | MIRRORED | on-chain `initiator` |
| stakeAmount | text | MIRRORED | on-chain `stakeAmount` (wei as string) |
| evidenceCid | text | MIRRORED | on-chain `evidenceCid` |
| status | text | MIRRORED | on-chain `status` mapped to enum name |
| newScore | real | MIRRORED | on-chain `newScore` / 100 (null if not overturned) |
| deadline | integer | MIRRORED | on-chain `deadline` |
| resolvedAt | integer | DERIVED | Block timestamp of DisputeResolved event (null if pending) |
| voteCount | integer | DERIVED | Count of DisputeVote events |
| upholdVotes | integer | DERIVED | Count of uphold votes |
| overturnVotes | integer | DERIVED | Count of overturn votes |

### funding_round_stats (cache table)

| Field | Type | Provenance | Source |
|-------|------|------------|--------|
| fundingRoundId | text PK | MIRRORED | on-chain `fundingRoundId` |
| proposalCount | integer | DERIVED | `COUNT(proposals WHERE fundingRoundId = ?)` |
| evaluatedCount | integer | DERIVED | `COUNT(proposals WHERE evaluatedAt IS NOT NULL)` |
| averageScore | real | DERIVED | `AVG(finalScore)` across round proposals |
| totalFundsReleased | text | DERIVED | `SUM(fund_releases.amount)` for round projects |
| disputeCount | integer | DERIVED | `COUNT(disputes)` for round proposals |

### Operational Tables (NOT rebuildable from chain)

These tables store operational state that has no on-chain equivalent. They survive cache rebuilds but are not part of the evaluation data.

#### platform_integrations

| Field | Type | Provenance | Description |
|-------|------|------------|-------------|
| id | text PK | SOURCED | Generated UUID |
| name | text | SOURCED | Platform name |
| webhookUrl | text | SOURCED | Callback URL |
| apiKeyHash | text | SOURCED | Hashed API key |
| status | text | SOURCED | active, suspended, revoked |
| createdAt | text | SOURCED | ISO 8601 |

#### evaluation_jobs

| Field | Type | Provenance | Description |
|-------|------|------------|-------------|
| id | text PK | SOURCED | Generated UUID |
| proposalId | text | SOURCED | Proposal being evaluated |
| status | text | SOURCED | pending, in_progress, complete, failed |
| retryCount | integer | SOURCED | Retry attempts (max 3) |
| startedAt | text | SOURCED | ISO 8601 |
| completedAt | text | SOURCED | ISO 8601 |
| error | text | SOURCED | Error message if failed |

---

## State Transitions

### Proposal lifecycle (inferred from chain events)
```
(no events)           → status: "pending"
EvaluationSubmitted   → status: "evaluated"
DisputeOpened         → status: "disputed"
DisputeResolved       → status: "evaluated" (score may change)
FundReleased          → status: "funded"
```

### Dispute lifecycle (on-chain status field)
```
0 (open) → 1 (voting) → 2 (upheld)
                       → 3 (overturned)
         → 4 (expired)
```

---

## Validation Rules (Zod Boundaries)

| Boundary | Validated Data | Schema |
|----------|---------------|--------|
| Webhook input | Raw proposal from platform | `ProposalContentSchema` (after PII sanitization) |
| LLM output | Dimension scores from `generateObject` | `DimensionScoreSchema` |
| IPFS write | Content before pinning | `ProposalContentSchema`, `EvaluationContentSchema`, `MonitoringReportSchema` |
| Chain read | Events from The Graph | Event-specific Zod schemas |
| Cache write | Denormalized rows before SQLite insert | `createInsertSchema` from Drizzle table definitions |
| API output | Dashboard responses | Select schemas (public fields only) |
