import {
  DIMENSION_WEIGHTS,
  type DimensionScore,
  type ScoringDimension,
} from "./schemas";
import type { MarketContext } from "@/lib/colosseum/schemas";

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

const COHERENCE_BASELINE = 5000;
const COHERENCE_MAX = 10000;
const COHERENCE_MIN = 0;

const FALSE_GAP_HIGH_IMPACT_PENALTY = 3000;
const FULL_GAP_LOW_IMPACT_PENALTY = 2000;
const PARTIAL_GAP_BONUS = 1000;
const HIGH_COMPETITOR_NOVELTY_PENALTY = 1500;
const HIGH_COMPETITOR_THRESHOLD = 10;

export function computeMarketCoherenceScore(
  scores: ReadonlyArray<DimensionScore>,
  marketContext: MarketContext
): number {
  let coherence = COHERENCE_BASELINE;

  const impactScore = scores.find(
    (s) => s.dimension === "impact_potential"
  );
  const technicalScore = scores.find(
    (s) => s.dimension === "technical_feasibility"
  );

  if (impactScore) {
    if (
      marketContext.gapClassification.type === "false" &&
      impactScore.score > 7.5
    ) {
      coherence -= FALSE_GAP_HIGH_IMPACT_PENALTY;
    }

    if (
      marketContext.gapClassification.type === "full" &&
      impactScore.score < 3.0
    ) {
      coherence -= FULL_GAP_LOW_IMPACT_PENALTY;
    }

    if (marketContext.gapClassification.type === "partial") {
      coherence += PARTIAL_GAP_BONUS;
    }
  }

  if (
    technicalScore &&
    marketContext.competitorCount > HIGH_COMPETITOR_THRESHOLD &&
    technicalScore.score > 8.0
  ) {
    coherence -= HIGH_COMPETITOR_NOVELTY_PENALTY;
  }

  return Math.max(COHERENCE_MIN, Math.min(COHERENCE_MAX, coherence));
}
