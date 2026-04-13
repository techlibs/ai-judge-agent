import type { DimensionScore } from "./schemas";

const SUSPICIOUSLY_HIGH_THRESHOLD = 95;
const SUSPICIOUSLY_LOW_THRESHOLD = 5;
const EXTREME_DIVERGENCE_THRESHOLD = 50;

const ALL_SCORES_SUSPICIOUSLY_HIGH = "ALL_SCORES_SUSPICIOUSLY_HIGH" as const;
const ALL_SCORES_SUSPICIOUSLY_LOW = "ALL_SCORES_SUSPICIOUSLY_LOW" as const;
const EXTREME_SCORE_DIVERGENCE = "EXTREME_SCORE_DIVERGENCE" as const;

type AnomalyFlag =
  | typeof ALL_SCORES_SUSPICIOUSLY_HIGH
  | typeof ALL_SCORES_SUSPICIOUSLY_LOW
  | typeof EXTREME_SCORE_DIVERGENCE;

export function detectAnomalies(
  scores: ReadonlyArray<DimensionScore>
): ReadonlyArray<AnomalyFlag> {
  if (scores.length === 0) {
    return [];
  }

  const flags: AnomalyFlag[] = [];
  const scoreValues = scores.map((s) => s.score);
  const scaledValues = scoreValues.map((s) => s * 10);

  const allHigh = scaledValues.every(
    (s) => s >= SUSPICIOUSLY_HIGH_THRESHOLD
  );
  if (allHigh) {
    flags.push(ALL_SCORES_SUSPICIOUSLY_HIGH);
  }

  const allLow = scaledValues.every(
    (s) => s <= SUSPICIOUSLY_LOW_THRESHOLD
  );
  if (allLow) {
    flags.push(ALL_SCORES_SUSPICIOUSLY_LOW);
  }

  const maxScore = Math.max(...scaledValues);
  const minScore = Math.min(...scaledValues);
  if (maxScore - minScore > EXTREME_DIVERGENCE_THRESHOLD) {
    flags.push(EXTREME_SCORE_DIVERGENCE);
  }

  return flags;
}

export {
  ALL_SCORES_SUSPICIOUSLY_HIGH,
  ALL_SCORES_SUSPICIOUSLY_LOW,
  EXTREME_SCORE_DIVERGENCE,
};

export type { AnomalyFlag };
