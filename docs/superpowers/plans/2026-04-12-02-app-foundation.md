# App Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js app with SQLite database, IPFS client, chain client, and shared schemas — the foundation all other plans build on.

**Architecture:** Next.js 15 App Router with Drizzle ORM + SQLite (Turso), Pinata IPFS client, viem chain client for Base Sepolia. Zod schemas shared between AI structured output and database validation.

**Tech Stack:** Next.js 15, TypeScript strict, Bun, Tailwind CSS 4, shadcn/ui, Drizzle ORM, Turso (SQLite), Pinata SDK, viem, Zod.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   └── grants/
│       └── page.tsx              # Placeholder landing
├── lib/
│   ├── judges/
│   │   ├── schemas.ts            # Zod schemas for judge output
│   │   ├── prompts.ts            # System prompts per dimension
│   │   └── weights.ts            # Dimension weight constants
│   ├── chain/
│   │   ├── config.ts             # Base Sepolia chain config
│   │   └── contracts.ts          # viem contract instances + ABIs
│   ├── ipfs/
│   │   └── client.ts             # Pinata upload/fetch
│   ├── db/
│   │   ├── client.ts             # Drizzle + Turso client
│   │   └── schema.ts             # Database schema
│   └── constants.ts              # Categories, scoring bands
├── types/
│   └── index.ts                  # Shared TypeScript types
package.json
tsconfig.json
next.config.ts
tailwind.config.ts
drizzle.config.ts
.env.local
```

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js with Bun**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-bun
```

If prompted about overwriting existing files, select yes (we only have docs and contracts).

- [ ] **Step 2: Verify the app builds and runs**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun run build
```

Expected: Build succeeds.

- [ ] **Step 3: Initialize shadcn/ui**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bunx shadcn@latest init -d
```

- [ ] **Step 4: Add core shadcn components**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bunx shadcn@latest add button card badge input textarea select label separator
```

- [ ] **Step 5: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add -A
git commit -m "feat: scaffold Next.js app with Tailwind + shadcn/ui"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install all project dependencies**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer

# AI SDK
bun add ai @ai-sdk/openai

# Database
bun add drizzle-orm @libsql/client
bun add -d drizzle-kit

# IPFS
bun add pinata

# Chain
bun add viem

# Validation
bun add zod
```

- [ ] **Step 2: Verify dependencies installed**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun run build
```

Expected: Build succeeds with all new dependencies.

- [ ] **Step 3: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add package.json bun.lock
git commit -m "feat: add AI SDK, Drizzle, Pinata, viem, Zod dependencies"
```

---

### Task 3: Environment Config + Constants

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create environment template**

Create `.env.example`:

```bash
# AI
OPENAI_API_KEY=sk-...

# Database (Turso)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=...

# IPFS (Pinata)
PINATA_JWT=...
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Chain (Base Sepolia)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...
IDENTITY_REGISTRY_ADDRESS=0x...
REPUTATION_REGISTRY_ADDRESS=0x...
MILESTONE_MANAGER_ADDRESS=0x...
```

- [ ] **Step 2: Create .env.local with placeholder values**

Create `.env.local`:

```bash
# AI
OPENAI_API_KEY=sk-placeholder

# Database (Turso) — use file: for local dev
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=

# IPFS (Pinata)
PINATA_JWT=placeholder
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Chain (Base Sepolia)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
IDENTITY_REGISTRY_ADDRESS=0x0000000000000000000000000000000000000000
REPUTATION_REGISTRY_ADDRESS=0x0000000000000000000000000000000000000000
MILESTONE_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000
```

- [ ] **Step 3: Create constants**

Create `src/lib/constants.ts`:

```typescript
export const JUDGE_DIMENSIONS = ["tech", "impact", "cost", "team"] as const;
export type JudgeDimension = (typeof JUDGE_DIMENSIONS)[number];

export const DIMENSION_WEIGHTS: Record<JudgeDimension, number> = {
  tech: 0.25,
  impact: 0.30,
  cost: 0.20,
  team: 0.25,
} as const;

export const DIMENSION_LABELS: Record<JudgeDimension, string> = {
  tech: "Technical Feasibility",
  impact: "Impact Potential",
  cost: "Cost Efficiency",
  team: "Team Capability",
} as const;

export const PROPOSAL_CATEGORIES = [
  "infrastructure",
  "research",
  "community",
  "education",
  "creative",
] as const;
export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number];

export const RESIDENCY_DURATIONS = ["3-weeks", "4-weeks", "5-weeks"] as const;
export type ResidencyDuration = (typeof RESIDENCY_DURATIONS)[number];

export const SCORING_BANDS = {
  exceptional: { min: 8000, label: "Exceptional" },
  strong: { min: 6500, label: "Strong" },
  adequate: { min: 5000, label: "Adequate" },
  weak: { min: 3000, label: "Weak" },
  insufficient: { min: 0, label: "Insufficient" },
} as const;

export const RECOMMENDATION_OPTIONS = [
  "strong_fund",
  "fund",
  "conditional",
  "reject",
] as const;
export type Recommendation = (typeof RECOMMENDATION_OPTIONS)[number];
```

