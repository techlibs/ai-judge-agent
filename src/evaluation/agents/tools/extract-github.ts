import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const GITHUB_API_BASE = "https://api.github.com";
const README_MAX_CHARS = 3000;

const githubRepoOutputSchema = z.object({
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

export type GithubRepoData = z.infer<typeof githubRepoOutputSchema>;

function parseOwnerRepo(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.replace(/^\//, "").split("/");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ipe-city-agent-reviewer",
      ...headers,
    },
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 404) throw new Error("Repository not found or is private");
    if (status === 403) throw new Error("GitHub API rate limit exceeded — try again later");
    throw new Error(`GitHub API error: ${status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.raw",
          "User-Agent": "ipe-city-agent-reviewer",
        },
      }
    );
    if (!response.ok) return null;
    const text = await response.text();
    return text.slice(0, README_MAX_CHARS);
  } catch {
    return null;
  }
}

interface GithubRepoResponse {
  name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  html_url: string;
}

export const extractGithubRepo = createTool({
  id: "extractGithubRepo",
  description:
    "Fetches metadata and README content from a public GitHub repository URL. Use this when the user shares a GitHub link to pre-fill proposal fields with real project data.",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: githubRepoOutputSchema,
  execute: async (inputData) => {
    const parsed = parseOwnerRepo(inputData.url);
    if (!parsed) {
      throw new Error("Invalid GitHub repository URL. Expected format: https://github.com/owner/repo");
    }

    const { owner, repo } = parsed;

    const [repoData, languagesData, readmeExcerpt] = await Promise.all([
      fetchJson<GithubRepoResponse>(`${GITHUB_API_BASE}/repos/${owner}/${repo}`),
      fetchJson<Record<string, number>>(`${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`),
      fetchReadme(owner, repo),
    ]);

    return {
      name: repoData.name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      language: repoData.language,
      topics: repoData.topics ?? [],
      languages: languagesData,
      readmeExcerpt,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      url: repoData.html_url,
    };
  },
});
