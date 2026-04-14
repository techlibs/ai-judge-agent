import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProposalInput, EvaluationResult } from "@/lib/evaluation/workflow";
import { computeAggregateScore } from "@/lib/judges/scoring";
import { proposalFormSchema } from "@/app/grants/submit/schema";
import { ProposalSubmissionSchema } from "@/lib/evaluation/proposal-schema";
import { computeProposalId, prepareSubmitScore } from "@/chain/evaluation-registry";

/**
 * End-to-end integration test: Submit Proposal → Evaluate → Prepare On-Chain Publish
 *
 * This test covers the full lifecycle without hitting real LLM APIs or the blockchain.
 * It validates that data flows correctly through each stage:
 *   1. Form validation (Zod schemas)
 *   2. Evaluation workflow (mocked LLM, real scoring/aggregation)
 *   3. On-chain data preparation (proposal ID hashing, score encoding, ABI encoding)
 */

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
    faithfulness: 0.92,
    hallucination: 0.08,
    promptAlignment: 0.88,
    qualityFlag: false,
  }),
}));

vi.mock("@/lib/security-log", () => ({
  logSecurityEvent: vi.fn(),
}));

function makeFormData() {
  return {
    title: "Decentralized Water Monitoring for IPE City",
    description:
      "Deploy IoT sensors in local water systems with on-chain data reporting for real-time water quality transparency.",
    problemStatement:
      "Residents lack visibility into water quality, and municipal reports are delayed by weeks.",
    proposedSolution:
      "Install 50 IoT sensors connected to a public dashboard with daily on-chain attestations.",
    teamMembers: [
      { name: "Maria Silva", role: "Hardware Engineer" },
      { name: "João Costa", role: "Full-Stack Developer" },
      { name: "Ana Oliveira", role: "Community Organizer" },
    ],
    budgetAmount: 42000,
    budgetBreakdown:
      "Sensors: $18k, Installation: $8k, Software: $10k, Community outreach: $4k, Contingency: $2k",
    timeline: "16 weeks from project kickoff to final delivery",
    category: "infrastructure",
    residencyDuration: "4-weeks",
    demoDayDeliverable:
      "Live dashboard with 10 connected sensors showing real-time readings",
    communityContribution:
      "Open-source hardware design + training materials in Portuguese",
    priorIpeParticipation: true,
    links: ["https://github.com/water-monitoring-ipe"],
  };
}

function makeJudgeOutput(score: number) {
  return {
    object: {
      score,
      confidence: "high" as const,
      recommendation: "fund" as const,
      justification:
        "The proposal demonstrates strong technical feasibility with a clear implementation plan and experienced team.",
      keyFindings: [
        "Well-defined hardware specifications",
        "Clear community engagement plan",
        "Realistic budget breakdown",
      ],
      risks: ["Supply chain delays for IoT sensors"],
      ipeAlignment: {
        proTechnology: 85,
        proFreedom: 75,
        proHumanProgress: 90,
      },
    },
  };
}

