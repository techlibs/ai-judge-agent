import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { evaluations, aggregateScores, proposals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { computeAggregateScore } from "@/lib/judges/weights";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";

const ALLOWED = process.env.NODE_ENV !== "production";

interface SeedRequestBody {
  proposalId?: string;
  createProposal?: boolean;
  scores: Record<JudgeDimension, number>;
}

export async function POST(request: Request) {
  if (!ALLOWED) {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as SeedRequestBody;
  const { scores, createProposal: shouldCreate } = body;
  const db = getDb();
  const now = new Date();

  let proposalId = body.proposalId ?? crypto.randomUUID();

  // Optionally create a stub proposal
  if (shouldCreate) {
    await db.insert(proposals).values({
      id: proposalId,
      title: "Test Proposal for E2E",
      description: "Automatically created proposal for end-to-end testing of the evaluation pipeline.",
      problemStatement: "E2E tests need a proposal to seed evaluations against.",
      proposedSolution: "Create a test-only seed endpoint that generates proposals and evaluations.",
      teamMembers: [{ name: "Test User", role: "Lead" }],
      budgetAmount: 10000,
      budgetBreakdown: "Testing: $10,000",
      timeline: "4 weeks",
      category: "infrastructure",
      residencyDuration: "3-weeks",
      demoDayDeliverable: "Working E2E test suite",
      communityContribution: "Open-source test patterns",
      priorIpeParticipation: false,
      links: [],
      status: "pending",
      ipfsCid: `QmTestProposal${proposalId.slice(0, 8)}`,
      createdAt: now,
    });
  }

  // Create evaluations for all 4 dimensions
  for (const dim of JUDGE_DIMENSIONS) {
    const score = scores[dim];
    await db.insert(evaluations).values({
      id: crypto.randomUUID(),
      proposalId,
      dimension: dim,
      score,
      scoreDecimals: 2,
      confidence: "high",
      recommendation: score >= 7000 ? "fund" : "conditional",
      justification: `Test evaluation for ${dim} dimension.`,
      keyFindings: ["Test finding 1", "Test finding 2"],
      risks: ["Test risk"],
      ipeAlignmentTech: 75,
      ipeAlignmentFreedom: 70,
      ipeAlignmentProgress: 80,
      status: "complete",
      ipfsCid: `QmTest${dim}${proposalId.slice(0, 8)}`,
      model: "test-mock",
      promptVersion: `judge-${dim}-v1`,
      startedAt: now,
      completedAt: now,
    });
  }

  // Compute and store aggregate
  const aggregateBps = computeAggregateScore(scores);
  await db.insert(aggregateScores).values({
    id: crypto.randomUUID(),
    proposalId,
    scoreBps: aggregateBps,
    ipfsCid: `QmTestAggregate${proposalId.slice(0, 8)}`,
    computedAt: now,
  });

  // Update proposal status to published
  await db
    .update(proposals)
    .set({ status: "published" })
    .where(eq(proposals.id, proposalId));

  return NextResponse.json({
    status: "seeded",
    proposalId,
    scores,
    aggregateScore: aggregateBps,
  });
}
