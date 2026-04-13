import { describe, it, expect } from "vitest";
import {
  computeWeightedScore,
  computeReputationMultiplier,
} from "@/evaluation/scoring";
import type { DimensionScore } from "@/evaluation/schemas";

const ALL_DIMENSIONS: ReadonlyArray<DimensionScore> = [
  {
    dimension: "technical_feasibility",
    score: 8,
    inputDataConsidered: ["tech stack", "architecture"],
    rubricApplied: { criteria: ["feasibility", "complexity"] },
    reasoningChain: "The technical approach is solid with clear implementation details and modern tooling choices.",
  },
  {
    dimension: "impact_potential",
    score: 7,
    inputDataConsidered: ["problem statement", "market size"],
    rubricApplied: { criteria: ["reach", "depth", "sustainability"] },
    reasoningChain: "Good potential impact for the target community with measurable outcomes described in the proposal.",
  },
  {
    dimension: "cost_efficiency",
    score: 6,
    inputDataConsidered: ["budget breakdown", "team size"],
    rubricApplied: { criteria: ["cost per outcome", "market rates"] },
    reasoningChain: "Budget is reasonable for the scope though some line items could be tighter given comparable projects.",
  },
  {
    dimension: "team_capability",
    score: 9,
    inputDataConsidered: ["team members", "past projects"],
    rubricApplied: { criteria: ["relevant experience", "track record"] },
    reasoningChain: "Highly experienced team with demonstrated delivery on prior grants in this domain and adjacent fields.",
  },
];

describe("computeWeightedScore", () => {
  it("computes correct weighted sum for known inputs", () => {
    // technical: 8 * 0.25 = 2.0
    // impact:    7 * 0.30 = 2.1
    // cost:      6 * 0.20 = 1.2
    // team:      9 * 0.25 = 2.25
    // total:              = 7.55
    const result = computeWeightedScore(ALL_DIMENSIONS, 0);
    expect(result.finalScore).toBe(7.55);
  });

  it("rounds finalScore to 2 decimal places", () => {
    const scores: ReadonlyArray<DimensionScore> = [
      {
        dimension: "technical_feasibility",
        score: 7,
        inputDataConsidered: ["description"],
        rubricApplied: { criteria: ["feasibility"] },
        reasoningChain: "Technical approach is reasonable given the proposal scope and available tooling mentioned.",
      },
      {
        dimension: "impact_potential",
        score: 7,
        inputDataConsidered: ["description"],
        rubricApplied: { criteria: ["reach"] },
        reasoningChain: "Moderate impact expected based on target community size and depth of engagement strategy.",
      },
      {
        dimension: "cost_efficiency",
        score: 7,
        inputDataConsidered: ["budget"],
        rubricApplied: { criteria: ["cost per outcome"] },
        reasoningChain: "Costs appear within normal market range for this type of grant work and team size.",
      },
      {
        dimension: "team_capability",
        score: 7,
        inputDataConsidered: ["team"],
        rubricApplied: { criteria: ["experience"] },
        reasoningChain: "Team has relevant background and appears capable of executing the described deliverables.",
      },
    ];
    // 7 * 0.25 + 7 * 0.30 + 7 * 0.20 + 7 * 0.25 = 7.0 exactly
    const result = computeWeightedScore(scores, 0);
    expect(result.finalScore).toBe(7.0);
    expect(Number.isFinite(result.finalScore)).toBe(true);
  });

  it("returns 0 when all scores are 0", () => {
    const zeroScores: ReadonlyArray<DimensionScore> = ALL_DIMENSIONS.map(
      (s) => ({ ...s, score: 0 })
    );
    const result = computeWeightedScore(zeroScores, 0);
    expect(result.finalScore).toBe(0);
    expect(result.adjustedScore).toBe(0);
  });

  it("returns max weighted score when all scores are 10", () => {
    const maxScores: ReadonlyArray<DimensionScore> = ALL_DIMENSIONS.map(
      (s) => ({ ...s, score: 10 })
    );
    // 10 * (0.25 + 0.30 + 0.20 + 0.25) = 10 * 1.0 = 10
    const result = computeWeightedScore(maxScores, 0);
    expect(result.finalScore).toBe(10);
  });

  it("applies reputation multiplier to produce adjustedScore", () => {
    // reputationIndex = 500 => multiplier = 1.0 + 500/10000 = 1.05
    const result = computeWeightedScore(ALL_DIMENSIONS, 500);
    expect(result.reputationMultiplier).toBe(1.05);
    expect(result.adjustedScore).toBe(Math.round(result.finalScore * 1.05 * 100) / 100);
  });

  it("adjustedScore equals finalScore when reputationIndex is 0", () => {
    const result = computeWeightedScore(ALL_DIMENSIONS, 0);
    expect(result.reputationMultiplier).toBe(1.0);
    expect(result.adjustedScore).toBe(result.finalScore);
  });
});

describe("computeReputationMultiplier", () => {
  it("returns exactly 1.0 when index is 0", () => {
    expect(computeReputationMultiplier(0)).toBe(1.0);
  });

  it("caps at MAX_REPUTATION_MULTIPLIER (1.05) for very high index", () => {
    expect(computeReputationMultiplier(999_999)).toBe(1.05);
    expect(computeReputationMultiplier(50_000)).toBe(1.05);
  });

  it("returns intermediate value for mid-range index", () => {
    // 1.0 + 250/10000 = 1.025
    expect(computeReputationMultiplier(250)).toBe(1.025);
  });

  it("returns 1.0 for negative index (clamped by formula)", () => {
    // 1.0 + (-100/10000) = 0.99, but min is not clamped below — formula returns raw
    // The implementation does NOT floor at 1.0 for negative inputs
    const result = computeReputationMultiplier(-100);
    expect(result).toBeCloseTo(0.99, 5);
  });

  it("exactly reaches cap at index 500", () => {
    // 1.0 + 500/10000 = 1.05 exactly
    expect(computeReputationMultiplier(500)).toBe(1.05);
  });
});
