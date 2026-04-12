# Architecture Patterns

**Domain:** AI-powered grant evaluation system with on-chain reputation
**Researched:** 2026-04-12

## Recommended Architecture

The system has four layers: **Frontend** (Next.js App Router), **Backend** (Convex functions), **AI Evaluation** (OpenAI GPT-4o via Convex actions), and **On-chain** (ERC-8004 registries via Convex Node.js actions). Convex replaces the reference architecture's Postgres + BullMQ + Redis with a single reactive database that handles persistence, scheduling, and real-time subscriptions natively.

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                     │
│  Next.js App Router + shadcn/ui + Tailwind          │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Proposal  │  │  Evaluation  │  │  Reputation   │  │
│  │   Form    │  │  Dashboard   │  │   Explorer    │  │
│  └─────┬────┘  └──────┬───────┘  └───────┬───────┘  │
│        │               │                  │          │
│        └───────────────┼──────────────────┘          │
│                        │ Convex useQuery/useMutation │
└────────────────────────┼─────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────┐
│                   CONVEX LAYER                        │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │              convex/proposals/                   │  │
│  │  mutations: create, update status               │  │
│  │  queries: list, getById, getByStatus            │  │
│  └──────────────────────┬──────────────────────────┘  │
│                         │ scheduler.runAfter(0, ...)   │
│  ┌─────────────────────────────────────────────────┐  │
│  │              convex/evaluation/                  │  │
│  │  actions: evaluateDimension (x4 parallel)       │  │
│  │  mutations: saveScore, aggregateScores          │  │
│  │  queries: getEvaluation, getScoreBreakdown      │  │
│  └──────────────────────┬──────────────────────────┘  │
│                         │ scheduler.runAfter(0, ...)   │
│  ┌─────────────────────────────────────────────────┐  │
│  │              convex/reputation/                  │  │
│  │  actions: publishToChain (Node.js action)       │  │
│  │  mutations: saveOnChainRef                      │  │
│  │  queries: getProjectReputation                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │              convex/prompts/                     │  │
│  │  Evaluation rubrics, system prompts, IPE values  │  │
│  │  (stored as Convex documents for versioning)     │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌──────────────┐
   │  OpenAI    │ │  OpenAI    │ │   ERC-8004   │
   │  GPT-4o   │ │  GPT-4o   │ │   Registries │
   │ (parallel │ │ (parallel │ │  (Sepolia)   │
   │  evals)   │ │  evals)   │ │              │
   └────────────┘ └────────────┘ └──────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Proposal Form** (frontend) | Collects structured proposal data (title, description, team, budget, links) | Convex mutations via `useMutation` |
