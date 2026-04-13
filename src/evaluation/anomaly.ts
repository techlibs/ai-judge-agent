import type { DimensionScore } from "./schemas";
import type { MarketContext } from "@/lib/colosseum/schemas";

const SUSPICIOUSLY_HIGH_THRESHOLD = 95;
const SUSPICIOUSLY_LOW_THRESHOLD = 5;
const EXTREME_DIVERGENCE_THRESHOLD = 50;

const ALL_SCORES_SUSPICIOUSLY_HIGH = "ALL_SCORES_SUSPICIOUSLY_HIGH" as const;
const ALL_SCORES_SUSPICIOUSLY_LOW = "ALL_SCORES_SUSPICIOUSLY_LOW" as const;
const EXTREME_SCORE_DIVERGENCE = "EXTREME_SCORE_DIVERGENCE" as const;
const MARKET_COHERENCE_FALSE_GAP_HIGH_IMPACT = "MARKET_COHERENCE_FALSE_GAP_HIGH_IMPACT" as const;
const MARKET_COHERENCE_FULL_GAP_LOW_IMPACT = "MARKET_COHERENCE_FULL_GAP_LOW_IMPACT" as const;

const FALSE_GAP_HIGH_IMPACT_THRESHOLD = 7.5;
const FULL_GAP_LOW_IMPACT_THRESHOLD = 3.0;

type AnomalyFlag =
  | typeof ALL_SCORES_SUSPICIOUSLY_HIGH
  | typeof ALL_SCORES_SUSPICIOUSLY_LOW
  | typeof EXTREME_SCORE_DIVERGENCE
  | typeof MARKET_COHERENCE_FALSE_GAP_HIGH_IMPACT
  | typeof MARKET_COHERENCE_FULL_GAP_LOW_IMPACT;

export function detectAnomalies(
  scores: ReadonlyArray<DimensionScore>,
  marketContext: MarketContext | null = null
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

  const marketFlags = detectMarketCoherenceAnomalies(scores, marketContext);
  flags.push(...marketFlags);

  return flags;
}

function detectMarketCoherenceAnomalies(
  scores: ReadonlyArray<DimensionScore>,
  marketContext: MarketContext | null
): ReadonlyArray<AnomalyFlag> {
  if (!marketContext) {
    return [];
  }

  const flags: AnomalyFlag[] = [];

  const impactScore = scores.find(
    (s) => s.dimension === "impact_potential"
  );

  if (!impactScore) {
    return [];
  }

  if (
    marketContext.gapClassification.type === "false" &&
    impactScore.score > FALSE_GAP_HIGH_IMPACT_THRESHOLD
  ) {
    flags.push(MARKET_COHERENCE_FALSE_GAP_HIGH_IMPACT);
  }

  if (
    marketContext.gapClassification.type === "full" &&
    impactScore.score < FULL_GAP_LOW_IMPACT_THRESHOLD
  ) {
    flags.push(MARKET_COHERENCE_FULL_GAP_LOW_IMPACT);
  }

  return flags;
}

export {
  ALL_SCORES_SUSPICIOUSLY_HIGH,
  ALL_SCORES_SUSPICIOUSLY_LOW,
  EXTREME_SCORE_DIVERGENCE,
  MARKET_COHERENCE_FALSE_GAP_HIGH_IMPACT,
  MARKET_COHERENCE_FULL_GAP_LOW_IMPACT,
};

export type { AnomalyFlag };
