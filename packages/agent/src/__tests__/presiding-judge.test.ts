import { describe, expect, test } from "bun:test";
import { identifyDisagreements } from "../agents/presiding-judge.js";
import type { JudgeVerdict, ScoredDimension } from "@ipe-city/common";

function makeDimension(
  criterionId: string,
  tier: "S" | "A" | "B" | "C" | "F",
  score: number,
): ScoredDimension {
  return {
    criterionId,
    criterionName: criterionId,
    tier,
    score,
    reasoning: "A".repeat(100),
    evidence: [{ type: "proposal_section", source: "Section 1", quote: "test", relevance: "test" }],
    evidenceSufficiency: "Sufficient",
    limitations: [],
  };
}

function makeVerdict(
  role: "Security" | "Impact" | "Alignment",
  dimensions: ScoredDimension[],
): JudgeVerdict {
  return {
    judgeId: `${role}-judge`,
    judgeRole: role,
    proposalId: "test-proposal",
    evaluatedAt: 1000000,
    dimensions,
    overallTier: "A",
    overallScore: 7,
    summary: "A".repeat(100),
    confidence: 0.8,
  };
}

describe("identifyDisagreements", () => {
  test("returns empty when judges agree", () => {
    const verdicts = [
      makeVerdict("Security", [makeDimension("security", "A", 7)]),
      makeVerdict("Impact", [makeDimension("security", "A", 8)]),
      makeVerdict("Alignment", [makeDimension("security", "B", 6)]),
    ];

    const disagreements = identifyDisagreements(verdicts);
    // A vs A vs B = 1 tier gap, below threshold of 2
    expect(disagreements).toHaveLength(0);
  });

  test("detects 2-tier disagreement", () => {
    const verdicts = [
      makeVerdict("Security", [makeDimension("security", "F", 2)]),
      makeVerdict("Impact", [makeDimension("security", "A", 8)]),
      makeVerdict("Alignment", [makeDimension("security", "B", 5)]),
    ];

    const disagreements = identifyDisagreements(verdicts);
    // F(0) vs A(3) = 3 tier gap, above threshold
    expect(disagreements).toHaveLength(1);
    expect(disagreements[0]!.dimension).toBe("security");
    expect(disagreements[0]!.judges).toHaveLength(3);
  });

  test("detects multiple disagreements across dimensions", () => {
    const verdicts = [
      makeVerdict("Security", [
        makeDimension("security", "F", 1),
        makeDimension("impact", "S", 9),
      ]),
      makeVerdict("Impact", [
        makeDimension("security", "A", 8),
        makeDimension("impact", "C", 3),
      ]),
    ];

    const disagreements = identifyDisagreements(verdicts);
    expect(disagreements).toHaveLength(2);
  });

  test("handles single judge per dimension (no disagreement possible)", () => {
    const verdicts = [
      makeVerdict("Security", [makeDimension("security", "F", 1)]),
      makeVerdict("Impact", [makeDimension("impact", "S", 10)]),
    ];

    const disagreements = identifyDisagreements(verdicts);
    expect(disagreements).toHaveLength(0);
  });

  test("exact 2-tier gap triggers disagreement", () => {
    const verdicts = [
      makeVerdict("Security", [makeDimension("security", "C", 3)]),
      makeVerdict("Impact", [makeDimension("security", "S", 9)]),
    ];

    // C(1) vs S(4) = 3 tier gap >= 2
    const disagreements = identifyDisagreements(verdicts);
    expect(disagreements).toHaveLength(1);
  });

  test("1-tier gap does NOT trigger disagreement", () => {
    const verdicts = [
      makeVerdict("Security", [makeDimension("security", "B", 5)]),
      makeVerdict("Impact", [makeDimension("security", "A", 7)]),
    ];

    // B(2) vs A(3) = 1 tier gap < 2
    const disagreements = identifyDisagreements(verdicts);
    expect(disagreements).toHaveLength(0);
  });
});