| **Evaluation Dashboard** (frontend) | Displays per-dimension scores, justifications, aggregate score, real-time evaluation progress | Convex queries via `useQuery` (reactive) |
| **Reputation Explorer** (frontend) | Shows evaluation history per project, on-chain publication status | Convex queries via `useQuery` |
| **convex/proposals/** | Proposal CRUD, status management, triggers evaluation pipeline on creation | convex/evaluation/ (via scheduler) |
| **convex/evaluation/** | Orchestrates 4 parallel judge evaluations, aggregates scores, manages evaluation lifecycle | OpenAI API (via actions), convex/reputation/ (via scheduler) |
| **convex/reputation/** | Manages ERC-8004 identity references, publishes evaluation hashes on-chain | ERC-8004 contracts (via viem in Node.js action) |
| **convex/prompts/** | Stores and versions evaluation rubrics, system prompts, IPE City values context | Read by convex/evaluation/ actions |
| **contracts/** (Foundry) | Minimal ERC-8004 interaction — register project identity, post evaluation feedback | Deployed to Sepolia/Base Sepolia |

### Data Flow

**1. Proposal Submission**

```
User fills form → useMutation(api.proposals.create)
  → Convex mutation validates + stores proposal (status: "pending")
  → mutation calls ctx.scheduler.runAfter(0, internal.evaluation.orchestrate, { proposalId })
  → Returns proposalId to frontend immediately
```

**2. Parallel AI Evaluation (fire-and-forget pattern)**

```
internal.evaluation.orchestrate (mutation):
  → Reads proposal from DB
  → Sets status to "evaluating"
  → Schedules 4 parallel actions:
      ctx.scheduler.runAfter(0, internal.evaluation.evaluateDimension, { proposalId, dimension: "technical" })
      ctx.scheduler.runAfter(0, internal.evaluation.evaluateDimension, { proposalId, dimension: "impact" })
      ctx.scheduler.runAfter(0, internal.evaluation.evaluateDimension, { proposalId, dimension: "cost" })
      ctx.scheduler.runAfter(0, internal.evaluation.evaluateDimension, { proposalId, dimension: "team" })
```

**3. Individual Dimension Evaluation (action with side effects)**

```
internal.evaluation.evaluateDimension (action, "use node"):
  → Loads proposal data via ctx.runQuery
  → Loads rubric + system prompt via ctx.runQuery(internal.prompts.getForDimension)
  → Calls OpenAI GPT-4o with structured output (Zod schema):
      { score: number (0-100), justification: string, recommendation: string, keyFindings: string[] }
  → Saves result via ctx.runMutation(internal.evaluation.saveDimensionScore)
  → saveDimensionScore checks if all 4 dimensions complete
      → If yes: ctx.scheduler.runAfter(0, internal.evaluation.aggregate, { proposalId })
```

**4. Score Aggregation**

```
internal.evaluation.aggregate (mutation):
  → Reads all 4 dimension scores
  → Computes weighted aggregate: S0 = tech*0.25 + impact*0.30 + cost*0.20 + team*0.25
  → Stores aggregate score
  → Updates proposal status to "evaluated"
  → Schedules: ctx.scheduler.runAfter(0, internal.reputation.publishEvaluation, { proposalId })
```

**5. On-Chain Publication (Node.js action)**

```
internal.reputation.publishEvaluation (action, "use node"):
  → Loads evaluation data via ctx.runQuery
  → Creates evaluation hash (keccak256 of scores + justifications)
  → Uses viem to call ReputationRegistry.giveFeedback() on Sepolia
      - agentId: project's ERC-8004 identity
      - value: aggregate score (scaled to fixed-point)
      - tag: "grant-evaluation"
      - ipfsHash: optional — store full evaluation JSON on IPFS
  → Saves tx hash via ctx.runMutation(internal.reputation.saveOnChainRef)
  → Updates proposal status to "published"
```

**6. Real-Time Frontend Updates**

```
useQuery(api.evaluation.getByProposal, { proposalId })
  → Reactively updates as each dimension score lands
  → Shows progress: 0/4 → 1/4 → 2/4 → 3/4 → 4/4 → Aggregated → Published
  → No polling needed — Convex subscriptions push updates
```

## Convex Domain Structure

```
convex/
├── schema.ts                    # All table definitions + indexes
├── _generated/                  # Auto-generated (checked in)
│
├── proposals/
│   ├── mutations.ts             # create, updateStatus
│   ├── queries.ts               # list, getById, getByStatus, getWithEvaluation
│   └── types.ts                 # Zod schemas for proposal validation
│
├── evaluation/
│   ├── mutations.ts             # saveDimensionScore, aggregate, orchestrate
│   ├── queries.ts               # getByProposal, getScoreBreakdown, getDimensionScores
│   ├── actions.ts               # evaluateDimension ("use node" — calls OpenAI)
│   └── types.ts                 # Zod schemas for evaluation output
│
├── reputation/
│   ├── mutations.ts             # saveOnChainRef, saveIdentity
│   ├── queries.ts               # getProjectReputation, getPublicationStatus
│   ├── actions.ts               # publishEvaluation, registerIdentity ("use node" — calls chain)
│   └── types.ts                 # On-chain reference types
│
├── prompts/
│   ├── mutations.ts             # seed, updateRubric (admin)
│   ├── queries.ts               # getForDimension, getSystemPrompt, getValues
│   └── seed.ts                  # Initial rubric + prompt data
│
└── lib/
    ├── openai.ts                # OpenAI client factory + structured output helpers
    ├── chain.ts                 # viem client factory for Sepolia, contract ABIs
    └── scoring.ts               # Weight constants, aggregation logic
```

### Convex Schema Design

```typescript
// convex/schema.ts — key tables

// proposals table
defineTable({
  title: v.string(),
  description: v.string(),
  teamDescription: v.string(),
  budget: v.object({ amount: v.number(), currency: v.string(), breakdown: v.string() }),
  links: v.array(v.object({ label: v.string(), url: v.string() })),
  status: v.union(
    v.literal("pending"),
    v.literal("evaluating"),
    v.literal("evaluated"),
    v.literal("publishing"),
    v.literal("published"),
    v.literal("failed")
  ),
  submittedAt: v.number(),
}).index("by_status", ["status"])
  .index("by_submittedAt", ["submittedAt"])

// dimensionScores table
defineTable({
  proposalId: v.id("proposals"),
  dimension: v.union(
    v.literal("technical"),
    v.literal("impact"),
    v.literal("cost"),
    v.literal("team")
  ),
  score: v.number(),          // 0-100
  justification: v.string(),
  recommendation: v.string(),
  keyFindings: v.array(v.string()),
  modelId: v.string(),        // "gpt-4o" — for reproducibility
  promptVersion: v.string(),  // rubric version used
  evaluatedAt: v.number(),
}).index("by_proposal", ["proposalId"])
  .index("by_proposal_dimension", ["proposalId", "dimension"])

// aggregateScores table
defineTable({
  proposalId: v.id("proposals"),
  score: v.number(),           // weighted aggregate S0
  dimensionWeights: v.object({
    technical: v.number(),     // 0.25
    impact: v.number(),        // 0.30
    cost: v.number(),          // 0.20
    team: v.number(),          // 0.25
  }),
  computedAt: v.number(),
}).index("by_proposal", ["proposalId"])

// onChainPublications table
defineTable({
  proposalId: v.id("proposals"),
  chainId: v.number(),         // 11155111 (Sepolia)
  txHash: v.string(),
  evaluationHash: v.string(),  // keccak256 of evaluation data
  registryAddress: v.string(),
  agentId: v.optional(v.number()),  // ERC-8004 identity ID
  publishedAt: v.number(),
  status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
}).index("by_proposal", ["proposalId"])

// evaluationPrompts table
defineTable({
  dimension: v.string(),
  version: v.string(),
  systemPrompt: v.string(),
  rubric: v.string(),
  valuesContext: v.string(),   // IPE City values
  active: v.boolean(),
}).index("by_dimension_active", ["dimension", "active"])
```

## Patterns to Follow

### Pattern 1: Mutation-Schedules-Action (Convex Standard)

**What:** Mutations capture intent and schedule actions for side effects. Never call external APIs from mutations.

**When:** Any operation that needs both database writes and external API calls (OpenAI, blockchain).

**Why:** Mutations are transactional and retryable. Actions have side effects and are not. Keeping them separate ensures the scheduling itself is atomic — if the mutation fails, no action is scheduled.

```typescript
// convex/proposals/mutations.ts
export const create = mutation({
  args: { /* proposal fields */ },
  handler: async (ctx, args) => {
    const proposalId = await ctx.db.insert("proposals", {
      ...args,
      status: "pending",
      submittedAt: Date.now(),
    });
    // Fire-and-forget: schedule evaluation orchestration
    await ctx.scheduler.runAfter(0, internal.evaluation.orchestrate, { proposalId });
    return proposalId;
  },
});
```

### Pattern 2: Completion Gate for Parallel Actions

**What:** Use a mutation to check if all parallel actions have completed before proceeding to the next step. Each action writes its result independently; the save mutation counts completions.

**When:** Orchestrating 4 parallel judge evaluations that must all complete before aggregation.

```typescript
// convex/evaluation/mutations.ts
export const saveDimensionScore = internalMutation({
  args: { proposalId: v.id("proposals"), dimension: v.string(), score: v.number(), /* ... */ },
  handler: async (ctx, args) => {
    await ctx.db.insert("dimensionScores", { ...args, evaluatedAt: Date.now() });

    // Check if all 4 dimensions are now complete
    const scores = await ctx.db
      .query("dimensionScores")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();

    if (scores.length === 4) {
      await ctx.scheduler.runAfter(0, internal.evaluation.aggregate, {
        proposalId: args.proposalId,
      });
    }
  },
});
```

### Pattern 3: Node.js Actions for External Libraries

**What:** Use `"use node"` directive for actions that need npm packages not available in Convex's default runtime (OpenAI SDK, viem).

**When:** Calling OpenAI API or interacting with blockchain via viem.

```typescript
// convex/evaluation/actions.ts
"use node";

