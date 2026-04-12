# AI Judge for IPE City Grants — Design Specification

## Overview

An AI-powered grant evaluation system for IPE City (ipe.city/grants) that uses 4 specialized Judge Agents to score proposals across Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability. Evaluations are transparent, weighted, and published to ERC-8004 compliant on-chain registries on Base Sepolia. IPFS stores canonical content. SQLite serves as a disposable read cache.

**Core principle:** The blockchain is the source of truth. IPFS is the content layer. The database is a disposable index that can be rebuilt from chain events + IPFS at any time.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                             │
│                                                          │
│  Proposal Form → Submit → Live Evaluation Theater        │
│                              ┌──────┐ ┌──────┐          │
│                              │Tech  │ │Impact│          │
│                              │Judge │ │Judge │          │
│                              └──────┘ └──────┘          │
│                              ┌──────┐ ┌──────┐          │
│                              │Cost  │ │Team  │          │
│                              │Judge │ │Judge │          │
│                              └──────┘ └──────┘          │
│                              ┌──────────────┐           │
│                              │ Aggregate S0  │           │
│                              └──────────────┘           │
└────────────────────┬────────────────────────────────────┘
                     │ 4× SSE streams (useObject)
                     ▼
┌─────────────────────────────────────────────────────────┐
│               NEXT.JS (GCP)                              │
│                                                          │
│  POST /api/proposals          — validate + save          │
│  POST /api/evaluate           — fire 4 parallel judges   │
│  GET  /api/evaluate/[id]/tech — stream Tech judge        │
│  GET  /api/evaluate/[id]/impact — stream Impact judge    │
│  GET  /api/evaluate/[id]/cost — stream Cost judge        │
│  GET  /api/evaluate/[id]/team — stream Team judge        │
│                                                          │
│  On each judge complete:                                 │
│    → Save to SQLite (read cache)                         │
│    → Upload evaluation JSON to IPFS                      │
│                                                          │
│  On all 4 complete:                                      │
│    → Compute weighted S0                                 │
│    → Publish 4× giveFeedback + on-chain identity         │
│    → Update SQLite cache with chain tx hash              │
└──────┬──────────────────┬───────────────┬───────────────┘
       │                  │               │
       ▼                  ▼               ▼
┌────────────┐   ┌──────────────┐   ┌──────────────────┐
│  SQLite    │   │    IPFS      │   │  Base Sepolia     │
│  (Turso)   │   │  (Pinata)    │   │                   │
│            │   │              │   │  IdentityRegistry │
│ proposals  │   │ proposal.json│   │  ReputationRegistry│
│ evaluations│   │ eval-tech..  │   │  MilestoneManager │
│ scores     │   │ eval-impact..│   │                   │
│ (disposable│   │ aggregate..  │   │  ERC-8004         │
│  cache)    │   │              │   │  compliant        │
└────────────┘   └──────────────┘   └──────────────────┘
```

**Data flow — unidirectional:**

1. User submits proposal → SQLite (fast ID) + IPFS (canonical)
2. 4 judges stream to browser via AI SDK `streamObject`
3. Each judge result → SQLite + IPFS
4. All 4 done → compute S0 → `giveFeedback()` ×4 on ReputationRegistry
5. UI reads from SQLite for speed; everything verifiable from chain + IPFS

---

## 2. Smart Contracts (ERC-8004 Compliant)

Three contracts on Base Sepolia. Built with Foundry + OpenZeppelin.

### 2.1 IdentityRegistry (ERC-8004)

Extends ERC-721. One soulbound NFT per grant project.

```solidity
struct MetadataEntry {
    string metadataKey;
    bytes metadataValue;
}

// Registration (3 overloads per ERC-8004)
function register(string agentURI, MetadataEntry[] calldata metadata)
    external returns (uint256 agentId);
function register(string agentURI) external returns (uint256 agentId);
function register() external returns (uint256 agentId);

// URI management
function setAgentURI(uint256 agentId, string calldata newURI) external;

// Key-value metadata
function getMetadata(uint256 agentId, string memory key)
    external view returns (bytes memory);
function setMetadata(uint256 agentId, string memory key,
    bytes memory value) external;

// Wallet (reserved key, EIP-712 signed)
function setAgentWallet(uint256 agentId, address newWallet,
    uint256 deadline, bytes calldata signature) external;
function getAgentWallet(uint256 agentId) external view returns (address);
function unsetAgentWallet(uint256 agentId) external;

