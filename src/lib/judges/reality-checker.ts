import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import type { MarketContext, CoherenceReport } from "@/lib/colosseum/schemas";
import { coherenceReportSchema } from "@/lib/colosseum/schemas";
import type { JudgeDimension } from "@/lib/constants";

export const realityCheckerAgent = new Agent({
  id: "reality-checker",
  name: "Reality Checker",
  model: openai("gpt-4o"),
  instructions: `You are a post-evaluation quality checker. You compare judge scores against market research data to identify coherence violations.

Flag when:
- Research shows "False gap" (already solved) but Impact Potential scored > 7500 basis points
- Research shows "Full gap" (novel) but Technical Feasibility scored < 3000 basis points
- Research found 10+ competitors but Cost Efficiency scored as if no competition exists
- Research shows "emerging" market but Team scored as if mature domain expertise is needed

You produce a coherence score (0-10000 basis points) and list any flags.
A coherence score below 3000 suggests the evaluation may need human review.

You do NOT override judge scores. You flag potential issues for transparency.

Output valid JSON matching the coherenceReportSchema exactly.`,
});

interface DimensionScore {
  dimension: JudgeDimension;
  score: number;
  confidence: string;
}

export async function performRealityCheck(
  judgeResults: DimensionScore[],
  marketContext: MarketContext | null
): Promise<CoherenceReport | null> {
  if (!marketContext) return null;

  const prompt = `Evaluate the coherence between these judge scores and market research data.

## Judge Scores
${judgeResults
  .map(
    (r) =>
      `- ${r.dimension}: ${(r.score / 100).toFixed(1)}% (confidence: ${r.confidence})`
  )
  .join("\n")}

## Market Research
- Gap type: ${marketContext.impact.gapType}
- Gap rationale: ${marketContext.impact.gapRationale}
- TAM: ${marketContext.impact.tam ?? "unknown"}
- Market maturity: ${marketContext.impact.marketMaturity}
- Similar projects: ${marketContext.technical.similarBuilds.length} found
- Research confidence: ${marketContext.confidence}

Identify any coherence violations and compute an overall coherence score.`;

  try {
    const result = await realityCheckerAgent.generate(prompt, {
      structuredOutput: { schema: coherenceReportSchema },
    });

    if (!result.object) {
      console.warn("[RealityChecker] No structured output produced");
      return null;
    }

    return result.object;
  } catch (error) {
    console.error("[RealityChecker] Failed:", error);
    return null;
  }
}