import { internalAction } from "../_generated/server";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

export const evaluateDimension = internalAction({
  args: { proposalId: v.id("proposals"), dimension: v.string() },
  handler: async (ctx, args) => {
    const proposal = await ctx.runQuery(internal.proposals.queries.getById, { id: args.proposalId });
    const prompt = await ctx.runQuery(internal.prompts.queries.getForDimension, { dimension: args.dimension });

    const client = new OpenAI();
    const response = await client.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: buildEvaluationPrompt(proposal, prompt.rubric) },
      ],
      response_format: zodResponseFormat(EvaluationOutputSchema, "evaluation"),
    });

    const result = response.choices[0].message.parsed;
    await ctx.runMutation(internal.evaluation.mutations.saveDimensionScore, {
      proposalId: args.proposalId,
      dimension: args.dimension,
      ...result,
      modelId: "gpt-4o",
      promptVersion: prompt.version,
    });
  },
});
```

### Pattern 4: On-Chain Bridge via viem in Node.js Action

**What:** Use viem in a `"use node"` action to interact with ERC-8004 contracts. Keep the private key in environment variables, never in Convex documents.

**When:** Publishing evaluation hashes to the ReputationRegistry.

```typescript
// convex/reputation/actions.ts
"use node";

import { createWalletClient, http, createPublicClient } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const publishEvaluation = internalAction({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.runQuery(internal.evaluation.queries.getByProposal, { id: args.proposalId });

    const account = privateKeyToAccount(process.env.PUBLISHER_PRIVATE_KEY as `0x${string}`);
    const client = createWalletClient({ account, chain: sepolia, transport: http() });

    const hash = await client.writeContract({
      address: REPUTATION_REGISTRY_ADDRESS,
      abi: reputationRegistryAbi,
      functionName: "giveFeedback",
      args: [evaluation.agentId, evaluation.score, 0, /* ... */],
    });

    await ctx.runMutation(internal.reputation.mutations.saveOnChainRef, {
      proposalId: args.proposalId,
      txHash: hash,
      chainId: 11155111,
      status: "pending",
    });
  },
});
```

### Pattern 5: Real-Time Progress via Convex Subscriptions

**What:** Frontend subscribes to evaluation state via `useQuery`. As each dimension score lands, the UI updates automatically without polling.

**When:** Showing evaluation progress (0/4 to 4/4 dimensions complete).

```typescript
// Frontend component
const scores = useQuery(api.evaluation.getScoreBreakdown, { proposalId });
const proposal = useQuery(api.proposals.getById, { id: proposalId });

