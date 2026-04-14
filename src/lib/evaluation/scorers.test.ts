import { describe, it, expect, vi } from "vitest";

vi.mock("@mastra/evals/scorers/prebuilt", () => ({
  createFaithfulnessScorer: vi.fn(() => ({
    run: vi.fn().mockResolvedValue({ score: 0.92 }),
  })),
  createHallucinationScorer: vi.fn(() => ({
    run: vi.fn().mockResolvedValue({ score: 0.08 }),
  })),
  createPromptAlignmentScorerLLM: vi.fn(() => ({
    run: vi.fn().mockResolvedValue({ score: 0.88 }),
  })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mocked-model"),
}));

import { runQualityScorers } from "./scorers";

describe("runQualityScorers", () => {
  const defaultParams = {
    proposalContext: "A proposal about building decentralized infrastructure",
    justification: "The proposal demonstrates strong technical feasibility with clear architecture",
    promptText: "Evaluate the technical feasibility of this grant proposal",
  };

  it("returns quality scores from all three scorers", async () => {
    const result = await runQualityScorers(defaultParams);

    expect(result.faithfulness).toBe(0.92);
    expect(result.hallucination).toBe(0.08);
    expect(result.promptAlignment).toBe(0.88);
  });

  it("sets qualityFlag to false when all scores are within thresholds", async () => {
    const result = await runQualityScorers(defaultParams);
    // faithfulness 0.92 >= 0.7, hallucination 0.08 <= 0.3, alignment 0.88 >= 0.7
    expect(result.qualityFlag).toBe(false);
  });

  it("sets qualityFlag to true when faithfulness is below threshold", async () => {
    vi.resetModules();

    // Re-mock after reset
    vi.doMock("@mastra/evals/scorers/prebuilt", () => ({
      createFaithfulnessScorer: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ score: 0.5 }),
      })),
      createHallucinationScorer: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ score: 0.08 }),
      })),
      createPromptAlignmentScorerLLM: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ score: 0.88 }),
      })),
    }));
    vi.doMock("@ai-sdk/anthropic", () => ({
      anthropic: vi.fn(() => "mocked-model"),
    }));

    const { runQualityScorers: freshScorers } = await import("./scorers");
    const result = await freshScorers(defaultParams);
    expect(result.qualityFlag).toBe(true);
  });

  it("returns the correct QualityScores shape", async () => {
    const result = await runQualityScorers(defaultParams);

    expect(result).toHaveProperty("faithfulness");
    expect(result).toHaveProperty("hallucination");
    expect(result).toHaveProperty("promptAlignment");
    expect(result).toHaveProperty("qualityFlag");
    expect(typeof result.faithfulness).toBe("number");
    expect(typeof result.hallucination).toBe("number");
    expect(typeof result.promptAlignment).toBe("number");
    expect(typeof result.qualityFlag).toBe("boolean");
  });
});