// Events
event Registered(uint256 indexed agentId, string agentURI,
    address indexed owner);
event URIUpdated(uint256 indexed agentId, string newURI,
    address indexed updatedBy);
event MetadataSet(uint256 indexed agentId,
    string indexed indexedMetadataKey, string metadataKey,
    bytes metadataValue);
```

Soulbound: `_update` override blocks transfers (except mint and burn).

### 2.2 ReputationRegistry (ERC-8004)

Linked to IdentityRegistry at deploy. Stores judge feedback per dimension.

```solidity
function initialize(address identityRegistry_) external;
function getIdentityRegistry() external view returns (address);

// Feedback — called once per judge dimension
//   tag1 = "tech" | "impact" | "cost" | "team"
//   tag2 = "judge-v1"
//   value = score (e.g., 8700 for 87.00)
//   valueDecimals = 2
//   feedbackURI = IPFS CID of evaluation JSON
//   feedbackHash = keccak256 of that JSON content
function giveFeedback(uint256 agentId, int128 value,
    uint8 valueDecimals, string calldata tag1,
    string calldata tag2, string calldata endpoint,
    string calldata feedbackURI, bytes32 feedbackHash) external;

function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

function appendResponse(uint256 agentId, address clientAddress,
    uint64 feedbackIndex, string calldata responseURI,
    bytes32 responseHash) external;

// Read
function getSummary(uint256 agentId, address[] calldata clientAddresses,
    string tag1, string tag2) external view
    returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);

function readFeedback(uint256 agentId, address clientAddress,
    uint64 feedbackIndex) external view
    returns (int128 value, uint8 valueDecimals, string tag1,
            string tag2, bool isRevoked);

function readAllFeedback(uint256 agentId,
    address[] calldata clientAddresses,
    string tag1, string tag2, bool includeRevoked) external view
    returns (address[] memory, uint64[] memory, int128[] memory,
            uint8[] memory, string[] memory, string[] memory,
            bool[] memory);

function getClients(uint256 agentId) external view
    returns (address[] memory);
function getLastIndex(uint256 agentId, address clientAddress)
    external view returns (uint64);

// Events
event NewFeedback(uint256 indexed agentId,
    address indexed clientAddress, uint64 feedbackIndex,
    int128 value, uint8 valueDecimals,
    string indexed indexedTag1, string tag1, string tag2,
    string endpoint, string feedbackURI, bytes32 feedbackHash);
event FeedbackRevoked(uint256 indexed agentId,
    address indexed clientAddress, uint64 indexed feedbackIndex);
event ResponseAppended(uint256 indexed agentId,
    address indexed clientAddress, uint64 feedbackIndex,
    address indexed responder, string responseURI,
    bytes32 responseHash);
```

**On-chain storage per feedback:** value, valueDecimals, tag1, tag2, isRevoked, feedbackIndex. Event-only fields: endpoint, feedbackURI, feedbackHash.

### 2.3 MilestoneManager (ARWF Extension)

Not part of ERC-8004. Reads from IdentityRegistry and ReputationRegistry.

```solidity
function createMilestones(uint256 identityId, Milestone[] calldata milestones) external;
function releaseMilestone(uint256 identityId, uint256 milestoneIndex) external;
function getMilestones(uint256 identityId) external view returns (Milestone[] memory);

struct Milestone {
    string name;
    string description;
    uint256 amount;        // in wei or USDC base units
    uint16 weightBps;      // weight in basis points (sum = 10000)
    MilestoneStatus status;
}

enum MilestoneStatus { PENDING, RELEASED, PARTIAL, FORFEITED }

// Release logic:
// releaseBps = ReputationRegistry.getSummary(identityId, ...).summaryValue
// releaseAmount = milestone.amount × releaseBps / 10000

event MilestoneReleased(uint256 indexed identityId,
    uint256 index, uint256 amount, uint16 releaseBps);
