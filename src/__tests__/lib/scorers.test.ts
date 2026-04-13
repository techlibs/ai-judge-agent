import { describe, it, expect, mock, beforeEach } from "bun:test";

const mockFaithScore = mock(() => Promise.resolve({ score: 0.85 }));
const mockHallucScore = mock(() => Promise.resolve({ score: 0.1 }));
const mockAlignScore = mock(() => Promise.resolve({ score: 0.9 }));

mock.module("@mastra/evals/scorers/prebuilt", () => ({
  createFaithfulnessScorer: () => ({ score: mockFaithScore }),
  createHallucinationScorer: () => ({ score: mockHallucScore }),
  createPromptAlignmentScorerLLM: () => ({ score: mockAlignScore }),
}));

// Dynamic import AFTER mocking
const { runQualityScorers } = await import("@/lib/evaluation/scorers");

describe("runQualityScorers", () => {
  beforeEach(() => {
    mockFaithScore.mockClear();
    mockHallucScore.mockClear();
    mockAlignScore.mockClear();
    // Reset to defaults
    mockFaithScore.mockResolvedValue({ score: 0.85 });
    mockHallucScore.mockResolvedValue({ score: 0.1 });
    mockAlignScore.mockResolvedValue({ score: 0.9 });
  });

  it("returns no flag when all pass thresholds", async () => {
    const result = await runQualityScorers({
      proposalContext: "Test proposal",
      justification: "Well-grounded justification",
      promptText: "System prompt",
    });
    expect(result.qualityFlag).toBe(false);
    expect(result.faithfulness).toBe(0.85);
  });

  it("flags when faithfulness below 0.7", async () => {
    mockFaithScore.mockResolvedValue({ score: 0.5 });
    const result = await runQualityScorers({
      proposalContext: "Test",
      justification: "Poor",
      promptText: "Prompt",
    });
    expect(result.qualityFlag).toBe(true);
  });

  it("flags when hallucination above 0.3", async () => {
    mockHallucScore.mockResolvedValue({ score: 0.5 });
    const result = await runQualityScorers({
      proposalContext: "Test",
      justification: "Fabricated",
      promptText: "Prompt",
    });
    expect(result.qualityFlag).toBe(true);
  });

  it("flags when prompt alignment below 0.7", async () => {
    mockAlignScore.mockResolvedValue({ score: 0.4 });
    const result = await runQualityScorers({
      proposalContext: "Test",
      justification: "Off-rubric",
      promptText: "Prompt",
    });
    expect(result.qualityFlag).toBe(true);
  });

  it("runs all 3 scorers", async () => {
    await runQualityScorers({
      proposalContext: "Test",
      justification: "Test",
      promptText: "Test",
    });
    expect(mockFaithScore).toHaveBeenCalledTimes(1);
    expect(mockHallucScore).toHaveBeenCalledTimes(1);
    expect(mockAlignScore).toHaveBeenCalledTimes(1);
  });
});
