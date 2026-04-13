import type { JudgeDimension } from "@/lib/constants";

export const DIMENSION_WEIGHTS: Record<JudgeDimension, number> = {
  tech: 0.25,
  impact: 0.30,
  cost: 0.20,
  team: 0.25,
};

export function computeAggregateScore(
  scores: Record<JudgeDimension, number>
): number {
  let aggregate = 0;
  for (const [dimension, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    const score = scores[dimension as JudgeDimension];
    if (score === undefined) {
      throw new Error(`Missing score for dimension: ${dimension}`);
    }
    aggregate += score * weight;
  }
  return Math.round(aggregate);
}