describe("E2E: Submit → Evaluate → Publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates proposal through form schema", () => {
    const formData = makeFormData();
    const result = proposalFormSchema.safeParse(formData);

    expect(result.success).toBe(true);
  });

  it("validates proposal through API submission schema", () => {
    const formData = makeFormData();
    const result = ProposalSubmissionSchema.safeParse(formData);

    expect(result.success).toBe(true);
  });

  it("rejects invalid proposals at validation boundary", () => {
    const invalidData = {
      ...makeFormData(),
      title: "", // too short
      budgetAmount: -500, // negative
      teamMembers: [], // empty
    };

    const formResult = proposalFormSchema.safeParse(invalidData);
    expect(formResult.success).toBe(false);

    if (!formResult.success) {
      const fields = Object.keys(formResult.error.flatten().fieldErrors);
      expect(fields).toContain("title");
    }
  });

  it("runs full evaluation workflow and produces valid aggregate score", async () => {
    // Simulate 4 judges with different scores
    mockGenerate
      .mockResolvedValueOnce(makeJudgeOutput(7200)) // tech: 72%
      .mockResolvedValueOnce(makeJudgeOutput(8500)) // impact: 85%
      .mockResolvedValueOnce(makeJudgeOutput(6800)) // cost: 68%
      .mockResolvedValueOnce(makeJudgeOutput(7600)); // team: 76%

    const { runEvaluationWorkflow } = await import(
      "@/lib/evaluation/workflow"
    );

    const proposal: ProposalInput = {
      id: "e2e-test-001",
      ...makeFormData(),
    };

    const result = await runEvaluationWorkflow(proposal);

    // All 4 dimensions evaluated
    expect(result.dimensions).toHaveLength(4);
    expect(result.proposalId).toBe("e2e-test-001");

    // Aggregate score computed with correct weights
    // tech (25%): 7200, impact (30%): 8500, cost (20%): 6800, team (25%): 7600
    const expectedAggregate = computeAggregateScore({
      tech: 7200,
      impact: 8500,
      cost: 6800,
      team: 7600,
    });
    expect(result.aggregateScoreBps).toBe(expectedAggregate);

    // Score is in valid basis points range
    expect(result.aggregateScoreBps).toBeGreaterThan(0);
    expect(result.aggregateScoreBps).toBeLessThanOrEqual(10000);

    // Each dimension has quality scores from scorer pipeline
    for (const dim of result.dimensions) {
      expect(dim.qualityScores).not.toBeNull();
      expect(dim.qualityScores?.qualityFlag).toBe(false);
    }

    // Timestamp is valid ISO string
    expect(new Date(result.evaluatedAt).toISOString()).toBe(
      result.evaluatedAt
    );

    return result;
  });

  it("prepares valid on-chain data from evaluation result", async () => {
    mockGenerate.mockResolvedValue(makeJudgeOutput(7500));

    const { runEvaluationWorkflow } = await import(
      "@/lib/evaluation/workflow"
    );

    const proposal: ProposalInput = {
      id: "e2e-chain-test",
      ...makeFormData(),
    };

    const result: EvaluationResult = await runEvaluationWorkflow(proposal);

    // Compute the on-chain proposal ID (keccak256 hash)
    const proposalIdHash = computeProposalId("ipe-city", result.proposalId);
    expect(proposalIdHash).toMatch(/^0x[0-9a-f]{64}$/);

    // Build the ABI-encoded submitScore call data
    const fundingRoundId =
      "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
    const proposalCid = "QmTestProposalCid123456789";
    const evaluationCid = "QmTestEvaluationCid987654321";

    const callData = prepareSubmitScore({
      proposalId: proposalIdHash,
      fundingRoundId,
      finalScore: result.aggregateScoreBps / 100, // bps → percentage (0-100)
      reputationMultiplier: 1,
      proposalContentCid: proposalCid,
      evaluationContentCid: evaluationCid,
    });

    // Should produce valid ABI-encoded hex data
    expect(callData).toMatch(/^0x[0-9a-f]+$/);
    // submitScore selector is the first 4 bytes (8 hex chars after 0x)
    expect(callData.length).toBeGreaterThan(10);
  });

  it("tracks progress events through the full pipeline", async () => {
    mockGenerate.mockResolvedValue(makeJudgeOutput(8000));

    const { runEvaluationWorkflow } = await import(
      "@/lib/evaluation/workflow"
    );

    const events: Array<{ type: string; dimension?: string }> = [];

    await runEvaluationWorkflow(
      { id: "e2e-progress-test", ...makeFormData() },
      (event) => {
        events.push({ type: event.type, dimension: event.dimension });
      }
    );

    // Verify correct event sequence
    expect(events[0]?.type).toBe("evaluation:start");

    const judgeStarts = events.filter((e) => e.type === "judge:start");
    const judgeCompletes = events.filter((e) => e.type === "judge:complete");

    expect(judgeStarts).toHaveLength(4);
    expect(judgeCompletes).toHaveLength(4);

    // All 4 dimensions were evaluated
    const completedDimensions = judgeCompletes.map((e) => e.dimension);
    expect(completedDimensions).toContain("tech");
    expect(completedDimensions).toContain("impact");
    expect(completedDimensions).toContain("cost");
    expect(completedDimensions).toContain("team");

    // Last event is evaluation:complete
    expect(events[events.length - 1]?.type).toBe("evaluation:complete");
  });
});
