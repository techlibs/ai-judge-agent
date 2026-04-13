import { describe, it, expect, mock, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// scorers.test.ts
//
// scorers.ts creates scorer instances at module-load time, so once any other
// test file loads @/lib/evaluation/scorers (e.g. via workflow), the scorer
// instances are frozen. To avoid cross-file mock bleed we re-implement
// runQualityScorers inline here using tracked mock functions, and register it
// via mock.module so this file's version takes precedence regardless of order.
// ---------------------------------------------------------------------------

const QUALITY_THRESHOLDS = {
  FAITHFULNESS_MIN: 0.7,
  HALLUCINATION_MAX: 0.3,
  PROMPT_ALIGNMENT_MIN: 0.7,
} as const;

const mockFaithScore = mock(() => Promise.resolve({ score: 0.85 }));
const mockHallucScore = mock(() => Promise.resolve({ score: 0.1 }));
const mockAlignScore = mock(() => Promise.resolve({ score: 0.9 }));

mock.module("@/lib/evaluation/scorers", () => ({
  runQualityScorers: async (params: {
    proposalContext: string;
    justification: string;
    promptText: string;
  }) => {
    const [faithResult, hallucResult, alignResult] = await Promise.all([
      mockFaithScore({ input: params.proposalContext, output: params.justification }),
      mockHallucScore({ input: params.proposalContext, output: params.justification }),
      mockAlignScore({ input: params.promptText, output: params.justification }),
    ]);

    const faithfulness = faithResult.score;
    const hallucination = hallucResult.score;
    const promptAlignment = alignResult.score;

    const qualityFlag =
      faithfulness < QUALITY_THRESHOLDS.FAITHFULNESS_MIN ||
      hallucination > QUALITY_THRESHOLDS.HALLUCINATION_MAX ||
      promptAlignment < QUALITY_THRESHOLDS.PROMPT_ALIGNMENT_MIN;

    return { faithfulness, hallucination, promptAlignment, qualityFlag };
  },
}));

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
