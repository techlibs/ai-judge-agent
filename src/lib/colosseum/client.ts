import { colosseumResponseSchema, type ColosseumResponse } from "./schemas";

const CONFIG = {
  baseUrl: process.env.COLOSSEUM_COPILOT_API_BASE,
  timeout: 30_000,
  maxRetries: 2,
} as const;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const researchCache = new Map<
  string,
  { data: ColosseumResponse; expiresAt: number }
>();

function createDomainHash(domain: string, description: string): string {
  const input = `${domain}:${description.slice(0, 500)}`;
  let hash = 0;
  for (const char of input) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return `colosseum:${hash.toString(36)}`;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = CONFIG.maxRetries
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 && attempt < retries) {
        const backoffMs = 2000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      const backoffMs = 1000 * (attempt + 1);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw new Error("[Colosseum] fetchWithRetry exhausted all attempts");
}

export async function queryColosseum(
  domain: string,
  description: string
): Promise<ColosseumResponse | null> {
  const token = process.env.COLOSSEUM_COPILOT_PAT;
  if (!CONFIG.baseUrl || !token) {
    console.warn("[Colosseum] Missing config — research skipped");
    return null;
  }

  const cacheKey = createDomainHash(domain, description);
  const cached = researchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const response = await fetchWithRetry(
      `${CONFIG.baseUrl}/research`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: description.slice(0, 2000),
          domain,
          mode: "deep_dive",
        }),
        signal: AbortSignal.timeout(CONFIG.timeout),
      }
    );

    if (!response.ok) {
      console.error(`[Colosseum] HTTP ${response.status}`);
      return null;
    }

    const raw: unknown = await response.json();
    const parsed = colosseumResponseSchema.safeParse(raw);

    if (!parsed.success) {
      console.error(
        "[Colosseum] Validation failed:",
        parsed.error.message
      );
      return null;
    }

    researchCache.set(cacheKey, {
      data: parsed.data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return parsed.data;
  } catch (error) {
    console.error("[Colosseum] Request failed:", error);
    return null;
  }
}

export async function checkColosseumHealth(): Promise<{
  status: "healthy" | "degraded" | "unavailable";
  details: string;
}> {
  const token = process.env.COLOSSEUM_COPILOT_PAT;
  if (!CONFIG.baseUrl || !token) {
    return {
      status: "unavailable",
      details: "Missing COLOSSEUM_COPILOT_API_BASE or COLOSSEUM_COPILOT_PAT",
    };
  }

  try {
    const response = await fetch(`${CONFIG.baseUrl}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { status: "healthy", details: "API reachable and authenticated" };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: "degraded",
        details: `Authentication failed (HTTP ${response.status}) — token may be expired`,
      };
    }

    return {
      status: "degraded",
      details: `Unexpected HTTP ${response.status}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return { status: "unavailable", details: `Connection failed: ${message}` };
  }
}
