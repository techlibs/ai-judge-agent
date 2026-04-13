import { describe, it, expect } from "bun:test";
import { JudgeEvaluationSchema, IpeAlignmentSchema } from "@/lib/judges/schemas";

describe("JudgeEvaluationSchema", () => {
  const validEvaluation = {
    score: 7500,
    confidence: "high" as const,
    recommendation: "fund" as const,
    justification: "Strong proposal with clear technical approach.",
    keyFindings: ["Solid architecture", "Experienced team"],
    risks: ["Timeline ambitious"],
    ipeAlignment: { proTechnology: 80, proFreedom: 70, proHumanProgress: 90 },
  };

  it("accepts a valid evaluation", () => {
    expect(JudgeEvaluationSchema.safeParse(validEvaluation).success).toBe(true);
  });

  it("rejects score above 10000", () => {
    expect(JudgeEvaluationSchema.safeParse({ ...validEvaluation, score: 10001 }).success).toBe(false);
  });

  it("rejects missing justification", () => {
    const { justification, ...noJustification } = validEvaluation;
    expect(JudgeEvaluationSchema.safeParse(noJustification).success).toBe(false);
  });

  it("rejects ipeAlignment values above 100", () => {
    expect(IpeAlignmentSchema.safeParse({ proTechnology: 101, proFreedom: 50, proHumanProgress: 50 }).success).toBe(false);
  });
});
