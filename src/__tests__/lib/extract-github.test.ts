import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { extractGithubRepo, GitHubRepoSchema } from "@/lib/agents/tools/extract-github";

const MOCK_REPO_RESPONSE = {
  description: "A solar grid management system",
  stargazers_count: 42,
  language: "TypeScript",
  topics: ["solar", "iot", "sustainability"],
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-03-20T14:00:00Z",
};

const MOCK_LANGUAGES_RESPONSE = {
  TypeScript: 45000,
  JavaScript: 5000,
  CSS: 2000,
};

const MOCK_README =
  "# Solar Grid\n\nA community-owned solar micro-grid system that provides clean energy to village residents. Built with TypeScript and IoT sensors for real-time monitoring.";

function makeFetchMock(overrides: Partial<Record<string, unknown>> = {}) {
  return mock((url: string) => {
    if (url.includes("/readme")) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(MOCK_README),
      });
    }
    if (url.includes("/languages")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...MOCK_LANGUAGES_RESPONSE, ...overrides }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...MOCK_REPO_RESPONSE, ...overrides }),
    });
  });
}

describe("GitHubRepoSchema", () => {
  it("validates a complete repo object", () => {
    const result = GitHubRepoSchema.safeParse({
      name: "owner/repo",
      description: "A test repo",
      stars: 10,
      language: "TypeScript",
      topics: ["test"],
      languages: { TypeScript: 1000 },
      readmeExcerpt: "Hello world",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-06-01T00:00:00Z",
      url: "https://github.com/owner/repo",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null description and language", () => {
    const result = GitHubRepoSchema.safeParse({
      name: "owner/repo",
      description: null,
      stars: 0,
      language: null,
      topics: [],
      languages: {},
      readmeExcerpt: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-06-01T00:00:00Z",
      url: "https://github.com/owner/repo",
    });
    expect(result.success).toBe(true);
  });
});

describe("extractGithubRepo tool", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns structured repo data for a valid GitHub URL", async () => {
    globalThis.fetch = makeFetchMock() as unknown as typeof fetch;

    const result = await extractGithubRepo.execute({
      url: "https://github.com/owner/solar-grid",
    });

    expect(result.name).toBe("owner/solar-grid");
    expect(result.description).toBe("A solar grid management system");
    expect(result.stars).toBe(42);
    expect(result.language).toBe("TypeScript");
    expect(result.topics).toEqual(["solar", "iot", "sustainability"]);
    expect(result.languages).toEqual(MOCK_LANGUAGES_RESPONSE);
    expect(result.readmeExcerpt).toBe(MOCK_README);
    expect(result.url).toBe("https://github.com/owner/solar-grid");
  });

  it("truncates README to 3000 characters", async () => {
    const longReadme = "x".repeat(5000);
    globalThis.fetch = mock((url: string) => {
      if (url.includes("/readme")) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(longReadme) });
      }
      if (url.includes("/languages")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_REPO_RESPONSE),
      });
    }) as unknown as typeof fetch;

    const result = await extractGithubRepo.execute({
      url: "https://github.com/owner/repo",
    });

    expect(result.readmeExcerpt?.length).toBe(3000);
  });

  it("returns null readmeExcerpt when README fetch fails", async () => {
    globalThis.fetch = mock((url: string) => {
      if (url.includes("/readme")) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (url.includes("/languages")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_REPO_RESPONSE),
      });
    }) as unknown as typeof fetch;

    const result = await extractGithubRepo.execute({
      url: "https://github.com/owner/repo",
    });

    expect(result.readmeExcerpt).toBeNull();
  });

  it("throws for an invalid GitHub URL", async () => {
    await expect(
      extractGithubRepo.execute({
        url: "https://gitlab.com/owner/repo",
      }),
    ).rejects.toThrow("Invalid GitHub URL");
  });

  it("throws for a 404 repo", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({ ok: false, status: 404 }),
    ) as unknown as typeof fetch;

    await expect(
      extractGithubRepo.execute({
        url: "https://github.com/owner/nonexistent",
      }),
    ).rejects.toThrow("not found or is private");
  });

  it("throws for a rate-limited response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({ ok: false, status: 403 }),
    ) as unknown as typeof fetch;

    await expect(
      extractGithubRepo.execute({
        url: "https://github.com/owner/repo",
      }),
    ).rejects.toThrow("rate limit");
  });

  it("handles a URL with trailing slash", async () => {
    globalThis.fetch = makeFetchMock() as unknown as typeof fetch;

    const result = await extractGithubRepo.execute({
      url: "https://github.com/owner/repo/",
    });

    expect(result.name).toBe("owner/repo");
  });
});
