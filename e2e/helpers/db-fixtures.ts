/**
 * DB fixture helpers for BDD tests.
 * Seeds proposals, evaluations, and aggregate scores directly into SQLite.
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";

const { proposals, evaluations, aggregateScores } = schema;

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getTestDb() {
  if (!db) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    db = drizzle(client, { schema });
  }
  return db;
}

let counter = 0;
function uid(prefix = "test") {
  counter++;
  return `${prefix}-${Date.now()}-${counter}`;
}

// --- Proposal Defaults ---

const PROPOSAL_DEFAULTS = {
  description: "A test proposal description for BDD testing that meets the minimum length requirement.",
  problemStatement: "A test problem statement for validation.",
  proposedSolution: "A test proposed solution for validation.",
  teamMembers: [{ name: "Test User", role: "Lead" }] as Array<{ name: string; role: string }>,
  budgetAmount: 10000,
  budgetBreakdown: "Development: $5,000. Testing: $3,000. Buffer: $2,000.",
  timeline: "8 weeks from approval.",
  category: "research",
  residencyDuration: "3-weeks",
  demoDayDeliverable: "Working prototype demo.",
  communityContribution: "Open-source code for the community.",
  priorIpeParticipation: false,
  links: [] as string[],
  status: "pending" as const,
};

// --- Public API ---

export interface SeedProposalOptions {
  id?: string;
  title?: string;
  description?: string;
  problemStatement?: string;
  proposedSolution?: string;
  budgetAmount?: number;
  budgetBreakdown?: string;
  timeline?: string;
  category?: string;
  status?: "pending" | "evaluating" | "evaluated" | "publishing" | "published" | "failed";
  ipfsCid?: string;
  chainTokenId?: number;
  chainTxHash?: string;
  createdAt?: Date;
}

export async function seedProposal(opts: SeedProposalOptions = {}) {
  const db = getTestDb();
  const id = opts.id ?? uid("prop");
  const now = opts.createdAt ?? new Date();

  await db.insert(proposals).values({
    id,
    title: opts.title ?? "Test Proposal",
    ...PROPOSAL_DEFAULTS,
    description: opts.description ?? PROPOSAL_DEFAULTS.description,
    problemStatement: opts.problemStatement ?? PROPOSAL_DEFAULTS.problemStatement,
    proposedSolution: opts.proposedSolution ?? PROPOSAL_DEFAULTS.proposedSolution,
    budgetAmount: opts.budgetAmount ?? PROPOSAL_DEFAULTS.budgetAmount,
    budgetBreakdown: opts.budgetBreakdown ?? PROPOSAL_DEFAULTS.budgetBreakdown,
    timeline: opts.timeline ?? PROPOSAL_DEFAULTS.timeline,
    category: opts.category ?? PROPOSAL_DEFAULTS.category,
    status: opts.status ?? PROPOSAL_DEFAULTS.status,
    ipfsCid: opts.ipfsCid ?? null,
    chainTokenId: opts.chainTokenId ?? null,
    chainTxHash: opts.chainTxHash ?? null,
    createdAt: now,
  });

  return id;
}

export interface SeedEvaluationOptions {
  proposalId: string;
  dimension: "tech" | "impact" | "cost" | "team";
  score?: number;
  confidence?: "high" | "medium" | "low";
  recommendation?: "strong_fund" | "fund" | "conditional" | "reject";
  justification?: string;
  keyFindings?: string[];
  risks?: string[];
  status?: "pending" | "streaming" | "complete" | "failed";
  ipfsCid?: string;
  feedbackTxHash?: string;
  model?: string;
  promptVersion?: string;
  ipeAlignmentTech?: number;
  ipeAlignmentFreedom?: number;
  ipeAlignmentProgress?: number;
}

export async function seedEvaluation(opts: SeedEvaluationOptions) {
  const db = getTestDb();
  const id = uid("eval");

  await db.insert(evaluations).values({
    id,
    proposalId: opts.proposalId,
    dimension: opts.dimension,
    score: opts.score ?? null,
    confidence: opts.confidence ?? null,
    recommendation: opts.recommendation ?? null,
    justification: opts.justification ?? null,
    keyFindings: opts.keyFindings ?? null,
    risks: opts.risks ?? null,
    status: opts.status ?? "pending",
    ipfsCid: opts.ipfsCid ?? null,
    feedbackTxHash: opts.feedbackTxHash ?? null,
    model: opts.model ?? null,
    promptVersion: opts.promptVersion ?? null,
    ipeAlignmentTech: opts.ipeAlignmentTech ?? null,
    ipeAlignmentFreedom: opts.ipeAlignmentFreedom ?? null,
    ipeAlignmentProgress: opts.ipeAlignmentProgress ?? null,
    startedAt: new Date(),
    completedAt: opts.status === "complete" ? new Date() : null,
  });

  return id;
}

export interface SeedAggregateOptions {
  proposalId: string;
  scoreBps: number;
  ipfsCid?: string;
  chainTxHash?: string;
}

export async function seedAggregate(opts: SeedAggregateOptions) {
  const db = getTestDb();
  const id = uid("agg");

  await db.insert(aggregateScores).values({
    id,
    proposalId: opts.proposalId,
    scoreBps: opts.scoreBps,
    ipfsCid: opts.ipfsCid ?? null,
    chainTxHash: opts.chainTxHash ?? null,
    computedAt: new Date(),
  });

  return id;
}

/**
 * Seed a fully published proposal with all 4 evaluations + aggregate score.
 */
export async function seedPublishedProposal(opts: {
  title?: string;
  category?: string;
  scores?: { tech: number; impact: number; cost: number; team: number };
} = {}) {
  const scores = opts.scores ?? { tech: 8000, impact: 7500, cost: 6000, team: 8500 };

  const proposalId = await seedProposal({
    title: opts.title ?? "Published Test Proposal",
    category: opts.category ?? "infrastructure",
    status: "published",
    ipfsCid: "QmTestProposalCid123",
    chainTokenId: 42,
    chainTxHash: "0xabc123def456789012345678901234567890abcd",
  });

  const dimensions = ["tech", "impact", "cost", "team"] as const;
  for (const dim of dimensions) {
    await seedEvaluation({
      proposalId,
      dimension: dim,
      score: scores[dim],
      confidence: "high",
      recommendation: "fund",
      justification: `Strong ${dim} assessment for testing.`,
      keyFindings: [`Finding 1 for ${dim}`, `Finding 2 for ${dim}`],
      risks: [`Risk for ${dim}`],
      status: "complete",
      ipfsCid: `QmEval${dim}Cid123`,
      feedbackTxHash: `0x${dim}feedbackhash12345678901234567890abcdef`,
      model: "gpt-4o-2024-08-06",
      promptVersion: `judge-${dim}-v1`,
      ipeAlignmentTech: 80,
      ipeAlignmentFreedom: 75,
      ipeAlignmentProgress: 85,
    });
  }

  const weightedScore = Math.round(
    scores.tech * 0.25 + scores.impact * 0.30 + scores.cost * 0.20 + scores.team * 0.25,
  );

  await seedAggregate({
    proposalId,
    scoreBps: weightedScore,
    ipfsCid: "QmAggregateCid123",
    chainTxHash: "0xaggregatetxhash1234567890abcdef12345678",
  });

  return proposalId;
}

/**
 * Clean up all test data. Call in afterEach/afterAll.
 */
export async function cleanupTestData() {
  const db = getTestDb();
  await db.delete(aggregateScores).where(sql`1=1`);
  await db.delete(evaluations).where(sql`1=1`);
  await db.delete(proposals).where(sql`1=1`);
}
