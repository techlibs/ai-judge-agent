import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { collectGitHubMetrics, DEFAULT_PERIOD_DAYS } from "./github";
import type { GitHubCollectorParams } from "./github";

const DEFAULT_PARAMS: GitHubCollectorParams = {
  owner: "ipe-city",
  repo: "agent-reviewer",
  periodDays: 14,
};

function jsonResponse(data: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function errorResponse(status: number) {
  return new Response("error", { status });
}

describe("collectGitHubMetrics", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("collects metrics from commits, issues, and releases", async () => {
    const fetchMock = vi.mocked(fetch);

    // commits endpoint — Link header with page count
    fetchMock.mockResolvedValueOnce(
      jsonResponse([], {
        Link: '<https://api.github.com/repos/o/r/commits?page=28>; rel="last"',
      })
    );

    // closed issues endpoint — Link header with page count
    fetchMock.mockResolvedValueOnce(
      jsonResponse([], {
        Link: '<https://api.github.com/repos/o/r/issues?page=14>; rel="last"',
      })
    );

    // releases endpoint — two releases within the period
    const now = new Date();
    const recentDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { created_at: recentDate.toISOString() },
        { created_at: recentDate.toISOString() },
        { created_at: "2020-01-01T00:00:00Z" }, // old, should be excluded
      ])
    );

    const result = await collectGitHubMetrics(DEFAULT_PARAMS);

    expect(result.commitFrequency).toBe(14); // 28 / 2 weeks
    expect(result.issueVelocity).toBe(7); // 14 / 2 weeks
    expect(result.releases).toBe(2);
  });

  it("returns zeros when all API calls fail", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(errorResponse(500));

    const result = await collectGitHubMetrics(DEFAULT_PARAMS);

    expect(result.commitFrequency).toBe(0);
    expect(result.issueVelocity).toBe(0);
    expect(result.releases).toBe(0);
  });

  it("returns zeros when fetch throws network errors", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new Error("Network error"));

    const result = await collectGitHubMetrics(DEFAULT_PARAMS);

    expect(result.commitFrequency).toBe(0);
    expect(result.issueVelocity).toBe(0);
    expect(result.releases).toBe(0);
  });

  it("handles empty repo with no Link header and empty arrays", async () => {
    const fetchMock = vi.mocked(fetch);

    // commits — no Link header, empty array
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    // issues — no Link header, empty array
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    // releases — empty array
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const result = await collectGitHubMetrics(DEFAULT_PARAMS);

    expect(result.commitFrequency).toBe(0);
    expect(result.issueVelocity).toBe(0);
    expect(result.releases).toBe(0);
  });

  it("falls back to array length when no Link header and data is present", async () => {
    const fetchMock = vi.mocked(fetch);

    // commits — one item returned (per_page=1 so 1 commit)
    fetchMock.mockResolvedValueOnce(jsonResponse([{ sha: "abc" }]));
    // issues — one item
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1 }]));
    // releases — none in period
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const result = await collectGitHubMetrics(DEFAULT_PARAMS);

    expect(result.commitFrequency).toBe(0.5); // 1 / 2 weeks
    expect(result.issueVelocity).toBe(0.5);
    expect(result.releases).toBe(0);
  });

  it("includes Authorization header when GITHUB_TOKEN is set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_test123");

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse([]));

    await collectGitHubMetrics(DEFAULT_PARAMS);

    const firstCallHeaders = fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(firstCallHeaders?.Authorization).toBe("Bearer ghp_test123");

    vi.unstubAllEnvs();
  });

  it("handles non-array JSON responses gracefully", async () => {
    const fetchMock = vi.mocked(fetch);

    // commits returns an object instead of array
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "not found" }));
    // issues returns an object
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "not found" }));
    // releases returns an object
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "not found" }));

    const result = await collectGitHubMetrics(DEFAULT_PARAMS);

    expect(result.commitFrequency).toBe(0);
    expect(result.issueVelocity).toBe(0);
    expect(result.releases).toBe(0);
  });

  it("exports DEFAULT_PERIOD_DAYS constant", () => {
    expect(DEFAULT_PERIOD_DAYS).toBe(14);
  });
});