// scores reactively updates as each dimension completes
// proposal.status transitions: pending → evaluating → evaluated → published
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Calling OpenAI from Mutations

**What:** Using `fetch` or the OpenAI SDK inside a Convex mutation.

**Why bad:** Mutations must be deterministic and short-lived. OpenAI calls take 3-15 seconds and have side effects. If the mutation retries (which Convex does automatically on conflicts), you pay for duplicate API calls.

**Instead:** Use the mutation-schedules-action pattern. Mutation writes intent, schedules an action.

### Anti-Pattern 2: Polling for Evaluation Completion

**What:** Using `setInterval` or `setTimeout` on the client to check if evaluations are done.

**Why bad:** Wastes bandwidth, introduces latency, and fights against Convex's reactive model.

**Instead:** Use `useQuery` subscriptions. Convex pushes updates when data changes.

### Anti-Pattern 3: Storing Private Keys in Convex Documents

**What:** Putting blockchain signing keys in the Convex database.

**Why bad:** Convex data is accessible via queries. Private keys must never be queryable.

**Instead:** Use Convex environment variables (`npx convex env set PUBLISHER_PRIVATE_KEY 0x...`). Only accessible in actions, never in queries or mutations.

### Anti-Pattern 4: Single Sequential Evaluation

**What:** Evaluating all 4 dimensions in a single action, one after another.

**Why bad:** Total time = sum of all 4 OpenAI calls (12-60 seconds). Also, if the 3rd call fails, you lose the first 2 results.

**Instead:** Schedule 4 independent actions. Each succeeds or fails independently. Use the completion gate pattern to aggregate only when all 4 finish.

### Anti-Pattern 5: Tight Coupling Between Evaluation and On-Chain

**What:** Publishing to blockchain inside the evaluation action.

**Why bad:** Blockchain transactions can fail independently of evaluations. Coupling them means a failed tx requires re-running the expensive OpenAI calls.

**Instead:** Separate concerns. Evaluation writes scores to Convex. A separate action reads scores and publishes on-chain. If the chain tx fails, retry only the publication.

## Frontend Component Architecture

```
src/app/
├── layout.tsx                       # ConvexProvider wrapper
├── page.tsx                         # Landing / proposal list
│
├── grants/
│   ├── page.tsx                     # Proposal list with status filters
│   ├── new/
│   │   └── page.tsx                 # Proposal submission form
│   └── [proposalId]/
│       ├── page.tsx                 # Proposal detail + evaluation results
│       └── components/
│           ├── proposal-header.tsx   # Title, status badge, submission date
│           ├── score-overview.tsx    # Aggregate score, radar/bar chart
│           ├── dimension-card.tsx    # Per-dimension score + justification
│           ├── evaluation-progress.tsx  # Real-time progress (0/4 → 4/4)
│           └── chain-status.tsx     # On-chain publication status + tx link
│
├── compare/
│   └── page.tsx                     # Before/after prompt comparison (demo)
│
└── components/
    ├── ui/                          # shadcn/ui components
    ├── score-badge.tsx              # Color-coded score display
    ├── dimension-radar.tsx          # Radar chart for 4 dimensions
    └── proposal-card.tsx            # List item for proposal
```

