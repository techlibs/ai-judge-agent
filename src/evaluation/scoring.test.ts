import { describe, it, expect } from "vitest";
import { computeWeightedTotal, detectScoreAnomalies } from "./scoring";
import type { DimensionScore } from "./schemas";

function makeScore(
  dimension: DimensionScore["dimension"],
  score: number
): DimensionScore {
  return {
    dimension,
    score,
    inputDataConsidered: ["description"],
    rubricApplied: { criteria: ["feasibility"] },
    reasoningChain:
      "This is a test reasoning chain that is at least fifty characters long for validation purposes.",
  };
}

describe("computeWeightedTotal", () => {
  it("computes correct weighted total", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 8),
      makeScore("impact_potential", 7),
      makeScore("cost_efficiency", 6),
      makeScore("team_capability", 9),
    ];

    // 8*0.25 + 7*0.30 + 6*0.20 + 9*0.25 = 2 + 2.1 + 1.2 + 2.25 = 7.55
    expect(computeWeightedTotal(scores)).toBe(7.55);
  });

  it("handles all zeros", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 0),
      makeScore("impact_potential", 0),
      makeScore("cost_efficiency", 0),
      makeScore("team_capability", 0),
    ];

    expect(computeWeightedTotal(scores)).toBe(0);
  });

  it("handles all tens", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 10),
      makeScore("impact_potential", 10),
      makeScore("cost_efficiency", 10),
      makeScore("team_capability", 10),
    ];

    expect(computeWeightedTotal(scores)).toBe(10);
  });
});

describe("detectScoreAnomalies", () => {
  it("flags unusually low scores", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 1),
      makeScore("impact_potential", 7),
      makeScore("cost_efficiency", 6),
      makeScore("team_capability", 8),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.reason.includes("Unusually low"))).toBe(true);
  });

  it("flags unusually high scores", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 9.5),
      makeScore("impact_potential", 7),
      makeScore("cost_efficiency", 6),
      makeScore("team_capability", 8),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.reason.includes("Unusually high"))).toBe(true);
  });

  it("flags extreme deviation from mean", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 2),
      makeScore("impact_potential", 9),
      makeScore("cost_efficiency", 8),
      makeScore("team_capability", 8),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.reason.includes("deviates"))).toBe(true);
  });

  it("returns empty for normal scores", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 7),
      makeScore("impact_potential", 7),
      makeScore("cost_efficiency", 6),
      makeScore("team_capability", 7),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags).toHaveLength(0);
  });
});
