import { NextResponse, type NextRequest } from "next/server";
import { getProposalById } from "@/cache/queries";
import { sanitizeDisplayText } from "@/lib/sanitize-html";
import { getExplorerBaseUrl, buildIpfsUrl } from "@/lib/chain-explorer";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposal = await getProposalById(id);

  if (!proposal) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Proposal not found" },
      { status: 404 }
    );
  }

  const chainExplorerBase = getExplorerBaseUrl();

  return NextResponse.json({
    id: proposal.id,
    title: sanitizeDisplayText(proposal.title),
    description: sanitizeDisplayText(proposal.description),
    category: proposal.category,
    budgetAmount: proposal.budgetAmount,
    budgetCurrency: proposal.budgetCurrency,
    status: proposal.status,
    proposalContentCid: proposal.proposalContentCid,
    evaluationContentCid: proposal.evaluationContentCid,
    evaluation: proposal.dimensions.length > 0
      ? {
          finalScore: proposal.finalScore,
          reputationMultiplier: proposal.reputationMultiplier,
          adjustedScore: proposal.adjustedScore,
          evaluatedAt: proposal.evaluatedAt,
          dimensions: proposal.dimensions.map((dim) => ({
            dimension: dim.dimension,
            weight: dim.weight,
            score: dim.score,
            rubricApplied: JSON.parse(dim.rubricApplied),
            reasoningChain: sanitizeDisplayText(dim.reasoningChain),
            inputDataConsidered: JSON.parse(dim.inputDataConsidered),
          })),
        }
      : null,
    verification: {
      chainExplorerBase,
      onChainId: id,
      ipfsProposalUrl: proposal.proposalContentCid
        ? buildIpfsUrl(proposal.proposalContentCid)
        : null,
      ipfsEvaluationUrl: proposal.evaluationContentCid
        ? buildIpfsUrl(proposal.evaluationContentCid)
        : null,
    },
    source: "cache",
  });
}