```

Receives ETH/USDC. Holds until milestone release based on reputation score.

### 2.4 Judge-to-Chain Mapping

```
Tech Judge   → giveFeedback(agentId, 8700, 2, "tech",   "judge-v1", "", ipfsURI, hash)
Impact Judge → giveFeedback(agentId, 9200, 2, "impact", "judge-v1", "", ipfsURI, hash)
Cost Judge   → giveFeedback(agentId, 7500, 2, "cost",   "judge-v1", "", ipfsURI, hash)
Team Judge   → giveFeedback(agentId, 8100, 2, "team",   "judge-v1", "", ipfsURI, hash)
```

---

## 3. Judge Agent Pipeline

### 3.1 Four Judges

| Judge | Dimension | Weight | Evaluates | IPE City Lens |
|---|---|---|---|---|
| Tech Judge | Technical Feasibility | 25% | Architecture, tech stack, implementation plan, scalability | Pro-technology — pushes technical boundaries? |
| Impact Judge | Impact Potential | 30% | Problem significance, beneficiary scope, measurable outcomes | Pro-human-progress — meaningfully improves lives? |
| Cost Judge | Cost Efficiency | 20% | Budget justification, resource allocation, cost-to-impact ratio | Efficient use of community funds? |
| Team Judge | Team Capability | 25% | Prior experience, relevant skills, team composition, village participation | Pro-freedom — builders who ship? |

### 3.2 Structured Output Schema

```typescript
const JudgeEvaluationSchema = z.object({
  score: z.number().min(0).max(10000),
  scoreDecimals: z.literal(2),
  confidence: z.enum(["high", "medium", "low"]),
  recommendation: z.enum(["strong_fund", "fund", "conditional", "reject"]),
  justification: z.string().max(2000),
  keyFindings: z.array(z.string()).max(3),
  risks: z.array(z.string()).max(3),
  ipeAlignment: z.object({
    proTechnology: z.number().min(0).max(100),
    proFreedom: z.number().min(0).max(100),
    proHumanProgress: z.number().min(0).max(100),
  }),
})
```

### 3.3 Streaming Flow

```
Next.js Route Handler
  → streamObject({
      model: openai("gpt-4o"),
      schema: JudgeEvaluationSchema,
      system: judgeSystemPrompt[dimension],
      prompt: proposalContext,
    })
  → SSE stream → browser (useObject renders partial state)
  → on complete: save to SQLite + upload JSON to IPFS
```

All 4 judges fire in parallel. Client opens 4 SSE connections simultaneously.

### 3.4 Aggregate Score

```
S0 = (tech.score × 0.25) + (impact.score × 0.30) +
     (cost.score × 0.20) + (team.score × 0.25)
```

Computed server-side after all 4 judges complete. Published as aggregate to chain.

### 3.6 Completion Detection & Error Handling

The `POST /api/evaluate` route handler orchestrates the full pipeline:

1. Creates an evaluation record in SQLite with status `evaluating`
2. Fires 4 parallel judge streams (each writes its result to SQLite on complete)
3. Client polls `GET /api/evaluate/[id]/status` every 2s to detect completion
4. When all 4 judges have results in SQLite → status transitions to `publishing`
5. Server computes S0, uploads aggregate to IPFS, calls `giveFeedback()` ×4 + registers identity
6. Status transitions to `published` with tx hash

**If a judge fails mid-stream:**
- The failed judge's status is set to `failed` in SQLite
- Client shows error state on that judge card
- User can retry individual judges via `POST /api/evaluate/[id]/[dimension]/retry`
- On-chain publish waits until all 4 succeed

### 3.5 Anti-Rationalization in Judge Prompts

Borrowed from Superpowers' anti-rationalization engineering:

- Each judge MUST cite specific evidence from the proposal for every score
- No invented evidence or inferred capabilities not stated in the proposal
- Calibration anchors: 8000+ = exceptional with clear evidence, 5000 = adequate, below 3000 = significant concerns with cited gaps
- No cross-contamination: each judge sees only proposal content, not other judges' evaluations
- Explicit red flags table in each system prompt listing common rationalization patterns

---

## 4. Data Flow & IPFS Strategy

### 4.1 Storage Matrix

| Data | SQLite | IPFS | On-chain |
|---|---|---|---|
| Proposal content | Full JSON | Full JSON | IPFS CID in IdentityRegistry metadata |
| Judge evaluation (×4) | Full JSON | Full JSON | `giveFeedback()` with IPFS CID + keccak256 |
| Aggregate score | Computed value | Aggregate JSON | Derived from `getSummary()` |
| Project identity | Token ID ref | Agent registration file | NFT in IdentityRegistry |
| Milestones | Status cache | — | MilestoneManager contract state |

### 4.2 IPFS Documents

**Proposal:**
```json
{
  "type": "https://ipe.city/schemas/proposal-v1",
  "title": "...",
  "description": "...",
  "problemStatement": "...",
  "proposedSolution": "...",
  "teamMembers": [{ "name": "...", "role": "..." }],
  "budget": { "amount": 5000, "breakdown": "..." },
  "timeline": "...",
  "category": "infrastructure",
  "residencyDuration": "4-weeks",
  "demoDayDeliverable": "...",
  "communityContribution": "...",
  "priorIpeParticipation": false,
  "links": ["https://github.com/..."],
  "submittedAt": "2026-04-12T...",
  "submitter": "0x..."
}
```

**Judge evaluation:**
```json
{
  "type": "https://ipe.city/schemas/judge-evaluation-v1",
  "proposalCID": "Qm.../proposal.json",
  "dimension": "tech",
  "score": 8700,
  "scoreDecimals": 2,
  "confidence": "high",
  "recommendation": "fund",
  "justification": "...",
  "keyFindings": ["...", "...", "..."],
  "risks": ["...", "..."],
  "ipeAlignment": { "proTechnology": 85, "proFreedom": 70, "proHumanProgress": 90 },
  "model": "gpt-4o-2024-08-06",
  "promptVersion": "judge-tech-v1",
  "evaluatedAt": "2026-04-12T..."
}
```

**ERC-8004 Agent Registration File:**
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "IPE City Grant Proposal: [title]",
  "description": "[proposal description]",
  "image": "https://ipe.city/og/proposals/[id].png",
  "services": [],
  "active": true,
  "registrations": [{
    "agentId": 1,
    "agentRegistry": "eip155:84532:0x..."
  }],
  "supportedTrust": ["reputation"]
}
```

