import { describe, it, expect } from "vitest";
import {
  JudgeEvaluationSchema,
  IpeAlignmentSchema,
  MarketValidationSchema,
} from "./schemas";

describe("IpeAlignmentSchema", () => {
  it("accepts valid alignment data", () => {
    const result = IpeAlignmentSchema.safeParse({
      proTechnology: 80,
      proFreedom: 60,
      proHumanProgress: 90,
    });
    expect(result.success).toBe(true);
  });

  it("accepts boundary values (0 and 100)", () => {
    const result = IpeAlignmentSchema.safeParse({
      proTechnology: 0,
      proFreedom: 100,
      proHumanProgress: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects values below 0", () => {
    const result = IpeAlignmentSchema.safeParse({
      proTechnology: -1,
      proFreedom: 50,
      proHumanProgress: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects values above 100", () => {
    const result = IpeAlignmentSchema.safeParse({
      proTechnology: 50,
      proFreedom: 101,
      proHumanProgress: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = IpeAlignmentSchema.safeParse({
      proTechnology: 50,
    });
    expect(result.success).toBe(false);
  });
});

describe("JudgeEvaluationSchema", () => {
  const validEvaluation = {
    score: 7500,
    confidence: "high" as const,
    recommendation: "fund" as const,
    justification: "Strong proposal with clear technical merits.",
    keyFindings: ["Good team", "Solid plan"],
    risks: ["Timeline aggressive"],
    ipeAlignment: {
      proTechnology: 80,
      proFreedom: 70,
      proHumanProgress: 85,
    },
  };

  it("accepts valid evaluation data", () => {
    const result = JudgeEvaluationSchema.safeParse(validEvaluation);
    expect(result.success).toBe(true);
  });

  it("accepts score at min boundary (0)", () => {
    const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, score: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts score at max boundary (10000)", () => {
    const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, score: 10000 });
    expect(result.success).toBe(true);
  });

  it("rejects score below 0", () => {
    const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, score: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects score above 10000", () => {
    const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, score: 10001 });
    expect(result.success).toBe(false);
  });

  it("accepts all confidence values", () => {
    for (const confidence of ["high", "medium", "low"] as const) {
      const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, confidence });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid confidence value", () => {
    const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, confidence: "very_high" });
    expect(result.success).toBe(false);
  });

  it("accepts all recommendation values", () => {
    for (const recommendation of ["strong_fund", "fund", "conditional", "reject"] as const) {
      const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, recommendation });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid recommendation value", () => {
    const result = JudgeEvaluationSchema.safeParse({ ...validEvaluation, recommendation: "maybe" });
    expect(result.success).toBe(false);
  });

  it("rejects justification over 2000 chars", () => {
    const result = JudgeEvaluationSchema.safeParse({
      ...validEvaluation,
      justification: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts justification at exactly 2000 chars", () => {
    const result = JudgeEvaluationSchema.safeParse({
      ...validEvaluation,
      justification: "a".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects keyFindings with more than 3 items", () => {
    const result = JudgeEvaluationSchema.safeParse({
      ...validEvaluation,
      keyFindings: ["a", "b", "c", "d"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts keyFindings with exactly 3 items", () => {
    const result = JudgeEvaluationSchema.safeParse({
      ...validEvaluation,
      keyFindings: ["a", "b", "c"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty keyFindings array", () => {
    const result = JudgeEvaluationSchema.safeParse({
      ...validEvaluation,
      keyFindings: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects risks with more than 3 items", () => {
    const result = JudgeEvaluationSchema.safeParse({
      ...validEvaluation,
      risks: ["a", "b", "c", "d"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty risks array", () => {
    const result = JudgeEvaluationSchema.safeParse({
      ...validEvaluation,
      risks: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = JudgeEvaluationSchema.safeParse({
      score: 5000,
    });
    expect(result.success).toBe(false);
  });
});

describe("MarketValidationSchema", () => {
  const validMarketValidation = {
    gapType: "full" as const,
    competitorCount: 3,
    similarProjectsFound: 5,
    marketCoherenceScore: 7500,
    researchConfidence: "high" as const,
    coherenceFlags: [
      { dimension: "tech", issue: "Minor concern", severity: "info" as const },
    ],
    recommendsReview: false,
  };

  it("accepts valid market validation data", () => {
    const result = MarketValidationSchema.safeParse(validMarketValidation);
    expect(result.success).toBe(true);
  });

  it("accepts all gapType values", () => {
    for (const gapType of ["full", "partial", "false"] as const) {
      const result = MarketValidationSchema.safeParse({ ...validMarketValidation, gapType });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid gapType", () => {
    const result = MarketValidationSchema.safeParse({ ...validMarketValidation, gapType: "none" });
    expect(result.success).toBe(false);
  });

  it("rejects negative competitorCount", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      competitorCount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero competitorCount", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      competitorCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer competitorCount", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      competitorCount: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative similarProjectsFound", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      similarProjectsFound: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts marketCoherenceScore at boundaries", () => {
    for (const score of [0, 10000]) {
      const result = MarketValidationSchema.safeParse({
        ...validMarketValidation,
        marketCoherenceScore: score,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects marketCoherenceScore above 10000", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      marketCoherenceScore: 10001,
    });
    expect(result.success).toBe(false);
  });

  it("rejects marketCoherenceScore below 0", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      marketCoherenceScore: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer marketCoherenceScore", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      marketCoherenceScore: 75.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all researchConfidence values", () => {
    for (const researchConfidence of ["high", "medium", "low"] as const) {
      const result = MarketValidationSchema.safeParse({
        ...validMarketValidation,
        researchConfidence,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all coherenceFlag severity values", () => {
    for (const severity of ["critical", "warning", "info"] as const) {
      const result = MarketValidationSchema.safeParse({
        ...validMarketValidation,
        coherenceFlags: [{ dimension: "cost", issue: "test", severity }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid coherenceFlag severity", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      coherenceFlags: [{ dimension: "cost", issue: "test", severity: "extreme" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty coherenceFlags array", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      coherenceFlags: [],
    });
    expect(result.success).toBe(true);
  });

  it("requires recommendsReview to be boolean", () => {
    const result = MarketValidationSchema.safeParse({
      ...validMarketValidation,
      recommendsReview: "yes",
    });
    expect(result.success).toBe(false);
  });
});