- [ ] **Step 4: Verify .env.local is in .gitignore**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
grep -q ".env.local" .gitignore || echo ".env.local" >> .gitignore
grep -q "local.db" .gitignore || echo "local.db" >> .gitignore
```

- [ ] **Step 5: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add .env.example src/lib/constants.ts .gitignore
git commit -m "feat: add environment config and domain constants"
```

---

### Task 4: Database Schema + Client

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle schema**

Create `src/lib/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(), // UUID
  title: text("title").notNull(),
  description: text("description").notNull(),
  problemStatement: text("problem_statement").notNull(),
  proposedSolution: text("proposed_solution").notNull(),
  teamMembers: text("team_members", { mode: "json" }).notNull().$type<
    Array<{ name: string; role: string }>
  >(),
  budgetAmount: integer("budget_amount").notNull(),
  budgetBreakdown: text("budget_breakdown").notNull(),
  timeline: text("timeline").notNull(),
  category: text("category").notNull(),
  residencyDuration: text("residency_duration").notNull(),
  demoDayDeliverable: text("demo_day_deliverable").notNull(),
  communityContribution: text("community_contribution").notNull(),
  priorIpeParticipation: integer("prior_ipe_participation", { mode: "boolean" }).notNull(),
  links: text("links", { mode: "json" }).notNull().$type<string[]>(),
  status: text("status", {
    enum: ["pending", "evaluating", "evaluated", "publishing", "published", "failed"],
  }).notNull().default("pending"),
  ipfsCid: text("ipfs_cid"),
  chainTokenId: integer("chain_token_id"),
  chainTxHash: text("chain_tx_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const evaluations = sqliteTable("evaluations", {
  id: text("id").primaryKey(), // UUID
  proposalId: text("proposal_id").notNull().references(() => proposals.id),
  dimension: text("dimension", {
    enum: ["tech", "impact", "cost", "team"],
  }).notNull(),
  score: integer("score"), // basis points 0-10000
  scoreDecimals: integer("score_decimals").default(2),
  confidence: text("confidence", {
    enum: ["high", "medium", "low"],
  }),
  recommendation: text("recommendation", {
    enum: ["strong_fund", "fund", "conditional", "reject"],
  }),
  justification: text("justification"),
  keyFindings: text("key_findings", { mode: "json" }).$type<string[]>(),
  risks: text("risks", { mode: "json" }).$type<string[]>(),
  ipeAlignmentTech: integer("ipe_alignment_tech"),
  ipeAlignmentFreedom: integer("ipe_alignment_freedom"),
  ipeAlignmentProgress: integer("ipe_alignment_progress"),
  status: text("status", {
    enum: ["pending", "streaming", "complete", "failed"],
  }).notNull().default("pending"),
  ipfsCid: text("ipfs_cid"),
  feedbackTxHash: text("feedback_tx_hash"),
  model: text("model"),
  promptVersion: text("prompt_version"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const aggregateScores = sqliteTable("aggregate_scores", {
  id: text("id").primaryKey(), // UUID
  proposalId: text("proposal_id").notNull().references(() => proposals.id),
  scoreBps: integer("score_bps").notNull(), // weighted aggregate in basis points
  ipfsCid: text("ipfs_cid"),
  chainTxHash: text("chain_tx_hash"),
  computedAt: integer("computed_at", { mode: "timestamp" }).notNull(),
});
```

- [ ] **Step 2: Create database client**

Create `src/lib/db/client.ts`:

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function createDbClient() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return drizzle(client, { schema });
}

