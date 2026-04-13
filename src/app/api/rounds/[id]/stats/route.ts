import { NextResponse, type NextRequest } from "next/server";
import { getFundingRoundStats } from "@/cache/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stats = await getFundingRoundStats(id);

  if (!stats) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Funding round not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    fundingRoundId: stats.fundingRoundId,
    proposalCount: stats.proposalCount,
    evaluatedCount: stats.evaluatedCount,
    averageScore: stats.averageScore,
    totalFundsReleased: stats.totalFundsReleased,
    disputeCount: stats.disputeCount,
    source: "cache (derived)",
  });
}
