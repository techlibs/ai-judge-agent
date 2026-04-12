# Judge Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the streaming AI evaluation pipeline — 4 parallel judges stream structured output to the browser, results persist to SQLite + IPFS, scores publish on-chain via ERC-8004 giveFeedback.

**Architecture:** Next.js Route Handlers use Vercel AI SDK `streamObject` to fire 4 parallel OpenAI calls. Each judge streams a Zod-typed evaluation. On completion, results save to SQLite, upload to IPFS, and publish on-chain. Client uses `useObject` for real-time partial rendering.

**Tech Stack:** Vercel AI SDK (`ai`, `@ai-sdk/openai`), Zod, Drizzle ORM, Pinata, viem.

---

## File Structure

```
src/
├── app/api/
│   ├── proposals/
│   │   └── route.ts                    # POST: create proposal
│   └── evaluate/
│       └── [id]/
│           ├── route.ts                # POST: trigger evaluation
│           ├── status/
│           │   └── route.ts            # GET: poll evaluation status
│           └── [dimension]/
│               ├── route.ts            # GET: stream single judge
│               └── retry/
│                   └── route.ts        # POST: retry failed judge
├── lib/
│   ├── evaluation/
│   │   ├── orchestrator.ts             # Coordinates 4 judges + chain publish
│   │   ├── publish-chain.ts            # On-chain publishing logic
│   │   └── aggregate.ts               # S0 computation + IPFS upload
```

---

### Task 1: Proposal Creation API

**Files:**
- Create: `src/app/api/proposals/route.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/api/proposals.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { ProposalInputSchema } from "@/types";

describe("ProposalInputSchema", () => {
  it("validates a complete proposal", () => {
    const input = {
      title: "Decentralized Identity for IPE Village",
      description: "A system that enables Architects to maintain portable digital identity across IPE Village sessions, preserving reputation and contribution history.",
      problemStatement: "Each IPE Village session starts fresh with no memory of past contributions.",
      proposedSolution: "Build an ERC-8004 compatible identity system that tracks Architect contributions.",
      teamMembers: [{ name: "Alice", role: "Lead Developer" }],
      budgetAmount: 5000,
      budgetBreakdown: "Development: $3000, Infrastructure: $1000, Testing: $1000",
      timeline: "4 weeks — Week 1-2: Core identity, Week 3: Integration, Week 4: Testing",
      category: "infrastructure" as const,
      residencyDuration: "4-weeks" as const,
      demoDayDeliverable: "Working identity portal with QR code check-in",
      communityContribution: "Weekly workshop on decentralized identity for other Architects",
      priorIpeParticipation: false,
      links: ["https://github.com/alice/ipe-identity"],
    };

    const result = ProposalInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects proposal with title too short", () => {
    const input = {
      title: "Hi",
      description: "A".repeat(50),
      problemStatement: "A".repeat(20),
      proposedSolution: "A".repeat(20),
      teamMembers: [{ name: "Alice", role: "Dev" }],
      budgetAmount: 5000,
      budgetBreakdown: "A".repeat(20),
      timeline: "A".repeat(10),
      category: "infrastructure" as const,
      residencyDuration: "4-weeks" as const,
      demoDayDeliverable: "A".repeat(10),
      communityContribution: "A".repeat(10),
      priorIpeParticipation: false,
      links: [],
    };

    const result = ProposalInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects proposal with no team members", () => {
    const input = {
      title: "Valid Title Here",
      description: "A".repeat(50),
      problemStatement: "A".repeat(20),
      proposedSolution: "A".repeat(20),
      teamMembers: [],
      budgetAmount: 5000,
      budgetBreakdown: "A".repeat(20),
      timeline: "A".repeat(10),
      category: "infrastructure" as const,
      residencyDuration: "4-weeks" as const,
      demoDayDeliverable: "A".repeat(10),
      communityContribution: "A".repeat(10),
      priorIpeParticipation: false,
      links: [],
    };

    const result = ProposalInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun test src/__tests__/api/proposals.test.ts
```

