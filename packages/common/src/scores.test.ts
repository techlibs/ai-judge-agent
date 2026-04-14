import { describe, expect, test } from "bun:test";
import {
  toOnchainScore,
  fromOnchainScore,
  isScoreInTier,
  TierSchema,
  AgentScoreSchema,
  OnchainScoreSchema,
  TIER_RANGES,
} from "./scores.js";

describe("Score conversion", () => {
  test("toOnchainScore converts 1-10 to 0-1000", () => {
    expect(toOnchainScore(1)).toBe(100);
    expect(toOnchainScore(5)).toBe(500);
    expect(toOnchainScore(10)).toBe(1000);
    expect(toOnchainScore(7.5)).toBe(750);
  });

  test("fromOnchainScore converts 0-1000 to 1-10", () => {
    expect(fromOnchainScore(100)).toBe(1);
    expect(fromOnchainScore(500)).toBe(5);
    expect(fromOnchainScore(1000)).toBe(10);
    expect(fromOnchainScore(750)).toBe(7.5);
  });

  test("roundtrip conversion is stable", () => {
    for (const score of [1, 3.5, 5, 7.2, 9, 10]) {
      expect(fromOnchainScore(toOnchainScore(score))).toBe(score);
    }
  });
});

describe("Tier validation", () => {
  test("isScoreInTier validates correctly", () => {
    expect(isScoreInTier(9, "S")).toBe(true);
    expect(isScoreInTier(10, "S")).toBe(true);
    expect(isScoreInTier(8, "S")).toBe(false);
    expect(isScoreInTier(7, "A")).toBe(true);
    expect(isScoreInTier(8, "A")).toBe(true);
    expect(isScoreInTier(6, "A")).toBe(false);
    expect(isScoreInTier(5, "B")).toBe(true);
    expect(isScoreInTier(3, "C")).toBe(true);
    expect(isScoreInTier(1, "F")).toBe(true);
    expect(isScoreInTier(2, "F")).toBe(true);
  });

  test("every tier has non-overlapping ranges", () => {
    const tiers = Object.entries(TIER_RANGES);
    for (let i = 0; i < tiers.length; i++) {
      for (let j = i + 1; j < tiers.length; j++) {
        const [, a] = tiers[i]!;
        const [, b] = tiers[j]!;
        const overlaps = a.min <= b.max && b.min <= a.max;
        expect(overlaps).toBe(false);
      }
    }
  });
});

describe("Zod schemas", () => {
  test("TierSchema accepts valid tiers", () => {
    expect(TierSchema.parse("S")).toBe("S");
    expect(TierSchema.parse("F")).toBe("F");
  });

  test("TierSchema rejects invalid values", () => {
    expect(() => TierSchema.parse("X")).toThrow();
    expect(() => TierSchema.parse(5)).toThrow();
  });

  test("AgentScoreSchema accepts valid range", () => {
    expect(AgentScoreSchema.parse(1)).toBe(1);
    expect(AgentScoreSchema.parse(10)).toBe(10);
    expect(AgentScoreSchema.parse(5.5)).toBe(5.5);
  });

  test("AgentScoreSchema rejects out of range", () => {
    expect(() => AgentScoreSchema.parse(0)).toThrow();
    expect(() => AgentScoreSchema.parse(11)).toThrow();
  });

  test("OnchainScoreSchema accepts integers 0-1000", () => {
    expect(OnchainScoreSchema.parse(0)).toBe(0);
    expect(OnchainScoreSchema.parse(1000)).toBe(1000);
  });

  test("OnchainScoreSchema rejects decimals and out of range", () => {
    expect(() => OnchainScoreSchema.parse(500.5)).toThrow();
    expect(() => OnchainScoreSchema.parse(1001)).toThrow();
    expect(() => OnchainScoreSchema.parse(-1)).toThrow();
  });
});
