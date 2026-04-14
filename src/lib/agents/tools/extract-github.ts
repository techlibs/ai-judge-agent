import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const GITHUB_README_CHAR_LIMIT = 3000;

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

type GithubRepoOutput = z.infer<typeof githubRepoOutputSchema>;

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const segments = parsed.pathname.replace(/^\//, "").split("/");
    if (segments.length < 2) return null;
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": "ipe-city-agent-reviewer/1.0" },
  });
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ipe-city-agent-reviewer/1.0",
      Accept: "application/vnd.github.raw",
    },
  });
  if (!response.ok) return null;
  const text = await response.text();
  return text.slice(0, GITHUB_README_CHAR_LIMIT);
}

interface GithubRepoApiResponse {
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
    "Extract metadata from a public GitHub repository URL. Use this whenever the user shares a GitHub link to automatically populate proposal fields like Description and Team Info from the README.",
  inputSchema: z.object({
    url: z.string().url().describe("The GitHub repository URL"),
  }),
  outputSchema: githubRepoOutputSchema,
  execute: async (input): Promise<GithubRepoOutput> => {
    const parsed = parseGithubUrl(input.url);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${input.url}`);
    }

    const { owner, repo } = parsed;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    const [repoData, languages, readmeExcerpt] = await Promise.all([
      fetchJson<GithubRepoApiResponse>(apiBase),
      fetchJson<Record<string, number>>(`${apiBase}/languages`),
      fetchReadme(owner, repo),
    ]);

    return {
      name: repoData.name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      language: repoData.language,
      topics: repoData.topics ?? [],
      languages,
      readmeExcerpt,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      url: repoData.html_url,
    };
  },
});