Expected: Tests pass (schema already exists from Plan 2).

- [ ] **Step 3: Implement proposal creation route**

Create `src/app/api/proposals/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { proposals } from "@/lib/db/schema";
import { ProposalInputSchema } from "@/types";
import { uploadJson, ipfsUri } from "@/lib/ipfs/client";
import { proposalSubmitLimiter } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security-log";

// F-003: Body size limit
const MAX_BODY_SIZE = 256 * 1024; // 256 KB

export async function POST(request: Request) {
  // F-003: Reject oversized payloads
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  // F-002: Rate limiting
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { success, reset } = await proposalSubmitLimiter.limit(ip);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    logSecurityEvent({ type: "rate_limited", ip, endpoint: "/api/proposals", limit: "5/h" });
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // F-020: Origin header validation (CSRF protection)
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!origin || origin !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = ProposalInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid proposal", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const proposal = parsed.data;
  const id = crypto.randomUUID();
  const now = new Date();

  // F-025: PII scan before IPFS upload
  const PII_PATTERNS = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i,  // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,                        // US phone
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,                        // BR CPF
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,              // IP address
  ];
  const textToScan = [proposal.title, proposal.description, proposal.problemStatement, proposal.proposedSolution].join(" ");
  const piiFound = PII_PATTERNS.filter(p => p.test(textToScan)).map(p => p.source);
  if (piiFound.length > 0) {
    logSecurityEvent({ type: "pii_detected", proposalId: id, patterns: piiFound });
    return NextResponse.json({ error: "PII_DETECTED", message: "Remove personal information before submitting" }, { status: 422 });
  }

  // Upload proposal to IPFS
  const ipfsResult = await uploadJson(
    {
      type: "https://ipe.city/schemas/proposal-v1",
      ...proposal,
      submittedAt: now.toISOString(),
    },
    `proposal-${id}.json`
  );

  // Save to SQLite cache
  const db = getDb();
  await db.insert(proposals).values({
    id,
    ...proposal,
    status: "pending",
    ipfsCid: ipfsResult.cid,
    createdAt: now,
  });

  return NextResponse.json({
    id,
    ipfsCid: ipfsResult.cid,
    ipfsUri: ipfsUri(ipfsResult.cid),
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/app/api/proposals/ src/__tests__/
git commit -m "feat: add proposal creation API with IPFS upload"
```

---

### Task 2: Single Judge Streaming Endpoint

**Files:**
- Create: `src/app/api/evaluate/[id]/[dimension]/route.ts`

- [ ] **Step 1: Implement streaming judge endpoint**

Create `src/app/api/evaluate/[id]/[dimension]/route.ts`:

