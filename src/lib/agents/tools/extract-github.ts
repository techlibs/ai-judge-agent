import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// ─── Constants ──────────────────────────────────────────────────────

const GITHUB_API_BASE = "https://api.github.com";
const README_MAX_CHARS = 3000;

// ─── Output Schema ───────────────────────────────────────────────────

export const GitHubRepoSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  stars: z.number(),
  language: z.string().nullable(),
  topics: z.array(z.string()),
  languages: z.record(z.string(), z.number()),
  readmeExcerpt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  url: z.string(),
});

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

// ─── URL Parser ──────────────────────────────────────────────────────

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

// ─── GitHub Fetch Helpers ────────────────────────────────────────────

async function fetchRepoMetadata(
  owner: string,
  repo: string,
): Promise<{
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  createdAt: string;
  updatedAt: string;
}> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (response.status === 404) {
    throw new Error(`Repository ${owner}/${repo} not found or is private`);
  }
  if (response.status === 403) {
    throw new Error("GitHub API rate limit exceeded — try again later");
  }
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data: unknown = await response.json();

  const parsed = z
    .object({
      description: z.string().nullable(),
      stargazers_count: z.number(),
      language: z.string().nullable(),
      topics: z.array(z.string()),
      created_at: z.string(),
      updated_at: z.string(),
    })
    .parse(data);

  return {
    description: parsed.description,
    stars: parsed.stargazers_count,
    language: parsed.language,
    topics: parsed.topics,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
  };
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`, {
    headers: {
      Accept: "application/vnd.github.raw",
    },
  });

  if (!response.ok) return null;

  const text = await response.text();
  return text.slice(0, README_MAX_CHARS);
}

async function fetchLanguages(
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) return {};

  const data: unknown = await response.json();
  const parsed = z.record(z.string(), z.number()).safeParse(data);
  return parsed.success ? parsed.data : {};
}

// ─── Tool Definition ─────────────────────────────────────────────────

export const extractGithubRepo = createTool({
  id: "extractGithubRepo",
  description:
    "Extracts metadata, README, and language stats from a public GitHub repository URL. Use this whenever a user shares a GitHub link to pre-fill proposal fields.",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: GitHubRepoSchema,
  execute: async ({ url }: { url: string }) => {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    const { owner, repo } = parsed;

    const [metadata, readmeExcerpt, languages] = await Promise.all([
      fetchRepoMetadata(owner, repo),
      fetchReadme(owner, repo),
      fetchLanguages(owner, repo),
    ]);

    return {
      name: `${owner}/${repo}`,
      description: metadata.description,
      stars: metadata.stars,
      language: metadata.language,
      topics: metadata.topics,
      languages,
      readmeExcerpt,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      url,
    };
  },
});