// Singleton for server-side usage
let dbInstance: ReturnType<typeof createDbClient> | undefined;

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDbClient();
  }
  return dbInstance;
}
```

- [ ] **Step 3: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

- [ ] **Step 4: Generate and run initial migration**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bunx drizzle-kit generate
bunx drizzle-kit push
```

Expected: Migration generated and applied to local.db.

- [ ] **Step 5: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/lib/db/ drizzle.config.ts
git commit -m "feat: add SQLite database schema and Drizzle client"
```

---

### Task 5: Zod Schemas (Judge Output + Proposal Input)

**Files:**
- Create: `src/lib/judges/schemas.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: Create judge evaluation Zod schema**

Create `src/lib/judges/schemas.ts`:

```typescript
import { z } from "zod";

export const IpeAlignmentSchema = z.object({
  proTechnology: z.number().min(0).max(100),
  proFreedom: z.number().min(0).max(100),
  proHumanProgress: z.number().min(0).max(100),
});

export const JudgeEvaluationSchema = z.object({
  score: z.number().min(0).max(10000),
  scoreDecimals: z.literal(2),
  confidence: z.enum(["high", "medium", "low"]),
  recommendation: z.enum(["strong_fund", "fund", "conditional", "reject"]),
  justification: z.string().max(2000),
  keyFindings: z.array(z.string()).max(3),
  risks: z.array(z.string()).max(3),
  ipeAlignment: IpeAlignmentSchema,
});

export type JudgeEvaluation = z.infer<typeof JudgeEvaluationSchema>;
export type IpeAlignment = z.infer<typeof IpeAlignmentSchema>;
```

- [ ] **Step 2: Create proposal input schema**

Create `src/types/index.ts`:

```typescript
import { z } from "zod";
import { PROPOSAL_CATEGORIES, RESIDENCY_DURATIONS } from "@/lib/constants";

export const TeamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
});

export const ProposalInputSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(5000),
  problemStatement: z.string().min(20).max(2000),
  proposedSolution: z.string().min(20).max(3000),
  teamMembers: z.array(TeamMemberSchema).min(1).max(10),
  budgetAmount: z.number().min(100).max(1_000_000),
  budgetBreakdown: z.string().min(20).max(2000),
  timeline: z.string().min(10).max(1000),
  category: z.enum(PROPOSAL_CATEGORIES),
  residencyDuration: z.enum(RESIDENCY_DURATIONS),
  demoDayDeliverable: z.string().min(10).max(1000),
  communityContribution: z.string().min(10).max(1000),
  priorIpeParticipation: z.boolean(),
  links: z.array(z.string().url()).max(5),
});

export type ProposalInput = z.infer<typeof ProposalInputSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/lib/judges/schemas.ts src/types/index.ts
git commit -m "feat: add Zod schemas for judge output and proposal input"
```

---

### Task 6: IPFS Client

**Files:**
- Create: `src/lib/ipfs/client.ts`

- [ ] **Step 1: Create Pinata IPFS client**

Create `src/lib/ipfs/client.ts`:

```typescript
import { PinataSDK } from "pinata";

function createPinataClient() {
  return new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY_URL,
  });
}

let pinataInstance: PinataSDK | undefined;

function getPinata(): PinataSDK {
  if (!pinataInstance) {
    pinataInstance = createPinataClient();
  }
  return pinataInstance;
}

export async function uploadJson(
  data: Record<string, unknown>,
  name: string
): Promise<{ cid: string; uri: string }> {
  const pinata = getPinata();
  const result = await pinata.upload.json(data).addMetadata({ name });
  const gateway = process.env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";
  return {
    cid: result.IpfsHash,
    uri: `${gateway}/ipfs/${result.IpfsHash}`,
  };
}

export async function fetchJson<T>(cid: string): Promise<T> {
  const pinata = getPinata();
  const response = await pinata.gateways.get(cid);
  return response.data as T;
}

export function ipfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

export function gatewayUrl(cid: string): string {
  const gateway = process.env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";
  return `${gateway}/ipfs/${cid}`;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/lib/ipfs/client.ts
git commit -m "feat: add Pinata IPFS client for content storage"
```

---

### Task 7: Chain Client + Contract ABIs

**Files:**
- Create: `src/lib/chain/config.ts`
- Create: `src/lib/chain/contracts.ts`

- [ ] **Step 1: Create chain config**

Create `src/lib/chain/config.ts`:

```typescript
import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });
}

export function getWalletClient() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });
}
```

- [ ] **Step 2: Create contract instances with ABIs**