```typescript
import { streamText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { JudgeEvaluationSchema } from "@/lib/judges/schemas";
import { getJudgePrompt, buildProposalContext } from "@/lib/judges/prompts";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations } from "@/lib/db/schema";
import { uploadJson } from "@/lib/ipfs/client";
import { eq, and } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";
import { evaluationTriggerLimiter } from "@/lib/rate-limit";

// F-012: Set max duration for Vercel Fluid Compute
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; dimension: string }> }
) {
  const { id, dimension } = await params;

  // Validate dimension
  if (!JUDGE_DIMENSIONS.includes(dimension as JudgeDimension)) {
    return new Response("Invalid dimension", { status: 400 });
  }
  const dim = dimension as JudgeDimension;

  // F-002: Rate limiting on streaming endpoint
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { success } = await evaluationTriggerLimiter.limit(ip);
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // Fetch proposal
  const db = getDb();
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal) {
    return new Response("Proposal not found", { status: 404 });
  }

  // F-011: Idempotency check — if evaluation already exists, don't create another
  const existingEval = await db.query.evaluations.findFirst({
    where: and(eq(evaluations.proposalId, id), eq(evaluations.dimension, dim)),
  });
  if (existingEval?.status === "complete") {
    return new Response(JSON.stringify(existingEval), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (existingEval?.status === "streaming") {
    return new Response("Evaluation already in progress", { status: 409 });
  }

  // Create evaluation record
  const evalId = crypto.randomUUID();
  await db.insert(evaluations).values({
    id: evalId,
    proposalId: id,
    dimension: dim,
    status: "streaming",
    model: "gpt-4o",
    promptVersion: `judge-${dim}-v1`,
    startedAt: new Date(),
  });

  // F-012: AbortController with 90s hard timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  // Stream judge evaluation (AI SDK v6: streamText + Output.object)
  const result = streamText({
    model: openai("gpt-4o"),
    output: Output.object({ schema: JudgeEvaluationSchema }),
    system: getJudgePrompt(dim),
    prompt: buildProposalContext(proposal),
    abortSignal: controller.signal,
    onFinish: async ({ output }) => {
      clearTimeout(timeout);
      if (!output) {
        await db
          .update(evaluations)
          .set({ status: "failed" })
          .where(eq(evaluations.id, evalId));
        return;
      }

      // Upload to IPFS
      const ipfsResult = await uploadJson(
        {
          type: "https://ipe.city/schemas/judge-evaluation-v1",
          proposalCID: proposal.ipfsCid,
          dimension: dim,
          ...output,
          model: "gpt-4o",
          promptVersion: `judge-${dim}-v1`,
          evaluatedAt: new Date().toISOString(),
        },
        `eval-${dim}-${id}.json`
      );

      // Update SQLite
      await db
        .update(evaluations)
        .set({
          score: output.score,
          scoreDecimals: output.scoreDecimals,
          confidence: output.confidence,
          recommendation: output.recommendation,
          justification: output.justification,
          keyFindings: output.keyFindings,
          risks: output.risks,
          ipeAlignmentTech: output.ipeAlignment.proTechnology,
          ipeAlignmentFreedom: output.ipeAlignment.proFreedom,
          ipeAlignmentProgress: output.ipeAlignment.proHumanProgress,
          status: "complete",
          ipfsCid: ipfsResult.cid,
          completedAt: new Date(),
        })
        .where(eq(evaluations.id, evalId));
    },
  });

  return result.toTextStreamResponse();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/app/api/evaluate/
git commit -m "feat: add streaming judge evaluation endpoint (AI SDK streamObject)"
```

---

### Task 3: Evaluation Orchestrator

**Files:**
- Create: `src/app/api/evaluate/[id]/route.ts`
- Create: `src/lib/evaluation/orchestrator.ts`

- [ ] **Step 1: Create orchestrator logic**

Create `src/lib/evaluation/orchestrator.ts`:

