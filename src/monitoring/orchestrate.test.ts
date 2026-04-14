import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCollectGitHubMetrics = vi.fn();
const mockCollectOnChainMetrics = vi.fn();
const mockCollectSocialMetrics = vi.fn();
const mockRunMonitorAgent = vi.fn();
const mockPinJsonToIpfs = vi.fn();

vi.mock("./github", () => ({
  collectGitHubMetrics: (...args: unknown[]) =>
    mockCollectGitHubMetrics(...args),
  DEFAULT_PERIOD_DAYS: 14,
}));

vi.mock("./onchain", () => ({
  collectOnChainMetrics: (...args: unknown[]) =>
    mockCollectOnChainMetrics(...args),
}));

vi.mock("./social", () => ({
  collectSocialMetrics: (...args: unknown[]) =>
    mockCollectSocialMetrics(...args),
}));

vi.mock("./runner", () => ({
  runMonitorAgent: (...args: unknown[]) => mockRunMonitorAgent(...args),
}));

vi.mock("@/ipfs/pin", () => ({
  pinJsonToIpfs: (...args: unknown[]) => mockPinJsonToIpfs(...args),
}));

vi.mock("@/ipfs/schemas", () => ({
  MonitoringReportSchema: { parse: vi.fn((d: unknown) => d) },
}));

vi.mock("@/chain/contracts", () => ({
  getDeploymentBlock: () => 100n,
}));

import { orchestrateMonitoring } from "./orchestrate";

describe("monitoring/orchestrate", () => {
  const defaultParams = {
    projectId: "proj-001",
    projectName: "Test Project",
    projectAddress:
      "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
    githubOwner: "test-org",
    githubRepo: "test-repo",
    totalFunded: 1000000n,
  };

  const mockGithubMetrics = {
    commitFrequency: 5.2,
    issueVelocity: 3.1,
    releases: 2,
  };

  const mockOnChainMetrics = {
    transactionCount: 15,
    fundUtilization: 0.45,
  };

  const mockSocialMetrics = {
    announcements: 3,
    communityEngagement: 7,
  };

  const mockMonitoringScore = {
    score: 7.5,
    justification:
      "Project shows strong GitHub activity with regular commits and issue resolution. Fund utilization is healthy at 45%.",
    githubMetrics: mockGithubMetrics,
    onChainMetrics: mockOnChainMetrics,
    socialMetrics: mockSocialMetrics,
    riskFlags: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectGitHubMetrics.mockResolvedValue(mockGithubMetrics);
    mockCollectOnChainMetrics.mockResolvedValue(mockOnChainMetrics);
    mockCollectSocialMetrics.mockResolvedValue(mockSocialMetrics);
    mockRunMonitorAgent.mockResolvedValue(mockMonitoringScore);
    mockPinJsonToIpfs.mockResolvedValue("QmTestReportCid");
  });

  it("calls all three collectors in parallel", async () => {
    await orchestrateMonitoring(defaultParams);

    expect(mockCollectGitHubMetrics).toHaveBeenCalledTimes(1);
    expect(mockCollectGitHubMetrics).toHaveBeenCalledWith({
      owner: "test-org",
      repo: "test-repo",
      periodDays: 14,
    });

    expect(mockCollectOnChainMetrics).toHaveBeenCalledTimes(1);
    expect(mockCollectOnChainMetrics).toHaveBeenCalledWith({
      projectAddress: defaultParams.projectAddress,
      totalFunded: 1000000n,
      fromBlock: 100n,
    });

    expect(mockCollectSocialMetrics).toHaveBeenCalledTimes(1);
    expect(mockCollectSocialMetrics).toHaveBeenCalledWith({
      projectName: "Test Project",
    });
  });

  it("passes collected metrics to runMonitorAgent", async () => {
    await orchestrateMonitoring(defaultParams);

    expect(mockRunMonitorAgent).toHaveBeenCalledTimes(1);
    expect(mockRunMonitorAgent).toHaveBeenCalledWith({
      projectId: "proj-001",
      projectName: "Test Project",
      githubMetrics: mockGithubMetrics,
      onChainMetrics: mockOnChainMetrics,
      socialMetrics: mockSocialMetrics,
    });
  });

  it("pins the monitoring report to IPFS", async () => {
    await orchestrateMonitoring(defaultParams);

    expect(mockPinJsonToIpfs).toHaveBeenCalledTimes(1);
    const callArgs = mockPinJsonToIpfs.mock.calls[0] ?? [];
    const [_schema, report] = callArgs;
    expect(report).toMatchObject({
      version: 1,
      projectId: "proj-001",
      score: 7.5,
      githubMetrics: mockGithubMetrics,
      onChainMetrics: mockOnChainMetrics,
      socialMetrics: mockSocialMetrics,
      riskFlags: [],
    });
    expect(report.monitoredAt).toBeDefined();
  });

  it("returns the correct result structure", async () => {
    const result = await orchestrateMonitoring(defaultParams);

    expect(result).toEqual({
      projectId: "proj-001",
      score: 7.5,
      monitoringReportCid: "QmTestReportCid",
      riskFlags: [],
    });
  });

  it("includes risk flags in the result when present", async () => {
    const riskFlags = [
      {
        type: "inactivity",
        severity: "high",
        description: "No commits in 3 weeks",
      },
    ];
    mockRunMonitorAgent.mockResolvedValue({
      ...mockMonitoringScore,
      riskFlags,
    });

    const result = await orchestrateMonitoring(defaultParams);
    expect(result.riskFlags).toEqual(riskFlags);
  });

  it("propagates errors from collectors", async () => {
    mockCollectGitHubMetrics.mockRejectedValue(
      new Error("GitHub API rate limited")
    );
    await expect(orchestrateMonitoring(defaultParams)).rejects.toThrow(
      "GitHub API rate limited"
    );
  });

  it("propagates errors from runMonitorAgent", async () => {
    mockRunMonitorAgent.mockRejectedValue(new Error("LLM timeout"));
    await expect(orchestrateMonitoring(defaultParams)).rejects.toThrow(
      "LLM timeout"
    );
  });

  it("propagates errors from IPFS pinning", async () => {
    mockPinJsonToIpfs.mockRejectedValue(new Error("Pinata unavailable"));
    await expect(orchestrateMonitoring(defaultParams)).rejects.toThrow(
      "Pinata unavailable"
    );
  });
});
