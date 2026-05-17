import { describe, it, expect } from "vitest";
import {
  DimensionScoreSchema,
  SanitizedProposalSchema,
  EvaluationResultSchema,
  MonitoringScoreSchema,
  SCORING_DIMENSIONS,
} from "./schemas";

describe("DimensionScoreSchema", () => {
  const validScore = {
    dimension: "technical_feasibility" as const,
    score: 7.5,
    inputDataConsidered: ["description", "budget"],
    rubricApplied: { criteria: ["feasibility", "scalability"] },
    reasoningChain:
      "The proposal demonstrates strong technical foundations with clear architecture decisions and appropriate tech stack choices.",
  };

  it("accepts valid dimension score", () => {
    const result = DimensionScoreSchema.safeParse(validScore);
    expect(result.success).toBe(true);
  });

  it("accepts all valid dimension values", () => {
    for (const dimension of SCORING_DIMENSIONS) {
      const result = DimensionScoreSchema.safeParse({ ...validScore, dimension });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid dimension value", () => {
    const result = DimensionScoreSchema.safeParse({ ...validScore, dimension: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts score at min boundary (0)", () => {
    const result = DimensionScoreSchema.safeParse({ ...validScore, score: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts score at max boundary (10)", () => {
    const result = DimensionScoreSchema.safeParse({ ...validScore, score: 10 });
    expect(result.success).toBe(true);
  });

  it("rejects score below 0", () => {
    const result = DimensionScoreSchema.safeParse({ ...validScore, score: -0.1 });
    expect(result.success).toBe(false);
  });

  it("rejects score above 10", () => {
    const result = DimensionScoreSchema.safeParse({ ...validScore, score: 10.1 });
    expect(result.success).toBe(false);
  });

  it("rejects empty inputDataConsidered array", () => {
    const result = DimensionScoreSchema.safeParse({
      ...validScore,
      inputDataConsidered: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty criteria array", () => {
    const result = DimensionScoreSchema.safeParse({
      ...validScore,
      rubricApplied: { criteria: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects reasoningChain under 50 characters", () => {
    const result = DimensionScoreSchema.safeParse({
      ...validScore,
      reasoningChain: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts reasoningChain at exactly 50 characters", () => {
    const result = DimensionScoreSchema.safeParse({
      ...validScore,
      reasoningChain: "x".repeat(50),
    });
    expect(result.success).toBe(true);
  });
});

describe("SanitizedProposalSchema", () => {
  const validProposal = {
    title: "Developer Toolkit",
    description: "A comprehensive toolkit for developers",
    budgetAmount: 50000,
    budgetCurrency: "USDC",
    budgetBreakdown: [
      { category: "Development", amount: 30000, description: "Core dev work" },
    ],
    technicalDescription: "Built with TypeScript and Next.js",
    teamSize: 3,
    teamProfileHash: "abc123def456",
    category: "infrastructure",
  };

  it("accepts valid sanitized proposal", () => {
    const result = SanitizedProposalSchema.safeParse(validProposal);
    expect(result.success).toBe(true);
  });

  it("rejects title over 200 chars", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 10000 chars", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      description: "a".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects budgetCurrency over 10 chars", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      budgetCurrency: "a".repeat(11),
    });
    expect(result.success).toBe(false);
  });

  it("rejects budgetBreakdown with more than 20 items", () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      category: `Cat${i}`,
      amount: 1000,
      description: "desc",
    }));
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      budgetBreakdown: items,
    });
    expect(result.success).toBe(false);
  });

  it("accepts budgetBreakdown with exactly 20 items", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      category: `Cat${i}`,
      amount: 1000,
      description: "desc",
    }));
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      budgetBreakdown: items,
    });
    expect(result.success).toBe(true);
  });

  it("rejects breakdown item category over 100 chars", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      budgetBreakdown: [
        { category: "a".repeat(101), amount: 1000, description: "desc" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects breakdown item description over 500 chars", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      budgetBreakdown: [
        { category: "Dev", amount: 1000, description: "a".repeat(501) },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects technicalDescription over 10000 chars", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      technicalDescription: "a".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects category over 100 chars", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      category: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty budgetBreakdown array", () => {
    const result = SanitizedProposalSchema.safeParse({
      ...validProposal,
      budgetBreakdown: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("EvaluationResultSchema", () => {
  const validDimensionScore = {
    dimension: "technical_feasibility" as const,
    score: 7.5,
    inputDataConsidered: ["description"],
    rubricApplied: { criteria: ["feasibility"] },
    reasoningChain:
      "This is a test reasoning chain that is at least fifty characters long for validation purposes.",
  };

  const validResult = {
    proposalId: "prop-123",
    scores: [
      { ...validDimensionScore, dimension: "technical_feasibility" as const },
      { ...validDimensionScore, dimension: "impact_potential" as const },
      { ...validDimensionScore, dimension: "cost_efficiency" as const },
      { ...validDimensionScore, dimension: "team_capability" as const },
    ],
    weightedTotal: 7.55,
    evaluatedAt: "2026-01-15T10:30:00Z",
    modelId: "claude-sonnet-4-6",
    contentHash: "abc123",
  };

  it("accepts valid evaluation result", () => {
    const result = EvaluationResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it("requires exactly 4 scores (one per dimension)", () => {
    const result = EvaluationResultSchema.safeParse({
      ...validResult,
      scores: [validDimensionScore, validDimensionScore, validDimensionScore],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 scores", () => {
    const result = EvaluationResultSchema.safeParse({
      ...validResult,
      scores: [
        ...validResult.scores,
        { ...validDimensionScore, dimension: "technical_feasibility" as const },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects weightedTotal below 0", () => {
    const result = EvaluationResultSchema.safeParse({
      ...validResult,
      weightedTotal: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weightedTotal above 10", () => {
    const result = EvaluationResultSchema.safeParse({
      ...validResult,
      weightedTotal: 11,
    });
    expect(result.success).toBe(false);
  });

  it("accepts weightedTotal at boundaries (0 and 10)", () => {
    for (const total of [0, 10]) {
      const result = EvaluationResultSchema.safeParse({
        ...validResult,
        weightedTotal: total,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid datetime format for evaluatedAt", () => {
    const result = EvaluationResultSchema.safeParse({
      ...validResult,
      evaluatedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects evaluatedAt without time component", () => {
    const result = EvaluationResultSchema.safeParse({
      ...validResult,
      evaluatedAt: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });
});

describe("MonitoringScoreSchema", () => {
  const validMonitoring = {
    score: 7.5,
    justification:
      "The project shows consistent progress with regular commits and community engagement over the monitoring period.",
    githubMetrics: {
      commitFrequency: 12,
      issueVelocity: 5,
      releases: 2,
    },
    onChainMetrics: {
      transactionCount: 45,
      fundUtilization: 0.65,
    },
    socialMetrics: {
      announcements: 3,
      communityEngagement: 7.5,
    },
    riskFlags: [],
  };

  it("accepts valid monitoring score", () => {
    const result = MonitoringScoreSchema.safeParse(validMonitoring);
    expect(result.success).toBe(true);
  });

  it("rejects score below 0", () => {
    const result = MonitoringScoreSchema.safeParse({ ...validMonitoring, score: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects score above 10", () => {
    const result = MonitoringScoreSchema.safeParse({ ...validMonitoring, score: 11 });
    expect(result.success).toBe(false);
  });

  it("accepts score at boundaries (0 and 10)", () => {
    for (const score of [0, 10]) {
      const result = MonitoringScoreSchema.safeParse({ ...validMonitoring, score });
      expect(result.success).toBe(true);
    }
  });

  it("rejects justification under 50 characters", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      justification: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts justification at exactly 50 characters", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      justification: "x".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects fundUtilization below 0", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      onChainMetrics: { ...validMonitoring.onChainMetrics, fundUtilization: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects fundUtilization above 1", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      onChainMetrics: { ...validMonitoring.onChainMetrics, fundUtilization: 1.1 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts fundUtilization at boundaries (0 and 1)", () => {
    for (const fundUtilization of [0, 1]) {
      const result = MonitoringScoreSchema.safeParse({
        ...validMonitoring,
        onChainMetrics: { ...validMonitoring.onChainMetrics, fundUtilization },
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid riskFlag types", () => {
    for (const type of ["inactivity", "fund_misuse", "scope_drift", "team_change"] as const) {
      const result = MonitoringScoreSchema.safeParse({
        ...validMonitoring,
        riskFlags: [{ type, severity: "medium", description: "Some risk" }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid riskFlag type", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      riskFlags: [{ type: "unknown", severity: "medium", description: "Some risk" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid riskFlag severity values", () => {
    for (const severity of ["low", "medium", "high"] as const) {
      const result = MonitoringScoreSchema.safeParse({
        ...validMonitoring,
        riskFlags: [{ type: "inactivity", severity, description: "Some risk" }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid riskFlag severity", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      riskFlags: [{ type: "inactivity", severity: "critical", description: "Some risk" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty riskFlags array", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      riskFlags: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple riskFlags", () => {
    const result = MonitoringScoreSchema.safeParse({
      ...validMonitoring,
      riskFlags: [
        { type: "inactivity", severity: "high", description: "No commits in 2 weeks" },
        { type: "scope_drift", severity: "medium", description: "Deliverables changed" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
