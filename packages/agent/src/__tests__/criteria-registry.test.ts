import { describe, expect, test } from "bun:test";
import { CORE_CRITERIA, ADAPTIVE_CRITERIA } from "../criteria/registry.js";
import { CriterionSchema } from "@ipe-city/common";

describe("Core criteria", () => {
  test("has exactly 3 core criteria", () => {
    expect(CORE_CRITERIA).toHaveLength(3);
  });

  test("core criteria are Security, Impact, Alignment", () => {
    const names = CORE_CRITERIA.map((c) => c.name);
    expect(names).toContain("Security");
    expect(names).toContain("Impact");
    expect(names).toContain("IPE City Alignment");
  });

  test("all core criteria are marked isCore", () => {
    for (const c of CORE_CRITERIA) {
      expect(c.isCore).toBe(true);
    }
  });

  test("core weights sum to 7500 (leaving 2500 for adaptive)", () => {
    const totalWeight = CORE_CRITERIA.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBe(7500);
  });

  test("all core criteria pass Zod validation", () => {
    for (const c of CORE_CRITERIA) {
      expect(() => CriterionSchema.parse(c)).not.toThrow();
    }
  });

  test("each core criterion has at least 1 evidence requirement", () => {
    for (const c of CORE_CRITERIA) {
      expect(c.evidenceRequirements.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Adaptive criteria", () => {
  test("has 10 adaptive criteria", () => {
    expect(ADAPTIVE_CRITERIA).toHaveLength(10);
  });

  test("all adaptive criteria are not core", () => {
    for (const c of ADAPTIVE_CRITERIA) {
      expect(c.isCore).toBe(false);
    }
  });

  test("covers all domains with at least 2 criteria each", () => {
    const domains = ["DeFi", "Governance", "Education", "Health", "Infrastructure"];
    for (const domain of domains) {
      const count = ADAPTIVE_CRITERIA.filter((c) =>
        c.applicableDomains.includes(domain as any),
      ).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test("all adaptive criteria pass Zod validation", () => {
    for (const c of ADAPTIVE_CRITERIA) {
      expect(() => CriterionSchema.parse(c)).not.toThrow();
    }
  });

  test("adaptive weights are all 1250 (default)", () => {
    for (const c of ADAPTIVE_CRITERIA) {
      expect(c.weight).toBe(1250);
    }
  });
});
