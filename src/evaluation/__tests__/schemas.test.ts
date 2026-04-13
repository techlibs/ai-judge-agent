import { describe, it, expect } from "vitest";
import { DimensionScoreSchema, SanitizedProposalSchema } from "@/evaluation/schemas";

const VALID_DIMENSION_SCORE = {
  dimension: "technical_feasibility" as const,
  score: 7.5,
  inputDataConsidered: ["architecture", "tech stack"],
  rubricApplied: { criteria: ["feasibility", "complexity"] },
  reasoningChain:
    "The proposal demonstrates a clear technical approach using well-established technologies with concrete implementation steps.",
};

describe("DimensionScoreSchema", () => {
  it("accepts a valid dimension score object", () => {
    const result = DimensionScoreSchema.safeParse(VALID_DIMENSION_SCORE);
    expect(result.success).toBe(true);
  });

  it("accepts all valid dimension values", () => {
    const dimensions = [
      "technical_feasibility",
      "impact_potential",
      "cost_efficiency",
      "team_capability",
    ] as const;

    for (const dimension of dimensions) {
      const result = DimensionScoreSchema.safeParse({
        ...VALID_DIMENSION_SCORE,
        dimension,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects score below 0", () => {
    const result = DimensionScoreSchema.safeParse({
      ...VALID_DIMENSION_SCORE,
      score: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects score above 10", () => {
    const result = DimensionScoreSchema.safeParse({
      ...VALID_DIMENSION_SCORE,
      score: 10.1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts score at boundary values 0 and 10", () => {
    expect(DimensionScoreSchema.safeParse({ ...VALID_DIMENSION_SCORE, score: 0 }).success).toBe(true);
    expect(DimensionScoreSchema.safeParse({ ...VALID_DIMENSION_SCORE, score: 10 }).success).toBe(true);
  });

  it("rejects invalid dimension string", () => {
    const result = DimensionScoreSchema.safeParse({
      ...VALID_DIMENSION_SCORE,
      dimension: "unknown_dimension",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty inputDataConsidered array", () => {
    const result = DimensionScoreSchema.safeParse({
      ...VALID_DIMENSION_SCORE,
      inputDataConsidered: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty criteria array in rubricApplied", () => {
    const result = DimensionScoreSchema.safeParse({
      ...VALID_DIMENSION_SCORE,
      rubricApplied: { criteria: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects reasoningChain shorter than 50 characters", () => {
    const result = DimensionScoreSchema.safeParse({
      ...VALID_DIMENSION_SCORE,
      reasoningChain: "Too short.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { dimension: _d, ...withoutDimension } = VALID_DIMENSION_SCORE;
    expect(DimensionScoreSchema.safeParse(withoutDimension).success).toBe(false);

    const { score: _s, ...withoutScore } = VALID_DIMENSION_SCORE;
    expect(DimensionScoreSchema.safeParse(withoutScore).success).toBe(false);
  });
});

const VALID_SANITIZED_PROPOSAL = {
  title: "Build an open grant tracking dashboard",
  description: "A dashboard for tracking grant allocations across communities.",
  budgetAmount: 50000,
  budgetCurrency: "USD",
  budgetBreakdown: [
    {
      category: "Engineering",
      amount: 30000,
      description: "Core development work",
    },
  ],
  technicalDescription: "Built with Next.js and on-chain data feeds.",
  teamSize: 3,
  teamProfileHash: "0xabc123def456",
  category: "infrastructure",
};

describe("SanitizedProposalSchema", () => {
  it("accepts a valid sanitized proposal", () => {
    const result = SanitizedProposalSchema.safeParse(VALID_SANITIZED_PROPOSAL);
    expect(result.success).toBe(true);
  });

  it("rejects title longer than 200 characters", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...VALID_SANITIZED_PROPOSAL,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 10000 characters", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...VALID_SANITIZED_PROPOSAL,
      description: "x".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 budget breakdown items", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...VALID_SANITIZED_PROPOSAL,
      budgetBreakdown: Array.from({ length: 21 }, (_, i) => ({
        category: "Cat",
        amount: i + 1,
        description: "desc",
      })),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty budget breakdown array", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...VALID_SANITIZED_PROPOSAL,
      budgetBreakdown: [],
    });
    expect(result.success).toBe(true);
  });
});
