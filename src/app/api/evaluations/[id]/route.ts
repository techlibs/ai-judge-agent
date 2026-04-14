import { type NextRequest, NextResponse } from "next/server";
import { isHex } from "viem";
import { getEvaluation, computeProposalId } from "@/chain/evaluation-registry";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!id || id.length === 0) {
    return NextResponse.json(
      { error: "Missing proposal ID" },
      { status: 400 }
    );
  }

  // Accept either a raw bytes32 hex or a platform:externalId pair
  let proposalIdHex: `0x${string}`;

  if (isHex(id) && id.length === 66) {
    proposalIdHex = id;
  } else {
    proposalIdHex = computeProposalId("web-form", id);
  }

  try {
    const evaluation = await getEvaluation(proposalIdHex);

    return NextResponse.json({
      proposalId: evaluation.proposalId,
      fundingRoundId: evaluation.fundingRoundId,
      finalScore: evaluation.finalScore,
      reputationMultiplier: evaluation.reputationMultiplier,
      adjustedScore: evaluation.adjustedScore,
      timestamp: Number(evaluation.timestamp),
      proposalContentCid: evaluation.proposalContentCid,
      evaluationContentCid: evaluation.evaluationContentCid,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch evaluation";

    // Contract reverts when evaluation doesn't exist
    if (message.includes("revert") || message.includes("call exception")) {
      return NextResponse.json(
        { error: "Evaluation not found", proposalId: proposalIdHex },
        { status: 404 }
      );
    }

    console.error("Evaluation fetch failed:", error);
    return NextResponse.json(
      { error: "Internal error fetching evaluation" },
      { status: 500 }
    );
  }
}