```typescript
import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";
import { computeAggregateScore } from "@/lib/judges/weights";
import { uploadJson } from "@/lib/ipfs/client";
import { publishEvaluationOnChain } from "@/lib/evaluation/publish-chain";

export async function checkAndFinalizeEvaluation(proposalId: string): Promise<{
  complete: boolean;
  aggregateScore?: number;
}> {
  const db = getDb();

  // Check if all 4 dimensions are complete
  const evals = await db.query.evaluations.findMany({
    where: eq(evaluations.proposalId, proposalId),
  });

  const completeEvals = evals.filter((e) => e.status === "complete");
  const failedEvals = evals.filter((e) => e.status === "failed");

  if (completeEvals.length < JUDGE_DIMENSIONS.length) {
    return {
      complete: false,
    };
  }

  // F-011: Idempotency — check if aggregate already exists
  const existingAggregate = await db.query.aggregateScores.findFirst({
    where: eq(aggregateScores.proposalId, proposalId),
  });
  if (existingAggregate) {
    return { complete: true, aggregateScore: existingAggregate.scoreBps };
  }

  // Compute aggregate S0
  const scores: Record<string, number> = {};
  for (const evaluation of completeEvals) {
    if (evaluation.score !== null) {
      scores[evaluation.dimension] = evaluation.score;
    }
  }

  // F-010: Score anomaly detection
  const ANOMALY_THRESHOLDS = {
    ALL_MAX: 9500,
    ALL_MIN: 500,
    MAX_DIVERGENCE: 5000,
  };
  const scoreValues = Object.values(scores);
  const anomalyFlags: string[] = [];
  if (scoreValues.every(s => s >= ANOMALY_THRESHOLDS.ALL_MAX)) {
    anomalyFlags.push("ALL_SCORES_SUSPICIOUSLY_HIGH");
  }
  if (scoreValues.every(s => s <= ANOMALY_THRESHOLDS.ALL_MIN)) {
    anomalyFlags.push("ALL_SCORES_SUSPICIOUSLY_LOW");
  }
  const scoreRange = Math.max(...scoreValues) - Math.min(...scoreValues);
  if (scoreRange > ANOMALY_THRESHOLDS.MAX_DIVERGENCE) {
    anomalyFlags.push("EXTREME_SCORE_DIVERGENCE");
  }
  if (anomalyFlags.length > 0) {
    logSecurityEvent({ type: "score_anomaly", proposalId, flags: anomalyFlags });
  }

  const aggregateBps = computeAggregateScore(
    scores as Record<JudgeDimension, number>
  );

  // Upload aggregate to IPFS
  const aggregateData = {
    type: "https://ipe.city/schemas/aggregate-evaluation-v1",
    proposalId,
    aggregateScoreBps: aggregateBps,
    dimensions: completeEvals.map((e) => ({
      dimension: e.dimension,
      score: e.score,
      ipfsCid: e.ipfsCid,
    })),
    computedAt: new Date().toISOString(),
  };

  const ipfsResult = await uploadJson(
    aggregateData,
    `aggregate-${proposalId}.json`
  );

  // Save aggregate score
  await db.insert(aggregateScores).values({
    id: crypto.randomUUID(),
    proposalId,
    scoreBps: aggregateBps,
    ipfsCid: ipfsResult.cid,
    computedAt: new Date(),
  });

  // Update proposal status
  await db
    .update(proposals)
    .set({ status: "publishing" })
    .where(eq(proposals.id, proposalId));

  // Publish on-chain
  try {
    const txHash = await publishEvaluationOnChain({
      proposalId,
      proposalIpfsCid: (await db.query.proposals.findFirst({
        where: eq(proposals.id, proposalId),
      }))?.ipfsCid ?? "",
      evaluations: completeEvals.map((e) => ({
        dimension: e.dimension as JudgeDimension,
        score: e.score ?? 0,
        ipfsCid: e.ipfsCid ?? "",
      })),
      aggregateIpfsCid: ipfsResult.cid,
    });

    // Update with chain tx hash
    await db
      .update(proposals)
      .set({ status: "published", chainTxHash: txHash })
      .where(eq(proposals.id, proposalId));

    return { complete: true, aggregateScore: aggregateBps };
  } catch (error) {
    await db
      .update(proposals)
      .set({ status: "failed" })
      .where(eq(proposals.id, proposalId));
    throw error;
  }
}
```

- [ ] **Step 2: Create trigger evaluation route**