### 4.3 Verification Loop

Anyone can verify an evaluation:

1. Read `NewFeedback` event from ReputationRegistry → get `feedbackURI` + `feedbackHash`
2. Fetch content from IPFS via `feedbackURI`
3. Compute `keccak256(content)` → must match `feedbackHash`
4. Content includes `proposalCID` → fetch proposal from IPFS
5. Content includes `model` + `promptVersion` → evaluation is reproducible

---

## 5. UI & Pages

### 5.1 Route Structure

```
/grants                    — Landing + proposal list
/grants/submit             — Proposal submission form
/grants/[id]               — Proposal detail + evaluation results
/grants/[id]/evaluate      — Live evaluation theater (streaming)
/grants/[id]/verify        — On-chain verification view
```

### 5.2 Page Details

**`/grants` — Landing + Proposal List**
- Hero: "IPE City Grants — AI-Evaluated, On-Chain Verified"
- Stats bar: total proposals, total evaluated, avg score
- Proposal cards grid: title, category, status badge (pending/evaluating/evaluated), aggregate score, date
- Filter by category, status, score range
- Sort by newest, highest score, recently evaluated

**`/grants/submit` — IPE City Tailored Form**
- Project Info: Title, Description, Problem Statement, Proposed Solution
- Team: Name + role (repeatable)
- Funding: Budget (USDC), Breakdown, Timeline
- IPE Village: Residency duration (3/4/5 weeks), Demo Day deliverable, Community contribution, Prior participation (yes/no)
- Links: GitHub, Website, Other (repeatable)
- Category: Infrastructure / Research / Community / Education / Creative
- On submit: SQLite → IPFS → register identity on-chain → redirect to evaluate

**`/grants/[id]` — Proposal Detail + Results**
- Proposal content
- 4 judge cards: dimension, score gauge, recommendation badge, justification, findings, risks
- Aggregate S0 with weighted breakdown
- IPE alignment radar chart
- On-chain proof: tx hash, block, IPFS links, "Verify on BaseScan" button

**`/grants/[id]/evaluate` — Live Evaluation Theater**
- 2×2 grid of judge cards
- Each starts with pulsing "Evaluating..." state
- Streams via `useObject`: score counter animates, recommendation appears, justification types in, findings appear as bullets
- Center: S0 recomputes live as judges report
- All 4 complete → "Publishing to chain..." → tx confirmation → auto-redirect

**`/grants/[id]/verify` — On-Chain Verification**
- Per-judge: `giveFeedback` event data, IPFS link, "Fetch & Verify Hash" button, hash match status
- Proposal identity: NFT token ID, registration tx
- Audit trail: timestamps, model versions, prompt versions

### 5.3 Components

