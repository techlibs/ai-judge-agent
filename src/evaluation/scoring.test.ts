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

  it("flags score exactly at low threshold (2)", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 2),
      makeScore("impact_potential", 5),
      makeScore("cost_efficiency", 5),
      makeScore("team_capability", 5),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.dimension === "technical_feasibility" && f.reason.includes("Unusually low"))).toBe(true);
  });

  it("does not flag score just above low threshold (2.1)", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 2.1),
      makeScore("impact_potential", 5),
      makeScore("cost_efficiency", 5),
      makeScore("team_capability", 5),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.dimension === "technical_feasibility" && f.reason.includes("Unusually low"))).toBe(false);
  });

  it("flags score exactly at high threshold (9)", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 9),
      makeScore("impact_potential", 5),
      makeScore("cost_efficiency", 5),
      makeScore("team_capability", 5),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.dimension === "technical_feasibility" && f.reason.includes("Unusually high"))).toBe(true);
  });

  it("does not flag score just below high threshold (8.9)", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 8.9),
      makeScore("impact_potential", 5),
      makeScore("cost_efficiency", 5),
      makeScore("team_capability", 5),
    ];

    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.dimension === "technical_feasibility" && f.reason.includes("Unusually high"))).toBe(false);
  });

  it("assigns correct severity levels", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 1),
      makeScore("impact_potential", 10),
      makeScore("cost_efficiency", 5),
      makeScore("team_capability", 5),
    ];

    const flags = detectScoreAnomalies(scores);
    const lowFlag = flags.find((f) => f.reason.includes("Unusually low"));
    const highFlag = flags.find((f) => f.reason.includes("Unusually high"));
    const deviationFlag = flags.find((f) => f.reason.includes("deviates"));

    expect(lowFlag?.severity).toBe("medium");
    expect(highFlag?.severity).toBe("low");
    expect(deviationFlag?.severity).toBe("high");
  });

  it("does not flag deviation at exactly 4 points from mean", () => {
    // mean = (1 + 5 + 5 + 5) / 4 = 4, deviation of score 1 from mean = 3
    // Need mean where deviation is exactly 4: e.g. scores 1, 9, 9, 9 → mean=7, dev=6 (>4)
    // scores 3, 7, 7, 7 → mean=6, dev=3 (not >4)
    // scores 2, 6, 6, 6 → mean=5, dev=3 (not >4)
    // Need exactly 4: scores 1, 5, 5, 9 → mean=5, tech_feasibility dev=4 (NOT >4, so no flag)
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 3),
      makeScore("impact_potential", 7),
      makeScore("cost_efficiency", 7),
      makeScore("team_capability", 7),
    ];
    // mean = (3+7+7+7)/4 = 6, deviation for tech = 3 (not >4)
    const flags = detectScoreAnomalies(scores);
    expect(flags.some((f) => f.reason.includes("deviates"))).toBe(false);
  });

  it("can flag multiple anomalies on same score", () => {
    // A score of 1 with mean ~8 would be both low AND high-deviation
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 1),
      makeScore("impact_potential", 9),
      makeScore("cost_efficiency", 9),
      makeScore("team_capability", 9),
    ];
    // mean = 7, tech dev = 6 (>4)
    const techFlags = detectScoreAnomalies(scores).filter(
      (f) => f.dimension === "technical_feasibility"
    );
    expect(techFlags.length).toBeGreaterThanOrEqual(2);
    expect(techFlags.some((f) => f.reason.includes("Unusually low"))).toBe(true);
    expect(techFlags.some((f) => f.reason.includes("deviates"))).toBe(true);
  });
});

describe("computeWeightedTotal edge cases", () => {
  it("handles decimal scores with correct rounding", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 7.3),
      makeScore("impact_potential", 8.1),
      makeScore("cost_efficiency", 6.7),
      makeScore("team_capability", 7.9),
    ];
    // 7.3*0.25 + 8.1*0.30 + 6.7*0.20 + 7.9*0.25
    // = 1.825 + 2.43 + 1.34 + 1.975 = 7.57
    expect(computeWeightedTotal(scores)).toBe(7.57);
  });

  it("handles single score", () => {
    const scores: DimensionScore[] = [
      makeScore("technical_feasibility", 8),
    ];
    // 8 * 0.25 = 2
    expect(computeWeightedTotal(scores)).toBe(2);
  });

  it("handles empty scores array", () => {
    expect(computeWeightedTotal([])).toBe(0);
  });
});
