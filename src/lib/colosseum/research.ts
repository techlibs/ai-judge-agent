import type { ColosseumResearchResponse } from "./types";

export function buildMarketContextBlock(
  research: ColosseumResearchResponse,
): string {
  const competitors = research.similarProjects
    .map(
      (p) =>
        `- "${p.name}" (${p.hackathon ?? "unknown"}) — ${p.status}. ${p.description}`,
    )
    .join("\n");

  const uncoveredLine = research.gapClassification.uncoveredSegment
    ? `\nUncovered segment: ${research.gapClassification.uncoveredSegment}`
    : "";

  const tamLine = research.estimatedTAM
    ? `Estimated TAM: ${research.estimatedTAM}`
    : "";

  return `## Market Context (from competitive intelligence research)

### Gap Classification: ${research.gapClassification.type.toUpperCase()}
${research.gapClassification.rationale}${uncoveredLine}

### Similar Projects Found: ${research.competitorCount}
${competitors || "No directly similar projects found."}

### Market Maturity: ${research.marketMaturity}
${tamLine}

### Key Insights
${research.keyInsights.map((i) => `- ${i}`).join("\n")}

---
Consider this market context when scoring. It provides evidence about what
exists in the market — use it to ground your assessment in reality.
Do NOT let market context override your independent judgment on the proposal's
merits. Market data informs; it does not dictate scores.`;
}

export function buildDimensionMarketContext(
  research: ColosseumResearchResponse,
  dimension: "technical" | "impact" | "cost" | "team",
): string {
  const base = buildMarketContextBlock(research);

  const dimensionGuidance: Record<string, string> = {
    technical: `\n\n### Technical Landscape Note
Pay special attention to the tech stacks used by similar projects listed above.
Consider whether the proposed approach has been proven or if prior attempts failed.`,

    impact: `\n\n### Impact Assessment Note
The gap classification above is especially relevant to impact scoring.
A FULL gap suggests higher impact potential; a FALSE gap requires the proposal
to demonstrate clear differentiation from existing solutions.`,

    cost: `\n\n### Cost Efficiency Note
Compare the proposed budget against the competitive landscape above.
Consider what similar projects spent to build and whether the proposal's
cost-to-impact ratio is reasonable given market conditions.`,

    team: `\n\n### Team Assessment Note
Consider what backgrounds and skills were present in similar successful projects.
Evaluate whether this team's composition aligns with what has worked in this space.`,
  };

  return base + (dimensionGuidance[dimension] ?? "");
}
