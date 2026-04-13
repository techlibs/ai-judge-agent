import { describe, test, expect, mock, beforeEach } from "bun:test";
import {
  evaluationOutputSchema,
  DIMENSIONS,
  type EvaluationOutput,
} from "./schemas";
import { buildSystemPrompt, NAIVE_PROMPT } from "./prompts";
import { DIMENSION_WEIGHTS, SCORE_BANDS } from "./constants";

// --- Schema tests ---

describe("evaluationOutputSchema", () => {
  const validOutput: EvaluationOutput = {
    score: 75,
    justification: "Well-structured proposal with clear technical approach.",
    recommendation: "approve",
    keyFindings: ["Strong architecture", "Realistic timeline"],
  };

  test("accepts valid evaluation output", () => {
    const result = evaluationOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  test("rejects score above 100", () => {
    const result = evaluationOutputSchema.safeParse({
      ...validOutput,
      score: 101,
    });
    expect(result.success).toBe(false);
  });

  test("rejects score below 0", () => {
    const result = evaluationOutputSchema.safeParse({
      ...validOutput,
      score: -1,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-integer score", () => {
    const result = evaluationOutputSchema.safeParse({
      ...validOutput,
      score: 75.5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects more than 3 key findings", () => {
    const result = evaluationOutputSchema.safeParse({
      ...validOutput,
      keyFindings: ["a", "b", "c", "d"],
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty key findings", () => {
    const result = evaluationOutputSchema.safeParse({
      ...validOutput,
      keyFindings: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid recommendation", () => {
    const result = evaluationOutputSchema.safeParse({
      ...validOutput,
      recommendation: "maybe",
    });
    expect(result.success).toBe(false);
  });

  test("accepts all valid recommendations", () => {
    const recommendations = [
      "strong_approve",
      "approve",
      "needs_revision",
      "reject",
    ] as const;
    for (const rec of recommendations) {
      const result = evaluationOutputSchema.safeParse({
        ...validOutput,
        recommendation: rec,
      });
      expect(result.success).toBe(true);
    }
  });
});

// --- Constants tests ---

describe("DIMENSION_WEIGHTS", () => {
  test("weights sum to 1.0", () => {
    const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  test("all dimensions have weights", () => {
    for (const dim of DIMENSIONS) {
      expect(DIMENSION_WEIGHTS[dim]).toBeGreaterThan(0);
    }
  });
});

describe("SCORE_BANDS", () => {
  test("covers full 0-100 range without gaps", () => {
    const bands = Object.values(SCORE_BANDS);
    const sorted = [...bands].sort((a, b) => a.min - b.min);
    expect(sorted[0].min).toBe(0);
    expect(sorted[sorted.length - 1].max).toBe(100);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].min).toBe(sorted[i - 1].max + 1);
    }
  });
});

// --- Prompt tests ---

describe("buildSystemPrompt", () => {
  test("technical prompt includes dimension label", () => {
    const prompt = buildSystemPrompt("technical");
    expect(prompt).toContain("Technical Feasibility");
  });

  test("technical prompt includes isolation instruction", () => {
    const prompt = buildSystemPrompt("technical");
    expect(prompt).toContain("ONLY");
  });

  test("technical prompt includes scoring guidance", () => {
    const prompt = buildSystemPrompt("technical");
    expect(prompt).toContain("0-100 range");
  });

  test("technical prompt includes IPE City values", () => {
    const prompt = buildSystemPrompt("technical");
    expect(prompt).toContain("Pro-technological innovation");
  });

  test("impact prompt includes Impact Potential", () => {
    const prompt = buildSystemPrompt("impact");
    expect(prompt).toContain("Impact Potential");
  });

  test("cost prompt includes Cost Efficiency", () => {
    const prompt = buildSystemPrompt("cost");
    expect(prompt).toContain("Cost Efficiency");
  });

  test("team prompt includes Team Capability", () => {
    const prompt = buildSystemPrompt("team");
    expect(prompt).toContain("Team Capability");
  });

  test("each dimension prompt is unique", () => {
    const prompts = DIMENSIONS.map((dim) => buildSystemPrompt(dim));
    const uniquePrompts = new Set(prompts);
    expect(uniquePrompts.size).toBe(4);
  });

  test("all prompts include anti-injection instructions", () => {
    for (const dim of DIMENSIONS) {
      const prompt = buildSystemPrompt(dim);
      expect(prompt).toContain("ANTI-INJECTION");
    }
  });
});

describe("NAIVE_PROMPT", () => {
  test("is a simple string without rubric bands", () => {
    expect(NAIVE_PROMPT).not.toContain("81-100");
    expect(NAIVE_PROMPT).not.toContain("Exceptional");
    expect(typeof NAIVE_PROMPT).toBe("string");
    expect(NAIVE_PROMPT.length).toBeGreaterThan(0);
  });
});
