import {
  DIMENSION_WEIGHTS,
  type DimensionScore,
  type ScoringDimension,
} from "./schemas";

const ANOMALY_THRESHOLD_LOW = 2;
const ANOMALY_THRESHOLD_HIGH = 9;
const MAX_SCORE_DEVIATION = 4;

export function computeWeightedTotal(scores: ReadonlyArray<DimensionScore>): number {
  let total = 0;
  for (const score of scores) {
    const weight = DIMENSION_WEIGHTS[score.dimension];
    total += score.score * weight;
  }
  return Math.round(total * 100) / 100;
}

interface AnomalyFlag {
  readonly dimension: ScoringDimension;
  readonly reason: string;
  readonly severity: "low" | "medium" | "high";
}

export function detectScoreAnomalies(
  scores: ReadonlyArray<DimensionScore>
): ReadonlyArray<AnomalyFlag> {
  const flags: AnomalyFlag[] = [];

  const scoreValues = scores.map((s) => s.score);
  const mean = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;

  for (const score of scores) {
    if (score.score <= ANOMALY_THRESHOLD_LOW) {
      flags.push({
        dimension: score.dimension,
        reason: `Unusually low score (${score.score}/10)`,
        severity: "medium",
      });
    }

    if (score.score >= ANOMALY_THRESHOLD_HIGH) {
      flags.push({
        dimension: score.dimension,
        reason: `Unusually high score (${score.score}/10)`,
        severity: "low",
      });
    }

    const deviation = Math.abs(score.score - mean);
    if (deviation > MAX_SCORE_DEVIATION) {
      flags.push({
        dimension: score.dimension,
        reason: `Score deviates ${deviation.toFixed(1)} points from mean (${mean.toFixed(1)})`,
        severity: "high",
      });
    }
  }

  return flags;
}