Create `src/app/api/evaluate/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { proposals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { evaluationTriggerLimiter, globalEvaluationLimiter } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security-log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // F-002: Rate limiting (per-IP and global)
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { success: ipSuccess, reset } = await evaluationTriggerLimiter.limit(ip);
  if (!ipSuccess) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    logSecurityEvent({ type: "rate_limited", ip, endpoint: `/api/evaluate/${id}`, limit: "10/h" });
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  const { success: globalSuccess } = await globalEvaluationLimiter.limit("global");
  if (!globalSuccess) {
    return NextResponse.json({ error: "TOO_MANY_EVALUATIONS", message: "System is at capacity. Try again later." }, { status: 503 });
  }

  // F-020: Origin header validation
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!origin || origin !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.status !== "pending") {
    return NextResponse.json(
      { error: "Proposal already being evaluated" },
      { status: 409 }
    );
  }

  // Update status to evaluating
  await db
    .update(proposals)
    .set({ status: "evaluating" })
    .where(eq(proposals.id, id));

  // Return immediately — client will open 4 SSE connections
  return NextResponse.json({
    id,
    status: "evaluating",
    streams: {
      tech: `/api/evaluate/${id}/tech`,
      impact: `/api/evaluate/${id}/impact`,
      cost: `/api/evaluate/${id}/cost`,
      team: `/api/evaluate/${id}/team`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/lib/evaluation/orchestrator.ts src/app/api/evaluate/
git commit -m "feat: add evaluation orchestrator and trigger endpoint"
```

---

### Task 4: Evaluation Status Polling

**Files:**
- Create: `src/app/api/evaluate/[id]/status/route.ts`

- [ ] **Step 1: Implement status endpoint**

Create `src/app/api/evaluate/[id]/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkAndFinalizeEvaluation } from "@/lib/evaluation/orchestrator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const evals = await db.query.evaluations.findMany({
    where: eq(evaluations.proposalId, id),
  });

  const dimensions = Object.fromEntries(
    evals.map((e) => [
      e.dimension,
      {
        status: e.status,
        score: e.score,
        recommendation: e.recommendation,
      },
    ])
  );

  // F-011: GET must be read-only — no write side effects.
  // Finalization is triggered via POST /api/evaluate/[id]/finalize

  const aggregate = await db.query.aggregateScores.findFirst({
    where: eq(aggregateScores.proposalId, id),
  });

  return NextResponse.json({
    status: proposal.status,
    dimensions,
    aggregateScore: aggregate?.scoreBps,
    chainTxHash: proposal.chainTxHash,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/app/api/evaluate/
git commit -m "feat: add evaluation status polling endpoint"
```

---

### Task 4a: Evaluation Finalization Endpoint (F-011)

**Files:**
- Create: `src/app/api/evaluate/[id]/finalize/route.ts`

- [ ] **Step 1: Create POST finalize endpoint**

Create `src/app/api/evaluate/[id]/finalize/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkAndFinalizeEvaluation } from "@/lib/evaluation/orchestrator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await checkAndFinalizeEvaluation(id);
    if (result.complete) {
      return NextResponse.json({ status: "published", aggregateScore: result.aggregateScore });
    }
    return NextResponse.json({ status: "not_ready" }, { status: 202 });
  } catch {
    return NextResponse.json({ status: "failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

---

### Task 5: On-Chain Publishing

**Files:**
- Create: `src/lib/evaluation/publish-chain.ts`

- [ ] **Step 1: Implement on-chain publishing**

Create `src/lib/evaluation/publish-chain.ts`:

```typescript
import { keccak256, toBytes, encodeFunctionData } from "viem";
import { getPublicClient, getWalletClient } from "@/lib/chain/config";
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  getContractAddresses,
} from "@/lib/chain/contracts";
import { ipfsUri } from "@/lib/ipfs/client";
import type { JudgeDimension } from "@/lib/constants";

interface PublishParams {
  proposalId: string;
  proposalIpfsCid: string;
  evaluations: Array<{
    dimension: JudgeDimension;
    score: number;
    ipfsCid: string;
  }>;
  aggregateIpfsCid: string;
}

