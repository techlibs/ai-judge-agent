import type {
  ColosseumResearchResponse,
  MarketValidationReport,
} from "./types";

const COLOSSEUM_API_VERSION = "v1";

export function buildMarketValidationReport(
  research: ColosseumResearchResponse,
  ipfsCid: string,
): MarketValidationReport {
  const confidence = computeResearchConfidence(research);

  const dataSources: string[] = ["Colosseum Copilot API"];
  if (research.archiveSources) {
    dataSources.push(...research.archiveSources);
  }

  return {
    gapClassification: research.gapClassification.type,
    gapRationale: research.gapClassification.rationale,
    similarProjects: research.similarProjects.map((p) => ({
      name: p.name,
      hackathon: p.hackathon ?? "unknown",
      status: p.status,
      relevance: p.relevance,
      description: p.description,
    })),
    estimatedTAM: research.estimatedTAM,
    marketMaturity: research.marketMaturity,
    competitorCount: research.competitorCount,
    researchConfidence: confidence,
    dataSourcesUsed: dataSources,
    researchedAt: new Date().toISOString(),
    colosseumApiVersion: COLOSSEUM_API_VERSION,
    ipfsCid,
  };
}

function computeResearchConfidence(
  research: ColosseumResearchResponse,
): "high" | "medium" | "low" {
  const projectCount = research.similarProjects.length;
  const hasInsights = research.keyInsights.length > 0;
  const hasArchiveSources =
    research.archiveSources && research.archiveSources.length > 0;

  if (projectCount >= 3 && hasInsights && hasArchiveSources) {
    return "high";
  }

  if (projectCount >= 1 && hasInsights) {
    return "medium";
  }

  return "low";
}
