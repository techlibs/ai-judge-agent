import {
  DIMENSION_WEIGHTS,
  type DimensionScore,
  type ScoringDimension,
} from "./schemas";

const MIN_REPUTATION_MULTIPLIER = 1.0;
const MAX_REPUTATION_MULTIPLIER = 1.05;
const REPUTATION_DIVISOR = 10_000;

interface WeightedScoreResult {
  readonly finalScore: number;
  readonly reputationMultiplier: number;
  readonly adjustedScore: number;
}

export function computeWeightedScore(
  scores: ReadonlyArray<DimensionScore>,
  reputationIndex: number
): WeightedScoreResult {
  let finalScore = 0;

  for (const score of scores) {
    const dimension = score.dimension as ScoringDimension;
    const weight = DIMENSION_WEIGHTS[dimension];
    finalScore += score.score * weight;
  }

  finalScore = Math.round(finalScore * 100) / 100;

  const reputationMultiplier = computeReputationMultiplier(reputationIndex);
  const adjustedScore =
    Math.round(finalScore * reputationMultiplier * 100) / 100;

  return {
    finalScore,
    reputationMultiplier,
    adjustedScore,
  };
}

export function computeReputationMultiplier(
  reputationIndex: number
): number {
  const raw = MIN_REPUTATION_MULTIPLIER + reputationIndex / REPUTATION_DIVISOR;
  return Math.min(raw, MAX_REPUTATION_MULTIPLIER);
}
