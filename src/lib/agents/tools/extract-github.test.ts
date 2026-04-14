import { describe, it, expect, beforeEach, mock } from "bun:test";
import { extractGithubRepo } from "./extract-github";

const mockRepoResponse = {
  name: "test-repo",
  description: "A test repository",
  stargazers_count: 42,
  language: "TypeScript",
  topics: ["typescript", "testing"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
  html_url: "https://github.com/owner/test-repo",
};

const mockLanguagesResponse = {
  TypeScript: 12000,
  JavaScript: 3000,
};

const mockReadme = "# Test Repo\n\nThis is a test repository for testing purposes.";

function makeFetchMock(responses: Map<string, { ok: boolean; status: number; body: unknown; text?: string }>) {
  return mock(async (url: string) => {
    const urlStr = url.toString();
    for (const [pattern, response] of responses) {
      if (urlStr.includes(pattern)) {
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.ok ? "OK" : "Not Found",
          json: async () => response.body,
          text: async () => response.text ?? "",
        };
      }
    }
    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}),
      text: async () => "",
    };
  });
}

describe("extractGithubRepo tool", () => {
  beforeEach(() => {
    globalThis.fetch = makeFetchMock(
      new Map([
        ["/readme", { ok: true, status: 200, body: null, text: mockReadme }],
        ["/languages", { ok: true, status: 200, body: mockLanguagesResponse }],
        ["api.github.com/repos/owner/test-repo", { ok: true, status: 200, body: mockRepoResponse }],
      ])
    ) as unknown as typeof fetch;
  });

  it("parses a valid GitHub URL and returns repo data", async () => {
    const result = await extractGithubRepo.execute({
      url: "https://github.com/owner/test-repo",
      context: undefined,
      runId: "test",
      threadId: "test",
      resourceId: "test",
      mastra: undefined,
      agents: undefined,
      tools: undefined,
      logger: undefined,
      telemetry: undefined,
      memory: undefined,
      runtimeContext: undefined,
    });

    expect(result.name).toBe("test-repo");
    expect(result.description).toBe("A test repository");
    expect(result.stars).toBe(42);
    expect(result.language).toBe("TypeScript");
    expect(result.topics).toEqual(["typescript", "testing"]);
    expect(result.languages).toEqual(mockLanguagesResponse);
    expect(result.readmeExcerpt).toBe(mockReadme);
    expect(result.url).toBe("https://github.com/owner/test-repo");
  });

  it("throws for an invalid GitHub URL", async () => {
    await expect(
      extractGithubRepo.execute({
        url: "https://gitlab.com/owner/repo",
        context: undefined,
        runId: "test",
        threadId: "test",
        resourceId: "test",
        mastra: undefined,
        agents: undefined,
        tools: undefined,
        logger: undefined,
        telemetry: undefined,
        memory: undefined,
        runtimeContext: undefined,
      })
    ).rejects.toThrow("Invalid GitHub repository URL");
  });

  it("returns null readmeExcerpt when README fetch fails", async () => {
    globalThis.fetch = makeFetchMock(
      new Map([
        ["/readme", { ok: false, status: 404, body: null, text: "" }],
        ["/languages", { ok: true, status: 200, body: mockLanguagesResponse }],
        ["api.github.com/repos/owner/test-repo", { ok: true, status: 200, body: mockRepoResponse }],
      ])
    ) as unknown as typeof fetch;

    const result = await extractGithubRepo.execute({
      url: "https://github.com/owner/test-repo",
      context: undefined,
      runId: "test",
      threadId: "test",
      resourceId: "test",
      mastra: undefined,
      agents: undefined,
      tools: undefined,
      logger: undefined,
      telemetry: undefined,
      memory: undefined,
      runtimeContext: undefined,
    });

    expect(result.readmeExcerpt).toBeNull();
  });

  it("truncates README to 3000 characters", async () => {
    const longReadme = "x".repeat(5000);
    globalThis.fetch = makeFetchMock(
      new Map([
        ["/readme", { ok: true, status: 200, body: null, text: longReadme }],
        ["/languages", { ok: true, status: 200, body: mockLanguagesResponse }],
        ["api.github.com/repos/owner/test-repo", { ok: true, status: 200, body: mockRepoResponse }],
      ])
    ) as unknown as typeof fetch;

    const result = await extractGithubRepo.execute({
      url: "https://github.com/owner/test-repo",
      context: undefined,
      runId: "test",
      threadId: "test",
      resourceId: "test",
      mastra: undefined,
      agents: undefined,
      tools: undefined,
      logger: undefined,
      telemetry: undefined,
      memory: undefined,
      runtimeContext: undefined,
    });

    expect(result.readmeExcerpt?.length).toBe(3000);
  });
});