export async function publishEvaluationOnChain(
  params: PublishParams
): Promise<string> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();
  const addresses = getContractAddresses();

  // 1. Register project identity
  const registerHash = await walletClient.writeContract({
    address: addresses.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [ipfsUri(params.proposalIpfsCid)],
  });

  const registerReceipt = await publicClient.waitForTransactionReceipt({
    hash: registerHash,
  });

  // Extract agentId from Registered event
  const registeredLog = registerReceipt.logs[0];
  // agentId is the first indexed topic (after event signature)
  const agentId = BigInt(registeredLog.topics[1] ?? "0");

  // 2. Publish 4× giveFeedback (one per judge dimension)
  const feedbackHashes: string[] = [];

  for (const evaluation of params.evaluations) {
    const feedbackContent = JSON.stringify({
      dimension: evaluation.dimension,
      score: evaluation.score,
      ipfsCid: evaluation.ipfsCid,
    });
    const contentHash = keccak256(toBytes(feedbackContent));

    const txHash = await walletClient.writeContract({
      address: addresses.reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "giveFeedback",
      args: [
        agentId,
        BigInt(evaluation.score),          // value (int128)
        2,                                  // valueDecimals
        evaluation.dimension,               // tag1
        "judge-v1",                         // tag2
        "",                                 // endpoint
        ipfsUri(evaluation.ipfsCid),        // feedbackURI
        contentHash,                        // feedbackHash
      ],
    });

    feedbackHashes.push(txHash);
  }

  // Wait for all feedback txs
  for (const hash of feedbackHashes) {
    await publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
    });
  }

  // Return the last tx hash as the "published" reference
  return feedbackHashes[feedbackHashes.length - 1] ?? registerHash;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
bun run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/lib/evaluation/publish-chain.ts
git commit -m "feat: add on-chain publishing via ERC-8004 giveFeedback"
```

---

### Task 6: Judge Retry Endpoint

**Files:**
- Create: `src/app/api/evaluate/[id]/[dimension]/retry/route.ts`

- [ ] **Step 1: Implement retry endpoint**

Create `src/app/api/evaluate/[id]/[dimension]/retry/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { evaluations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; dimension: string }> }
) {
  const { id, dimension } = await params;

  if (!JUDGE_DIMENSIONS.includes(dimension as JudgeDimension)) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const db = getDb();

  // Find and delete the failed evaluation
  const existing = await db.query.evaluations.findFirst({
    where: and(
      eq(evaluations.proposalId, id),
      eq(evaluations.dimension, dimension as JudgeDimension)
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "No evaluation found" }, { status: 404 });
  }

  if (existing.status !== "failed") {
    return NextResponse.json(
      { error: "Evaluation is not in failed state" },
      { status: 409 }
    );
  }

  // Delete failed evaluation so the stream endpoint creates a fresh one
  await db.delete(evaluations).where(eq(evaluations.id, existing.id));

  return NextResponse.json({
    status: "ready",
    stream: `/api/evaluate/${id}/${dimension}`,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add src/app/api/evaluate/
git commit -m "feat: add judge retry endpoint for failed evaluations"
```

---

## Summary

| Task | What | Depends on |
|------|------|------------|
| 1 | Proposal creation API (validate + SQLite + IPFS) | Plan 2 (foundation) |
| 2 | Single judge streaming endpoint (AI SDK streamObject) | Plan 2 (schemas, prompts) |
| 3 | Evaluation orchestrator (detect completion + aggregate) | Tasks 1-2 |
| 4 | Status polling endpoint | Task 3 |
| 5 | On-chain publishing (IdentityRegistry + ReputationRegistry) | Plan 1 (contracts) |
| 6 | Judge retry endpoint | Task 2 |

**After this plan:** The full evaluation pipeline works end-to-end. Plan 4 (UI) connects the browser to these endpoints.

---

## Security Notes

- **F-042 (Retry Logic):** Wrap chain transaction calls in `withRetry` with exponential backoff: initial 1s, multiplier 2x, max 30s, 5 attempts.
- **F-015 (Monitoring Cron):** When monitoring cron is added, protect with `CRON_SECRET` via Authorization bearer header validation.
