import { describe, it, expect } from "vitest";
import { computeAggregateScore } from "./scoring";

describe("computeAggregateScore", () => {
  it("computes weighted average correctly", () => {
    const scores = {
      tech: 8000,   // weight 0.25
      impact: 7000, // weight 0.30
      cost: 6000,   // weight 0.20
      team: 9000,   // weight 0.25
    };

    // 8000*0.25 + 7000*0.30 + 6000*0.20 + 9000*0.25
    // = 2000 + 2100 + 1200 + 2250 = 7550
    const result = computeAggregateScore(scores);
    expect(result).toBe(7550);
  });

  it("handles zero scores", () => {
    const scores = {
      tech: 0,
      impact: 0,
      cost: 0,
      team: 0,
    };

    expect(computeAggregateScore(scores)).toBe(0);
  });

  it("handles maximum scores", () => {
    const scores = {
      tech: 10000,
      impact: 10000,
      cost: 10000,
      team: 10000,
    };

    // 10000 * (0.25 + 0.30 + 0.20 + 0.25) = 10000
    expect(computeAggregateScore(scores)).toBe(10000);
  });

  it("throws for missing dimension", () => {
    const scores = {
      tech: 8000,
      impact: 7000,
      cost: 6000,
    } as Record<string, number>;

    expect(() =>
      computeAggregateScore(scores as Parameters<typeof computeAggregateScore>[0])
    ).toThrow("Missing score for dimension");
  });
});