## Smart Contract Structure (Minimal for MVP)

```
contracts/
├── foundry.toml
├── src/
│   └── IPEReputationPublisher.sol   # Thin wrapper that calls ERC-8004 registries
├── script/
│   └── Deploy.s.sol                 # Deploy + register in ERC-8004 IdentityRegistry
├── test/
│   └── IPEReputationPublisher.t.sol
└── lib/
    └── (forge dependencies)
```

For MVP, do NOT deploy custom smart contracts for the judge system. Instead, interact directly with the deployed ERC-8004 registries on Sepolia:

- **IdentityRegistry**: `0x8004A818BFB912233c491871b3d84c89A494BD9e` (Sepolia)
- **ReputationRegistry**: Same deployment pattern — check the erc-8004-contracts repo for exact address

The `IPEReputationPublisher.sol` is optional for v1. A Convex Node.js action calling viem directly against the deployed registries is sufficient and simpler.

## Scalability Considerations

| Concern | At 10 proposals | At 100 proposals | At 1K proposals |
|---------|-----------------|-------------------|-----------------|
| OpenAI rate limits | No issue | May hit RPM limits — add retry with backoff in action | Use Convex workpool component for queue management |
| Convex scheduler | No issue (40 scheduled functions) | No issue (400 functions) | Approach 1000/function limit — batch scheduling |
| On-chain gas | Negligible on Sepolia | Negligible on Sepolia | Consider batching feedback calls or switching to Base Sepolia for lower costs |
| Real-time subscriptions | Instant | Fast | May need pagination on proposal list queries |
| Evaluation cost | ~$0.10-0.40/proposal (4x GPT-4o calls) | ~$10-40 | ~$100-400 — consider GPT-4o-mini for non-critical dimensions |

## Build Order (Dependencies)

The recommended build order reflects technical dependencies between components:

```
Phase 1: Foundation
  ├── Convex schema (all tables)
  ├── Proposal mutations + queries
  ├── Proposal form (frontend)
  └── Proposal list (frontend)

Phase 2: AI Evaluation Pipeline
  ├── Prompt/rubric storage + seeding
  ├── evaluateDimension action (OpenAI integration)
  ├── orchestrate mutation (scheduler pattern)
  ├── Completion gate + aggregation
  ├── Evaluation dashboard (frontend)
  └── Before/after prompt comparison (demo)

Phase 3: On-Chain Integration
  ├── viem chain client setup
  ├── ERC-8004 IdentityRegistry interaction
  ├── publishEvaluation action (ReputationRegistry)
  ├── On-chain status tracking
  └── Chain status UI component

Phase 4: Polish
  ├── Score visualization (radar chart)
  ├── Error handling + retry logic
  ├── Edge cases (partial failures, timeouts)
  └── Demo flow optimization
```

**Dependency rationale:**
- Phase 1 must come first: everything reads/writes proposals
- Phase 2 depends on Phase 1: evaluations reference proposals
- Phase 3 depends on Phase 2: can only publish scores that exist
- Phase 4 can partially overlap with Phase 3

## Sources

- [Convex Actions documentation](https://docs.convex.dev/functions/actions) — action execution model, parallel behavior
- [Convex Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions) — scheduler API, fire-and-forget pattern
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/) — mutation vs action separation
- [Convex Workpool component](https://deepwiki.com/get-convex/workpool) — queue management for scaled execution
- [Convex AI Agents](https://docs.convex.dev/agents) — Convex agent framework patterns
- [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004) — IdentityRegistry, ReputationRegistry interfaces
- [ERC-8004 contracts repo](https://github.com/erc-8004/erc-8004-contracts) — deployed addresses, ABIs
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) — zodResponseFormat pattern
- [Viem documentation](https://viem.sh/) — TypeScript Ethereum client
- [Convex opinionated guidelines](https://gist.github.com/srizvi/966e583693271d874bf65c2a95466339) — domain-driven server structure
- ARWF reference architecture (`docs/big-reference-architecture/`) — judge pipeline, scoring engine, blockchain service patterns
