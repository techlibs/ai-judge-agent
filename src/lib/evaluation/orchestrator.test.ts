import { describe, test, expect, mock, beforeEach } from "bun:test";
import { computeAggregateScore } from "./orchestrator";
import type { DimensionEvaluation } from "./schemas";

function makeDimensionEvaluation(
  dimension: DimensionEvaluation["dimension"],
  score: number,
): DimensionEvaluation {
  return {
    dimension,
    output: {
      score,
      justification: `Test justification for ${dimension}`,
      recommendation: "approve",
      keyFindings: [`Finding for ${dimension}`],
    },
    audit: {
      promptSent: "test prompt",
      modelUsed: "test-model",
      rawResponse: "{}",
      evaluatedAt: Date.now(),
    },
  };
}

describe("computeAggregateScore", () => {
  test("computes correct weighted score with all 4 dimensions", () => {
    const dimensions: DimensionEvaluation[] = [
      makeDimensionEvaluation("technical", 80),
      makeDimensionEvaluation("impact", 60),
      makeDimensionEvaluation("cost", 70),
      makeDimensionEvaluation("team", 90),
    ];
    // 80*0.25 + 60*0.30 + 70*0.20 + 90*0.25 = 20 + 18 + 14 + 22.5 = 74.5
    const result = computeAggregateScore(dimensions);
    expect(result).toBeCloseTo(74.5);
  });

  test("computes correct weighted score with 3 dimensions (re-normalization)", () => {
    const dimensions: DimensionEvaluation[] = [
      makeDimensionEvaluation("technical", 80),
      makeDimensionEvaluation("impact", 60),
      makeDimensionEvaluation("cost", 70),
    ];
    // weights: tech=0.25, impact=0.30, cost=0.20 => total = 0.75
    // weighted: 80*0.25 + 60*0.30 + 70*0.20 = 20 + 18 + 14 = 52
    // re-normalized: 52 / 0.75 = 69.333...
    const result = computeAggregateScore(dimensions);
    expect(result).toBeCloseTo(69.3, 0);
  });

  test("handles single dimension", () => {
    const dimensions: DimensionEvaluation[] = [
      makeDimensionEvaluation("impact", 85),
    ];
    // 85*0.30 / 0.30 = 85
    const result = computeAggregateScore(dimensions);
    expect(result).toBe(85);
  });

  test("returns 0 for empty dimensions", () => {
    const result = computeAggregateScore([]);
    expect(result).toBe(0);
  });

  test("rounds to 1 decimal place", () => {
    const dimensions: DimensionEvaluation[] = [
      makeDimensionEvaluation("technical", 73),
      makeDimensionEvaluation("impact", 67),
      makeDimensionEvaluation("cost", 81),
      makeDimensionEvaluation("team", 55),
    ];
    // 73*0.25 + 67*0.30 + 81*0.20 + 55*0.25 = 18.25 + 20.1 + 16.2 + 13.75 = 68.3
    const result = computeAggregateScore(dimensions);
    expect(result).toBe(68.3);
  });

  test("handles all-zero scores", () => {
    const dimensions: DimensionEvaluation[] = [
      makeDimensionEvaluation("technical", 0),
      makeDimensionEvaluation("impact", 0),
      makeDimensionEvaluation("cost", 0),
      makeDimensionEvaluation("team", 0),
    ];
    expect(computeAggregateScore(dimensions)).toBe(0);
  });

  test("handles all-100 scores", () => {
    const dimensions: DimensionEvaluation[] = [
      makeDimensionEvaluation("technical", 100),
      makeDimensionEvaluation("impact", 100),
      makeDimensionEvaluation("cost", 100),
      makeDimensionEvaluation("team", 100),
    ];
    expect(computeAggregateScore(dimensions)).toBe(100);
  });
});
