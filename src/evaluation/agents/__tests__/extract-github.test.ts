import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isValidationError } from "@mastra/core/tools";
import { extractGithubRepo } from "../tools/extract-github";

const MOCK_REPO_RESPONSE = {
  name: "ai-judge-agent",
  description: "An AI-powered judge agent for evaluating grant proposals",
  stargazers_count: 42,
  language: "TypeScript",
  topics: ["ai", "grants", "web3"],
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
  html_url: "https://github.com/techlibs/ai-judge-agent",
};

const MOCK_LANGUAGES_RESPONSE = {
  TypeScript: 18432,
  Solidity: 4096,
  CSS: 1024,
};

const MOCK_README_CONTENT = `# AI Judge Agent

An open-source AI system for evaluating grant proposals using multiple specialized agents.

## Features
- Multi-dimensional scoring
- On-chain transparency via ERC-8004
- Real-time evaluation with Mastra workflows
`;

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeTextResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

async function runTool(url: string) {
  if (!extractGithubRepo.execute) throw new Error("execute not defined");
  const result = await extractGithubRepo.execute({ url }, {} as never);
  if (isValidationError(result)) throw new Error(result.message);
  return result;
}

describe("extractGithubRepo tool", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has the correct id", () => {
    expect(extractGithubRepo.id).toBe("extractGithubRepo");
  });

  it("fetches and returns repo metadata, languages, and readme", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(MOCK_REPO_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(MOCK_LANGUAGES_RESPONSE))
      .mockResolvedValueOnce(makeTextResponse(MOCK_README_CONTENT));

    const result = await runTool("https://github.com/techlibs/ai-judge-agent");

    expect(result.name).toBe("ai-judge-agent");
    expect(result.description).toBe("An AI-powered judge agent for evaluating grant proposals");
    expect(result.stars).toBe(42);
    expect(result.language).toBe("TypeScript");
    expect(result.topics).toEqual(["ai", "grants", "web3"]);
    expect(result.languages).toEqual(MOCK_LANGUAGES_RESPONSE);
    expect(result.readmeExcerpt).toBe(MOCK_README_CONTENT);
    expect(result.createdAt).toBe("2024-01-15T00:00:00Z");
    expect(result.updatedAt).toBe("2024-06-01T00:00:00Z");
    expect(result.url).toBe("https://github.com/techlibs/ai-judge-agent");
  });

  it("truncates readme to 3000 characters", async () => {
    const longReadme = "x".repeat(5000);
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(MOCK_REPO_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(MOCK_LANGUAGES_RESPONSE))
      .mockResolvedValueOnce(makeTextResponse(longReadme));

    const result = await runTool("https://github.com/techlibs/ai-judge-agent");

    expect(result.readmeExcerpt?.length).toBe(3000);
  });

  it("returns null readmeExcerpt when readme fetch fails", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(MOCK_REPO_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse(MOCK_LANGUAGES_RESPONSE))
      .mockResolvedValueOnce(makeJsonResponse({}, 404));

    const result = await runTool("https://github.com/techlibs/ai-judge-agent");

    expect(result.readmeExcerpt).toBeNull();
  });

  it("throws on 404 (private or missing repo)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeJsonResponse({ message: "Not Found" }, 404));

    await expect(
      runTool("https://github.com/techlibs/ai-judge-agent")
    ).rejects.toThrow("Repository not found or is private");
  });

  it("throws on invalid GitHub URL", async () => {
    await expect(
      runTool("https://gitlab.com/techlibs/ai-judge-agent")
    ).rejects.toThrow("Invalid GitHub repository URL");
  });

  it("handles repos with no topics gracefully", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ ...MOCK_REPO_RESPONSE, topics: undefined }))
      .mockResolvedValueOnce(makeJsonResponse(MOCK_LANGUAGES_RESPONSE))
      .mockResolvedValueOnce(makeTextResponse(MOCK_README_CONTENT));

    const result = await runTool("https://github.com/techlibs/ai-judge-agent");

    expect(result.topics).toEqual([]);
  });
});
