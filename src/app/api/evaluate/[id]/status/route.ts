import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
