# Contract: Webhook API

**Feature**: 001-arwf-judge-system
**Type**: HTTP API (Next.js Route Handlers)
**Auth**: API Key via `X-API-Key` header (ingestion), public (reads)

## Data Source Note

Read endpoints serve data from the **SQLite cache** (Turso) for performance. Every cached field is either MIRRORED from chain/IPFS or DERIVED from those sources. Responses include `proposalContentCid` and `evaluationContentCid` so clients can independently verify against IPFS and chain.

---

## POST /api/webhooks/proposals

Ingests a grant proposal from a registered funding platform.

**Flow**: Validate → Sanitize PII → Pin to IPFS → Submit to Chain → Cache materializes via sync

### Request

**Headers**:
```
Content-Type: application/json
X-API-Key: <platform-api-key>
```

**Body**:
```json
{
  "externalId": "gitcoin-proposal-12345",
  "fundingRoundId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Decentralized Identity Resolver",
  "description": "A protocol for resolving decentralized identities...",
  "budgetAmount": 50000.00,
  "budgetCurrency": "USD",
  "budgetBreakdown": [
    { "category": "development", "amount": 35000, "description": "Core protocol development" },
    { "category": "audit", "amount": 10000, "description": "Security audit" },
    { "category": "documentation", "amount": 5000, "description": "Technical docs" }
  ],
  "technicalDescription": "The resolver uses a merkle-trie structure...",
  "teamMembers": [
    { "role": "lead", "experience": "5 years blockchain development" },
    { "role": "researcher", "experience": "PhD in distributed systems" }
  ],
  "category": "infrastructure",
  "submittedAt": "2026-04-12T10:00:00Z"
}
```

**Validation**: Zod schema at boundary. `teamMembers` are hashed into `teamProfileHash` before IPFS pinning (PII sanitization per FR-006). Raw team data never reaches IPFS or chain.

### Response

**201 Created**:
```json
{
  "proposalId": "0xabc123...",
  "proposalContentCid": "bafybeig...",
  "status": "pending",
  "message": "Proposal pinned to IPFS and queued for evaluation"
}
```

**400 Bad Request** (validation failure):
```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    { "path": ["budgetAmount"], "message": "Expected number, received string" }
  ]
}
```

**401 Unauthorized** (invalid or missing API key):
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or missing API key"
}
```

**409 Conflict** (duplicate proposal):
```json
{
  "error": "DUPLICATE_PROPOSAL",
  "message": "Proposal with externalId 'gitcoin-proposal-12345' already exists for this platform"
}
```

---

## GET /api/proposals

Lists proposals with pagination and filtering. Public endpoint (no auth). **Reads from SQLite cache.**

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| fundingRoundId | string | required | Filter by funding round (hex) |
| status | string | all | Filter by status |
| search | string | - | Full-text search on title/description |
| page | integer | 1 | Page number |
| pageSize | integer | 20 | Items per page (max 100) |
| sort | string | chainTimestamp | Sort field |
| order | string | desc | Sort direction |

### Response

**200 OK**:
```json
{
  "data": [
    {
      "id": "0xabc123...",
      "title": "Decentralized Identity Resolver",
      "category": "infrastructure",
      "status": "evaluated",
      "finalScore": 7.85,
      "adjustedScore": 8.01,
      "teamSize": 2,
      "submittedAt": "2026-04-12T10:00:00Z",
      "proposalContentCid": "bafybeig...",
      "evaluationContentCid": "bafybeih..."
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8
  },
  "source": "cache"
}
```

---

## GET /api/proposals/:id

Returns full proposal detail with evaluation scores and justifications. Public endpoint. **Reads from SQLite cache.**

### Response

**200 OK**:
```json
{
  "id": "0xabc123...",
  "title": "Decentralized Identity Resolver",
  "description": "A protocol for...",
  "category": "infrastructure",
  "budgetAmount": 50000.00,
  "budgetCurrency": "USD",
  "status": "evaluated",
  "proposalContentCid": "bafybeig...",
  "evaluationContentCid": "bafybeih...",
  "evaluation": {
    "finalScore": 7.85,
    "reputationMultiplier": 1.02,
    "adjustedScore": 8.01,
    "evaluatedAt": "2026-04-12T10:04:30Z",
    "dimensions": [
      {
        "dimension": "technical_feasibility",
        "weight": 0.25,
        "score": 8.0,
        "rubricApplied": { "criteria": ["architecture", "scalability", "security"] },
        "reasoningChain": "The proposal demonstrates a well-structured merkle-trie approach...",
        "inputDataConsidered": ["technicalDescription", "budgetBreakdown.development"]
      },
      {
        "dimension": "impact_potential",
        "weight": 0.30,
        "score": 7.5,
        "rubricApplied": { "criteria": ["reach", "novelty", "ecosystem_value"] },
        "reasoningChain": "Identity resolution addresses a real gap...",
        "inputDataConsidered": ["description", "category"]
      },
      {
        "dimension": "cost_efficiency",
        "weight": 0.20,
        "score": 8.5,
        "rubricApplied": { "criteria": ["budget_allocation", "cost_per_impact", "sustainability"] },
        "reasoningChain": "Budget breakdown is well-justified...",
        "inputDataConsidered": ["budgetAmount", "budgetBreakdown", "teamSize"]
      },
      {
        "dimension": "team_capability",
        "weight": 0.25,
        "score": 7.5,
        "rubricApplied": { "criteria": ["experience", "track_record", "team_composition"] },
        "reasoningChain": "Team has relevant domain expertise...",
        "inputDataConsidered": ["teamSize", "teamProfileHash"]
      }
    ]
  },
  "fundRelease": {
    "releasePercentage": 80.1,
    "amount": "15000000000000000000",
    "txHash": "0xdef456...",
    "status": "confirmed"
  },
  "reputation": {
    "reputationIndex": 200,
    "badge": "active"
  },
  "verification": {
    "chainExplorerUrl": "https://basescan.org/tx/0x...",
    "ipfsProposalUrl": "https://gateway.pinata.cloud/ipfs/bafybeig...",
    "ipfsEvaluationUrl": "https://gateway.pinata.cloud/ipfs/bafybeih..."
  },
  "source": "cache"
}
```

**404 Not Found**:
```json
{
  "error": "NOT_FOUND",
  "message": "Proposal not found"
}
```

---

## GET /api/rounds/:id/stats

Returns aggregate statistics for a funding round. Public endpoint. **Reads DERIVED data from SQLite cache.**

### Response

**200 OK**:
```json
{
  "fundingRoundId": "0x...",
  "proposalCount": 142,
  "evaluatedCount": 138,
  "averageScore": 6.72,
  "totalFundsReleased": "4500000000000000000000",
  "disputeCount": 3,
  "source": "cache (derived)"
}
```

---

## POST /api/sync

Triggers an incremental cache rebuild from The Graph + IPFS. Operator-authenticated.

### Response

**200 OK**:
```json
{
  "synced": true,
  "eventsProcessed": 47,
  "ipfsFetched": 12,
  "duration": "3.2s"
}
```

---

## POST /api/webhooks/disputes

Receives dispute notifications from on-chain events. Internal use.

### Request

**Headers**:
```
Content-Type: application/json
X-API-Key: <internal-api-key>
```

**Body**:
```json
{
  "proposalId": "0xabc123...",
  "initiatorAddress": "0x1234...",
  "stakeAmount": "1500000000000000000",
  "evidenceCid": "bafybeij...",
  "onChainDisputeId": "42"
}
```

### Response

**201 Created**:
```json
{
  "disputeId": 42,
  "status": "open",
  "deadline": 1713520800
}
```
