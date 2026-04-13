import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { getProposalById, getMarketResearchByProposalId, saveMarketResearch } from "@/cache/queries";
import { performMarketResearch } from "@/evaluation/agents/market-intelligence";
import { pinJsonToIpfs } from "@/ipfs/pin";
import { MarketResearchDocumentSchema, type MarketResearchDocument } from "@/lib/colosseum/schemas";

interface RouteParams {
  readonly params: Promise<{ readonly proposalId: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteParams
) {
  const { proposalId } = await context.params;

  const research = await getMarketResearchByProposalId(proposalId);

  if (!research) {
    return NextResponse.json(
      { error: "No research found for this proposal" },
      { status: 404 }
    );
  }

  const rawResponse: unknown = JSON.parse(research.rawResponse);

  return NextResponse.json({
    researchId: research.id,
    proposalId: research.proposalId,
    gapType: research.gapType,
    competitorCount: research.competitorCount,
    marketMaturity: research.marketMaturity,
    rawResponse,
    ipfsCid: research.ipfsCid,
    researchedAt: research.researchedAt,
    expiresAt: research.expiresAt,
  });
}

export async function POST(
  _request: NextRequest,
  context: RouteParams
) {
  const { proposalId } = await context.params;

  const proposal = await getProposalById(proposalId);
  if (!proposal) {
    return NextResponse.json(
      { error: "Proposal not found" },
      { status: 404 }
    );
  }

  const existing = await getMarketResearchByProposalId(proposalId);
  if (existing) {
    const expiresAt = new Date(existing.expiresAt);
    if (expiresAt > new Date()) {
      const rawResponse: unknown = JSON.parse(existing.rawResponse);
      return NextResponse.json({
        researchId: existing.id,
        status: "cached",
        gapType: existing.gapType,
        competitorCount: existing.competitorCount,
        rawResponse,
        ipfsCid: existing.ipfsCid,
        cachedUntil: existing.expiresAt,
      });
    }
  }

  const sanitizedProposal = {
    title: proposal.title,
    description: proposal.description,
    budgetAmount: proposal.budgetAmount,
    budgetCurrency: proposal.budgetCurrency,
    budgetBreakdown: [],
    technicalDescription: proposal.technicalDescription,
    teamSize: proposal.teamSize,
    teamProfileHash: proposal.teamProfileHash,
    category: proposal.category,
  };

  const researchOutcome = await performMarketResearch(sanitizedProposal);

  if (researchOutcome.status === "failure") {
    return NextResponse.json(
      { error: "Market research failed", reason: researchOutcome.reason },
      { status: 502 }
    );
  }

  const domainHash = createHash("sha256")
    .update(proposal.category)
    .digest("hex")
    .slice(0, 16);

  const researchDocument: MarketResearchDocument = {
    version: "1.0.0",
    proposalId,
    researchedAt: new Date().toISOString(),
    source: "colosseum-copilot",
    apiVersion: "v1",
    gapClassification: researchOutcome.rawResponse.gapClassification,
    similarProjects: researchOutcome.rawResponse.similarProjects,
    competitorCount: researchOutcome.rawResponse.competitorCount,
    marketMaturity: researchOutcome.rawResponse.marketMaturity,
    keyInsights: researchOutcome.rawResponse.keyInsights,
    proposalContentHash: proposal.proposalContentCid ?? "",
  };

  const ipfsCid = await pinJsonToIpfs(
    MarketResearchDocumentSchema,
    researchDocument
  );

  const researchId = crypto.randomUUID();
  await saveMarketResearch({
    id: researchId,
    proposalId,
    domainHash,
    gapType: researchOutcome.rawResponse.gapClassification.type,
    competitorCount: researchOutcome.rawResponse.competitorCount,
    marketMaturity: researchOutcome.rawResponse.marketMaturity,
    rawResponse: JSON.stringify(researchOutcome.rawResponse),
    ipfsCid,
  });

  return NextResponse.json({
    researchId,
    status: "complete",
    gapType: researchOutcome.rawResponse.gapClassification.type,
    competitorCount: researchOutcome.rawResponse.competitorCount,
    similarProjects: researchOutcome.marketContext.similarProjects,
    ipfsCid,
    cachedUntil: new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString(),
  });
}