Create `src/lib/chain/contracts.ts`:

```typescript
import { getAddress } from "viem";

// Minimal ABIs — only the functions we call from the app.
// Full ABIs generated by Foundry in contracts/out/.

export const IDENTITY_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "agentURI", type: "string" },
      {
        name: "metadata",
        type: "tuple[]",
        components: [
          { name: "metadataKey", type: "string" },
          { name: "metadataValue", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "register",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "giveFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getSummary",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "NewFeedback",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "clientAddress", type: "address", indexed: true },
      { name: "feedbackIndex", type: "uint64", indexed: false },
      { name: "value", type: "int128", indexed: false },
      { name: "valueDecimals", type: "uint8", indexed: false },
      { name: "indexedTag1", type: "string", indexed: true },
      { name: "tag1", type: "string", indexed: false },
      { name: "tag2", type: "string", indexed: false },
      { name: "endpoint", type: "string", indexed: false },
      { name: "feedbackURI", type: "string", indexed: false },
      { name: "feedbackHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export function getContractAddresses() {
  return {
    identityRegistry: getAddress(
      process.env.IDENTITY_REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
    ),
    reputationRegistry: getAddress(
      process.env.REPUTATION_REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
    ),
    milestoneManager: getAddress(
      process.env.MILESTONE_MANAGER_ADDRESS ?? "0x0000000000000000000000000000000000000000"
    ),
  };
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/lib/chain/
git commit -m "feat: add viem chain client and contract ABIs for Base Sepolia"
```

---

### Task 8: Judge System Prompts + Weights

**Files:**
- Create: `src/lib/judges/prompts.ts`
- Create: `src/lib/judges/weights.ts`

- [ ] **Step 1: Create dimension weight constants**

Create `src/lib/judges/weights.ts`:

```typescript
import type { JudgeDimension } from "@/lib/constants";

export const DIMENSION_WEIGHTS: Record<JudgeDimension, number> = {
  tech: 0.25,
  impact: 0.30,
  cost: 0.20,
  team: 0.25,
};

export function computeAggregateScore(
  scores: Record<JudgeDimension, number>
): number {
  let aggregate = 0;
  for (const [dimension, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    const score = scores[dimension as JudgeDimension];
    if (score === undefined) {
      throw new Error(`Missing score for dimension: ${dimension}`);
    }
    aggregate += score * weight;
  }
  return Math.round(aggregate);
}
```

- [ ] **Step 2: Create judge system prompts**

Create `src/lib/judges/prompts.ts`:

```typescript
import type { JudgeDimension } from "@/lib/constants";

const SHARED_PREAMBLE = `You are an AI Judge for IPE City grants — a startup society focused on pro-technology innovation, pro-freedom, and pro-human progress. You evaluate grant proposals submitted by Architects (builders who participate in IPE Village, month-long pop-up cities in Florianópolis, Brazil).

EVALUATION RULES — THESE ARE NON-NEGOTIABLE:
1. You MUST cite specific evidence from the proposal for every score you assign.
2. You MUST NOT invent evidence or infer capabilities not explicitly stated in the proposal.
3. You MUST NOT reference other judges' evaluations. You evaluate independently.
4. Your score MUST use calibration anchors:
   - 8000-10000: Exceptional — clear, specific evidence of excellence
   - 6500-7999: Strong — solid evidence with minor gaps
   - 5000-6499: Adequate — meets basic requirements, some concerns
   - 3000-4999: Weak — significant gaps, unclear evidence
   - 0-2999: Insufficient — critical missing elements

ANTI-RATIONALIZATION RED FLAGS — if you catch yourself thinking any of these, STOP:
- "The proposal implies..." → NO. Only score what is explicitly stated.
- "It's reasonable to assume..." → NO. Assumptions are not evidence.
- "Given the team's background..." → NO, unless background is stated in the proposal.
- "This is a strong team because..." → Cite specific credentials from the proposal.
- "The budget seems reasonable" → Compare to specific line items.

Output your evaluation as structured JSON matching the schema exactly.`;

const DIMENSION_PROMPTS: Record<JudgeDimension, string> = {
  tech: `${SHARED_PREAMBLE}

You are the TECHNICAL FEASIBILITY judge (weight: 25% of aggregate score).