- **shadcn/ui:** Form inputs, cards, badges, dialogs, tables
- **Custom:** ScoreGauge (radial progress), StreamingText (typewriter), JudgeCard (streaming evaluation), EvaluationTheater (2×2 orchestrator), IpeAlignment (radar chart), VerifyBadge (hash check display), ProposalCard (list item)

---

## 6. Project Structure

```
agent-reviewer/
├── contracts/                     # Foundry project
│   ├── src/
│   │   ├── IdentityRegistry.sol
│   │   ├── ReputationRegistry.sol
│   │   └── MilestoneManager.sol
│   ├── test/
│   │   ├── IdentityRegistry.t.sol
│   │   ├── ReputationRegistry.t.sol
│   │   └── MilestoneManager.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── grants/
│   │   │   ├── page.tsx
│   │   │   ├── submit/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── evaluate/page.tsx
│   │   │       └── verify/page.tsx
│   │   └── api/
│   │       ├── proposals/route.ts
│   │       └── evaluate/[id]/
│   │           ├── route.ts
│   │           └── [dimension]/route.ts
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── judge-card.tsx
│   │   ├── score-gauge.tsx
│   │   ├── evaluation-theater.tsx
│   │   ├── ipe-alignment.tsx
│   │   ├── proposal-card.tsx
│   │   ├── proposal-form.tsx
│   │   └── verify-badge.tsx
│   ├── lib/
│   │   ├── judges/
│   │   │   ├── schemas.ts
│   │   │   ├── prompts.ts
│   │   │   └── weights.ts
│   │   ├── chain/
│   │   │   ├── contracts.ts
│   │   │   ├── publish.ts
│   │   │   └── config.ts
│   │   ├── ipfs/
│   │   │   ├── client.ts
│   │   │   └── schemas.ts
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   ├── schema.ts
│   │   │   └── migrations/
│   │   └── constants.ts
│   └── types/index.ts
├── docs/
│   ├── superpowers/specs/
│   ├── big-reference-architecture/
│   └── PROMPTING.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── drizzle.config.ts
```

### 6.1 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | Rendering, routing, API |
| Language | TypeScript (strict) | Type safety |
| Runtime | Bun | Package management, scripts |
| Styling | Tailwind CSS 4 + shadcn/ui | UI components |
| AI | Vercel AI SDK + OpenAI GPT-4o | Streaming judge evaluations |
| Database | SQLite via Turso + Drizzle ORM | Disposable read cache |
| Storage | IPFS via Pinata | Canonical content storage |
| Contracts | Solidity 0.8.24+ / Foundry | ERC-8004 registries |
| Chain | Base Sepolia | Testnet deployment |
| Ethereum client | viem | Contract interaction from server |
| Validation | Zod | Boundary validation + AI structured output |
| Deployment | GCP | Hosting |

---

## 7. Key Decisions

| Decision | Rationale |
|---|---|
| Chain + IPFS as source of truth, SQLite as cache | Web3 principles — storage should be transparent and verifiable. DB is disposable, rebuildable from chain events. |
| ERC-8004 full compliance | Any ERC-8004 reader can query evaluations natively. Future-proof for ecosystem composability. |
| AI SDK `streamObject` over OpenAI SDK direct | Purpose-built for streaming structured output to React. `useObject` handles partial JSON, type safety, error recovery. |
| 4 parallel streams over sequential | ~8-10s vs ~30s total latency. Better UX for live evaluation theater. |
| Pinata for IPFS | Simple SDK, free tier covers scale, HTTP API from server actions. |
| Base Sepolia over Ethereum Sepolia | Lower gas, faster blocks, ERC-8004 expanding to Base. |
| Foundry over Hardhat | Faster, Solidity-native tests, no JS dependency bloat. |
| No auth for v1 | Evaluations are public goods. Auth adds complexity without value for MVP. |
| IPE City tailored form | Judges evaluate against IPE values — form must capture village-specific context. |
| Anti-rationalization in prompts | Prevents AI judges from shortcutting evaluations. Evidence-backed scoring only. |

---

## 8. Out of Scope

| Feature | Reason |
|---|---|
| Monitor Agents | Future milestone — needs cron + external data sources |
| x402 payment flows | Future milestone — needs payment infrastructure |
| Dispute resolution (ValidationRegistry) | Future milestone — needs governance design |
| Full reputation multiplier | Needs historical data across multiple rounds |
| OAuth / user auth | Evaluations are public for v1 |
| Mobile app | Web-first |
| Wallet connect UI | On-chain writes are server-side via viem |
