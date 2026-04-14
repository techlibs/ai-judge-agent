import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProposalInput, ProgressEvent } from "./workflow";

const mockGenerate = vi.fn();

vi.mock("@/lib/mastra", () => ({
  mastra: {
    getAgent: () => ({
      generate: mockGenerate,
    }),
  },
}));

vi.mock("@/lib/evaluation/scorers", () => ({
  runQualityScorers: vi.fn().mockResolvedValue({
    faithfulness: 0.9,
    hallucination: 0.1,
    promptAlignment: 0.85,
    meetsQuality: true,
  }),
}));

vi.mock("@/lib/security-log", () => ({
  logSecurityEvent: vi.fn(),
}));

function makeTestProposal(): ProposalInput {
  return {
    id: "test-proposal-001",
    title: "Solar Panel Network for Rural Communities",
    description: "Deploy distributed solar panels with IoT monitoring",
    problemStatement: "Rural communities lack reliable power",
    proposedSolution: "Distributed solar with mesh networking",
    teamMembers: [
      { name: "Alice", role: "Lead Engineer" },
      { name: "Bob", role: "Community Liaison" },
    ],
    budgetAmount: 50000,
    budgetBreakdown: "Hardware: $30k, Labor: $15k, Overhead: $5k",
    timeline: "12 weeks",
    category: "infrastructure",
    residencyDuration: "4-weeks",
    demoDayDeliverable: "Working prototype with 5 connected panels",
    communityContribution: "Training materials for local technicians",
    priorIpeParticipation: false,
    links: ["https://example.com/project"],
  };
}

function makeJudgeOutput(score: number) {
  return {
    object: {
      score,
      confidence: "high" as const,
      recommendation: "fund" as const,
      justification: "Strong proposal with clear deliverables and experienced team members",
      keyFindings: ["Solid technical approach", "Clear budget"],
      risks: ["Timeline may be tight"],
      ipeAlignment: {
        proTechnology: 80,
        proFreedom: 70,
        proHumanProgress: 90,
      },
    },
  };
}

describe("runEvaluationWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs all 4 judges in parallel and returns aggregate result", async () => {
    mockGenerate
      .mockResolvedValueOnce(makeJudgeOutput(7500))
      .mockResolvedValueOnce(makeJudgeOutput(8000))
      .mockResolvedValueOnce(makeJudgeOutput(6500))
      .mockResolvedValueOnce(makeJudgeOutput(7000));

    const { runEvaluationWorkflow } = await import("./workflow");
    const result = await runEvaluationWorkflow(makeTestProposal());

    expect(result.proposalId).toBe("test-proposal-001");
    expect(result.dimensions).toHaveLength(4);
    expect(result.aggregateScoreBps).toBeGreaterThan(0);
    expect(result.evaluatedAt).toBeTruthy();
    expect(mockGenerate).toHaveBeenCalledTimes(4);
  });

  it("emits progress events in correct order", async () => {
    mockGenerate.mockResolvedValue(makeJudgeOutput(7500));

    const { runEvaluationWorkflow } = await import("./workflow");
    const events: ProgressEvent[] = [];

    await runEvaluationWorkflow(makeTestProposal(), (event) => {
      events.push(event);
    });

    const eventTypes = events.map((e) => e.type);

    expect(eventTypes[0]).toBe("evaluation:start");
    expect(eventTypes.filter((t) => t === "judge:start")).toHaveLength(4);
    expect(eventTypes.filter((t) => t === "judge:complete")).toHaveLength(4);
    expect(eventTypes[eventTypes.length - 1]).toBe("evaluation:complete");
  });

  it("throws when a judge exhausts all retries", { timeout: 30_000 }, async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGenerate.mockRejectedValue(new Error("LLM timeout"));

    const { runEvaluationWorkflow } = await import("./workflow");

    await expect(
      runEvaluationWorkflow(makeTestProposal())
    ).rejects.toThrow("Evaluation failed for dimensions");

    vi.useRealTimers();
  });

  it("detects anomalous scores", async () => {
    // All scores extremely high — should trigger anomaly
    mockGenerate.mockResolvedValue(makeJudgeOutput(9800));

    const { runEvaluationWorkflow } = await import("./workflow");
    const result = await runEvaluationWorkflow(makeTestProposal());

    expect(result.anomalyFlags).toContain("ALL_SCORES_SUSPICIOUSLY_HIGH");
  });
});
