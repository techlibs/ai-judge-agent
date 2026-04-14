import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  type JudgeVerdict,
  type DeliberationRound,
  DeliberationRoundSchema,
  type Tier,
  TIER_RANGES,
} from "@ipe-city/common";

const TIER_ORDER: Tier[] = ["F", "C", "B", "A", "S"];

function tierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Identify disagreements between judge verdicts.
 * A disagreement exists when judges differ by 2+ tiers on the same dimension.
 */
export function identifyDisagreements(
  verdicts: JudgeVerdict[],
): Array<{ dimension: string; judges: Array<{ role: string; tier: Tier; score: number }> }> {
  const dimensionMap = new Map<
    string,
    Array<{ role: string; tier: Tier; score: number; reasoning: string }>
  >();

  for (const verdict of verdicts) {
    for (const dim of verdict.dimensions) {
      const key = dim.criterionId;
      const existing = dimensionMap.get(key) ?? [];
      existing.push({
        role: verdict.judgeRole,
        tier: dim.tier,
        score: dim.score,
        reasoning: dim.reasoning,
      });
      dimensionMap.set(key, existing);
    }
  }

  const disagreements: Array<{
    dimension: string;
    judges: Array<{ role: string; tier: Tier; score: number }>;
  }> = [];

  for (const [dimension, entries] of dimensionMap) {
    if (entries.length < 2) continue;

    const tiers = entries.map((e) => tierIndex(e.tier));
    const maxTier = Math.max(...tiers);
    const minTier = Math.min(...tiers);

    if (maxTier - minTier >= 2) {
      disagreements.push({
        dimension,
        judges: entries.map((e) => ({ role: e.role, tier: e.tier, score: e.score })),
      });
    }
  }

  return disagreements;
}

/**
 * Run deliberation round when disagreements are found.
 */
export async function runDeliberation(
  proposalId: string,
  verdicts: JudgeVerdict[],
): Promise<DeliberationRound | null> {
  const disagreements = identifyDisagreements(verdicts);

  if (disagreements.length === 0) return null;

  const verdictsDescription = verdicts
    .map(
      (v) =>
        `### ${v.judgeRole} Judge (Overall: ${v.overallTier} ${v.overallScore}/10)\n${v.dimensions.map((d) => `- ${d.criterionName}: ${d.tier} (${d.score}) — ${d.reasoning.slice(0, 200)}`).join("\n")}`,
    )
    .join("\n\n");

  const disagreementsDescription = disagreements
    .map(
      (d) =>
        `**${d.dimension}**: ${d.judges.map((j) => `${j.role}=${j.tier}(${j.score})`).join(" vs ")}`,
    )
    .join("\n");

  const result = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: DeliberationRoundSchema,
    prompt: `
You are the Presiding Judge. You do NOT have your own evaluation score.
Your role is to facilitate deliberation between judges who disagree.

## All Judge Verdicts
${verdictsDescription}

## Identified Disagreements (2+ tier gap)
${disagreementsDescription}

For each disagreement:
1. Formulate a specific question that gets to the heart of why judges diverged
2. Based on the judges' stated reasoning, determine if consensus can be reached
3. If not, record the dissent explicitly — do NOT force agreement

Rules:
- Never paper over genuine disagreements
- If a Security judge flags a critical risk but Impact judge gives high marks, the disagreement IS the evaluation
- Record dissent as valuable signal, not failure
`.trim(),
    mode: "json",
  });

  return {
    ...result.object,
    proposalId,
    deliberatedAt: Math.floor(Date.now() / 1000),
  };
}