Evaluate:
- Architecture soundness: Is the proposed technical approach viable?
- Tech stack appropriateness: Are the chosen technologies suitable for the problem?
- Implementation plan: Is there a credible path from idea to working product?
- Scalability considerations: Can this grow beyond the initial scope?
- Technical innovation: Does this push boundaries or use novel approaches?

IPE City lens (pro-technology): Does this project advance technological innovation? Does it explore cutting-edge approaches? Does it create tools or infrastructure others can build on?`,

  impact: `${SHARED_PREAMBLE}

You are the IMPACT POTENTIAL judge (weight: 30% of aggregate score — highest weight).

Evaluate:
- Problem significance: How important is the problem being addressed?
- Beneficiary scope: How many people benefit, and how directly?
- Measurable outcomes: Are there concrete, verifiable deliverables?
- Long-term value: Does this create lasting value beyond the grant period?
- IPE ecosystem contribution: Does this strengthen the IPE City community?

IPE City lens (pro-human-progress): Does this meaningfully improve human lives? Does it create public goods? Does it advance knowledge, access, or capability for the broader community?`,

  cost: `${SHARED_PREAMBLE}

You are the COST EFFICIENCY judge (weight: 20% of aggregate score).

Evaluate:
- Budget justification: Is every line item justified with clear reasoning?
- Resource allocation: Are funds distributed sensibly across project phases?
- Cost-to-impact ratio: Is the expected impact proportional to the requested funding?
- Timeline realism: Is the proposed timeline achievable with the stated resources?
- Efficiency signals: Does the team show awareness of resource constraints?

IPE City lens: Community funds are scarce. Is this proposal lean and accountable? Does it maximize output per dollar? Are there unnecessary expenses?`,

  team: `${SHARED_PREAMBLE}

You are the TEAM CAPABILITY judge (weight: 25% of aggregate score).

Evaluate:
- Relevant experience: Does the team have demonstrated skills for this project?
- Team composition: Are the right roles covered (technical, design, community)?
- Track record: Has this team shipped before? Evidence of execution ability?
- IPE Village participation: Is the team committed to the residency program?
- Community contribution plan: How will they give back to the village?

IPE City lens (pro-freedom): Are these builders who ship, not just planners? Do they embody the builder ethos of IPE City? Will their presence strengthen the village community?`,
};

export function getJudgePrompt(dimension: JudgeDimension): string {
  return DIMENSION_PROMPTS[dimension];
}

export function buildProposalContext(proposal: {
  title: string;
  description: string;
  problemStatement: string;
  proposedSolution: string;
  teamMembers: Array<{ name: string; role: string }>;
  budgetAmount: number;
  budgetBreakdown: string;
  timeline: string;
  category: string;
  residencyDuration: string;
  demoDayDeliverable: string;
  communityContribution: string;
  priorIpeParticipation: boolean;
  links: string[];
}): string {
  return `# Grant Proposal: ${proposal.title}

## Category
${proposal.category}

## Description
${proposal.description}

## Problem Statement
${proposal.problemStatement}

## Proposed Solution
${proposal.proposedSolution}

## Team
${proposal.teamMembers.map((m) => `- ${m.name}: ${m.role}`).join("\n")}

## Budget
Amount requested: $${proposal.budgetAmount.toLocaleString()} USDC

Breakdown:
${proposal.budgetBreakdown}

## Timeline
${proposal.timeline}

## IPE Village Context
- Residency duration: ${proposal.residencyDuration}
- Demo Day deliverable: ${proposal.demoDayDeliverable}
- Community contribution: ${proposal.communityContribution}
- Prior IPE participation: ${proposal.priorIpeParticipation ? "Yes (returning Architect)" : "No (first time)"}

## Links
${proposal.links.map((l) => `- ${l}`).join("\n") || "None provided"}`;
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/lib/judges/
git commit -m "feat: add judge system prompts and weighted scoring"
```

---

## Summary

| Task | What | Builds on |
|------|------|-----------|
| 1 | Scaffold Next.js + shadcn/ui | Nothing |
| 2 | Install all dependencies | Task 1 |
| 3 | Environment config + constants | Task 1 |
| 4 | SQLite schema + Drizzle client | Task 2 |
| 5 | Zod schemas (judge + proposal) | Task 3 |
| 6 | IPFS client (Pinata) | Task 2 |
| 7 | Chain client + contract ABIs | Task 2 |
| 8 | Judge prompts + weights | Task 5 |

**Foundation complete after this plan. Plans 3 (Judge Pipeline) and 4 (UI) build on top.**
