import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { proposals, aggregateScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkAndFinalizeEvaluation } from "@/lib/evaluation/orchestrator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  // If the workflow already completed aggregation, proceed to on-chain publish
  const aggregate = await db.query.aggregateScores.findFirst({
    where: eq(aggregateScores.proposalId, id),
  });

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Already published — return idempotent success
  if (proposal.status === "published") {
    return NextResponse.json({
      status: "published",
      aggregateScore: aggregate?.scoreBps,
    });
  }

  // Workflow completed aggregation but hasn't published on-chain yet —
  // delegate to the existing orchestrator which handles chain publishing
  if (aggregate && proposal.status === "evaluated") {
    try {
      const result = await checkAndFinalizeEvaluation(id);
      if (result.complete) {
        return NextResponse.json({
          status: "published",
          aggregateScore: result.aggregateScore,
        });
      }
      return NextResponse.json({ status: "publishing" }, { status: 202 });
    } catch {
      return NextResponse.json({ status: "failed" }, { status: 500 });
    }
  }

  // Workflow still running or failed
  if (proposal.status === "failed") {
    return NextResponse.json({ status: "failed" }, { status: 500 });
  }

  return NextResponse.json(
    { status: proposal.status ?? "unknown" },
    { status: 202 }
  );
}
