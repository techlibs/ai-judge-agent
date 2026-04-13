import { colosseumResearchResponseSchema } from "./schemas";
import type { ResearchResult } from "./types";

const API_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;
const RATE_LIMIT_RETRY_DELAY_MS = 2_000;
const MAX_DESCRIPTION_LENGTH_FOR_CACHE = 500;

const researchCache = new Map<
  string,
  { data: ResearchResult; cachedAt: number }
>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.COLOSSEUM_COPILOT_API_BASE;
  const token = process.env.COLOSSEUM_COPILOT_PAT;

  if (!baseUrl || !token) {
    return null;
  }

  return { baseUrl, token };
}

function buildCacheKey(domain: string, description: string): string {
  const truncated = description.slice(0, MAX_DESCRIPTION_LENGTH_FOR_CACHE);
  return `${domain}::${truncated}`;
}

function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, API_TIMEOUT_MS);

      if (response.status === 429 && attempt < retries) {
        await delay(RATE_LIMIT_RETRY_DELAY_MS);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (lastError.name === "AbortError") {
        throw new Error(`Colosseum API timeout after ${API_TIMEOUT_MS}ms`);
      }

      if (attempt < retries) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError ?? new Error("Colosseum API request failed");
}

export async function researchProposal(
  proposalDomain: string,
  proposalDescription: string,
): Promise<ResearchResult> {
  const config = getConfig();

  if (!config) {
    console.warn("[Colosseum] Missing API config — skipping research");
    return {
      status: "skipped",
      reason: "missing_config",
      message:
        "COLOSSEUM_COPILOT_API_BASE or COLOSSEUM_COPILOT_PAT not configured",
    };
  }

  const cacheKey = buildCacheKey(proposalDomain, proposalDescription);
  const cached = researchCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  let response: Response;
  try {
    response = await fetchWithRetry(
      `${config.baseUrl}/research`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: sanitizeText(proposalDescription),
          domain: sanitizeText(proposalDomain),
          mode: "deep_dive",
        }),
      },
      MAX_RETRIES,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("timeout")) {
      console.error(`[Colosseum] API timeout: ${message}`);
      return { status: "skipped", reason: "api_timeout", message };
    }

    console.error(`[Colosseum] API request failed: ${message}`);
    return { status: "skipped", reason: "api_error", message };
  }

  if (response.status === 429) {
    console.error("[Colosseum] Rate limited after retries");
    return {
      status: "skipped",
      reason: "rate_limited",
      message: "Rate limited after retry attempts",
    };
  }

  if (!response.ok) {
    const reason =
      response.status === 401 ? "api_error" : ("api_error" as const);
    const statusText = `${response.status} ${response.statusText}`;
    console.error(`[Colosseum] API error: ${statusText}`);
    return {
      status: "skipped",
      reason,
      message: `API returned ${statusText}`,
    };
  }

  const data: unknown = await response.json();
  const parsed = colosseumResearchResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error(
      "[Colosseum] Response validation failed:",
      parsed.error.message,
    );
    return {
      status: "skipped",
      reason: "invalid_response",
      message: `Zod validation failed: ${parsed.error.message}`,
    };
  }

  const result: ResearchResult = { status: "success", data: parsed.data };

  researchCache.set(cacheKey, { data: result, cachedAt: Date.now() });

  return result;
}

export async function checkHealth(): Promise<{
  healthy: boolean;
  message: string;
}> {
  const config = getConfig();

  if (!config) {
    return { healthy: false, message: "Missing API configuration" };
  }

  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
      },
      10_000,
    );

    if (response.status === 401) {
      return { healthy: false, message: "Token expired or invalid" };
    }

    if (!response.ok) {
      return {
        healthy: false,
        message: `API returned ${response.status}`,
      };
    }

    return { healthy: true, message: "Colosseum API is reachable" };
  } catch {
    return { healthy: false, message: "API unreachable or timed out" };
  }
}
