interface GitHubMetrics {
  readonly commitFrequency: number;
  readonly issueVelocity: number;
  readonly releases: number;
}

interface GitHubCollectorParams {
  readonly owner: string;
  readonly repo: string;
  readonly periodDays: number;
}

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_PERIOD_DAYS = 14;

export async function collectGitHubMetrics(
  params: GitHubCollectorParams
): Promise<GitHubMetrics> {
  const { owner, repo, periodDays } = params;
  const since = new Date(
    Date.now() - periodDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const [commits, closedIssues, releases] = await Promise.all([
    fetchCommitCount(owner, repo, since, headers),
    fetchClosedIssueCount(owner, repo, since, headers),
    fetchReleaseCount(owner, repo, since, headers),
  ]);

  const weeks = periodDays / 7;

  return {
    commitFrequency: weeks > 0 ? Math.round((commits / weeks) * 10) / 10 : 0,
    issueVelocity:
      weeks > 0 ? Math.round((closedIssues / weeks) * 10) / 10 : 0,
    releases,
  };
}

async function fetchCommitCount(
  owner: string,
  repo: string,
  since: string,
  headers: Record<string, string>
): Promise<number> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?since=${since}&per_page=1`,
      { headers }
    );

    if (!response.ok) return 0;

    const linkHeader = response.headers.get("Link");
    if (!linkHeader) {
      const data: unknown = await response.json();
      return Array.isArray(data) ? data.length : 0;
    }

    const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    return lastPageMatch ? parseInt(lastPageMatch[1] ?? "0", 10) : 1;
  } catch {
    return 0;
  }
}

async function fetchClosedIssueCount(
  owner: string,
  repo: string,
  since: string,
  headers: Record<string, string>
): Promise<number> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=closed&since=${since}&per_page=1`,
      { headers }
    );

    if (!response.ok) return 0;

    const linkHeader = response.headers.get("Link");
    if (!linkHeader) {
      const data: unknown = await response.json();
      return Array.isArray(data) ? data.length : 0;
    }

    const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    return lastPageMatch ? parseInt(lastPageMatch[1] ?? "0", 10) : 1;
  } catch {
    return 0;
  }
}

async function fetchReleaseCount(
  owner: string,
  repo: string,
  since: string,
  headers: Record<string, string>
): Promise<number> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=100`,
      { headers }
    );

    if (!response.ok) return 0;

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return 0;

    const sinceDate = new Date(since);
    return data.filter(
      (release: { created_at?: string }) =>
        release.created_at && new Date(release.created_at) >= sinceDate
    ).length;
  } catch {
    return 0;
  }
}

export { DEFAULT_PERIOD_DAYS };
export type { GitHubMetrics, GitHubCollectorParams };
