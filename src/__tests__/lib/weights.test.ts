import { describe, it, expect } from "bun:test";
import { computeAggregateScore, DIMENSION_WEIGHTS } from "@/lib/judges/weights";

describe("computeAggregateScore", () => {
  it("returns 5000 when all dimensions score 5000", () => {
    expect(computeAggregateScore({ tech: 5000, impact: 5000, cost: 5000, team: 5000 })).toBe(5000);
  });

  it("applies correct weights — tech only scores 10000", () => {
    expect(computeAggregateScore({ tech: 10000, impact: 0, cost: 0, team: 0 })).toBe(2500);
  });

  it("applies correct weights — impact only scores 10000 (highest weight)", () => {
    expect(computeAggregateScore({ tech: 0, impact: 10000, cost: 0, team: 0 })).toBe(3000);
  });

  it("throws when a dimension is missing", () => {
    expect(() =>
      computeAggregateScore({ tech: 5000, impact: 5000, cost: 5000 } as Record<"tech" | "impact" | "cost" | "team", number>)
    ).toThrow("Missing score for dimension: team");
  });

  it("rounds fractional results to nearest integer", () => {
    expect(computeAggregateScore({ tech: 3333, impact: 3333, cost: 3333, team: 3333 })).toBe(3333);
  });
});

describe("DIMENSION_WEIGHTS", () => {
  it("weights sum to 1.0", () => {
    const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });
});
