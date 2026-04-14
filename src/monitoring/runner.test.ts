import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mocked-model"),
}));

vi.mock("@/evaluation/schemas", () => ({
  MonitoringScoreSchema: {
    _type: "zod-schema-mock",
  },
}));

vi.mock("./agent-config", () => ({
  MONITOR_SYSTEM_PROMPT: "You are a monitor agent.",
  MONITOR_MODEL_ID: "claude-sonnet-4-6",
}));

import { runMonitorAgent, MonitoringTimeoutError } from "./runner";
import { generateObject } from "ai";

const mockedGenerateObject = vi.mocked(generateObject);

const SAMPLE_INPUT = {
  projectId: "proj-001",
  projectName: "Test Project",
  githubMetrics: {
    commitFrequency: 10,
    issueVelocity: 5,
    releases: 2,
  },
  onChainMetrics: {
    transactionCount: 42,
    fundUtilization: 0.7,
  },
  socialMetrics: {
    announcements: 3,
    communityEngagement: 7,
  },
} as const;

const SAMPLE_SCORE = {
  score: 8,
  justification:
    "Strong project health with consistent commit activity and good fund utilization at 70 percent.",
  githubMetrics: {
    commitFrequency: 10,
    issueVelocity: 5,
    releases: 2,
  },
  onChainMetrics: {
    transactionCount: 42,
    fundUtilization: 0.7,
  },
  socialMetrics: {
    announcements: 3,
    communityEngagement: 7,
  },
  riskFlags: [],
};

describe("runMonitorAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("returns a MonitoringScore from generateObject", async () => {
    mockedGenerateObject.mockResolvedValue({
      object: SAMPLE_SCORE,
      finishReason: "stop",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      request: {},
      response: {
        id: "test",
        timestamp: new Date(),
        modelId: "claude-sonnet-4-6",
        headers: {},
      },
      toJsonResponse: vi.fn(),
      warnings: undefined,
      providerMetadata: undefined,
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const resultPromise = runMonitorAgent(SAMPLE_INPUT);
    // Advance timers to avoid hanging
    vi.advanceTimersByTime(0);
    const result = await resultPromise;

    expect(result).toEqual(SAMPLE_SCORE);
    expect(mockedGenerateObject).toHaveBeenCalledOnce();

    const callArgs = mockedGenerateObject.mock.calls[0]?.[0];
    expect(callArgs?.system).toBe("You are a monitor agent.");
    expect(callArgs?.prompt).toContain("Test Project");
    expect(callArgs?.prompt).toContain("proj-001");
  });

  it("propagates errors from generateObject", async () => {
    mockedGenerateObject.mockRejectedValue(new Error("LLM call failed"));

    const resultPromise = runMonitorAgent(SAMPLE_INPUT);
    vi.advanceTimersByTime(0);

    await expect(resultPromise).rejects.toThrow("LLM call failed");
  });

  it("throws MonitoringTimeoutError on abort", async () => {
    // Simulate a long-running call that gets aborted by the timeout
    mockedGenerateObject.mockImplementation(
      ({ abortSignal }: { abortSignal?: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          abortSignal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
    );

    const resultPromise = runMonitorAgent(SAMPLE_INPUT);

    // Advance past the 90-second timeout
    vi.advanceTimersByTime(91_000);

    await expect(resultPromise).rejects.toThrow(MonitoringTimeoutError);
    await expect(resultPromise).rejects.toThrow(
      "Monitoring timed out for project: proj-001"
    );

    vi.useRealTimers();
  });
});

describe("MonitoringTimeoutError", () => {
  it("has the correct name and message", () => {
    const error = new MonitoringTimeoutError("proj-abc");
    expect(error.name).toBe("MonitoringTimeoutError");
    expect(error.message).toBe("Monitoring timed out for project: proj-abc");
    expect(error).toBeInstanceOf(Error);
  });
});
