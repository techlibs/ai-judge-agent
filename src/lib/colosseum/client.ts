import {
  ColosseumResponseSchema,
  ColosseumQuerySchema,
  type ColosseumQuery,
  type ColosseumResponse,
  type ColosseumHealth,
} from "./schemas";
import { sanitizeColosseumResponse } from "./sanitize";
import { withRetry } from "@/lib/retry";

const COLOSSEUM_API_BASE_URL = "https://api.colosseum.org/copilot/v1";
const REQUEST_TIMEOUT_MS = 15_000;
const COLOSSEUM_API_VERSION = "v1";
const MAX_RETRIES = 2;

const COLOSSEUM_RETRY_CONFIG = {
  maxAttempts: MAX_RETRIES + 1,
  initialDelayMs: 500,
  multiplier: 2,
  maxDelayMs: 5_000,
} as const;

let lastSuccessfulCallTimestamp: string | null = null;

function getColosseumToken(): string | null {
  return process.env.COLOSSEUM_COPILOT_PAT ?? null;
}

class ColosseumApiError extends Error {
  readonly statusCode: number | null;

  constructor(message: string, statusCode: number | null = null) {
    super(message);
    this.name = "ColosseumApiError";
    this.statusCode = statusCode;
  }
}

class ColosseumTokenMissingError extends Error {
  constructor() {
    super("COLOSSEUM_COPILOT_PAT environment variable is not set");
    this.name = "ColosseumTokenMissingError";
  }
}

interface ColosseumResearchResult {
  readonly data: ColosseumResponse;
  readonly injectionAttemptsDetected: number;
  readonly fieldsModified: ReadonlyArray<string>;
}

async function executeQuery(
  query: ColosseumQuery
): Promise<ColosseumResearchResult> {
  const token = getColosseumToken();
  if (!token) {
    throw new ColosseumTokenMissingError();
  }

  const validatedQuery = ColosseumQuerySchema.parse(query);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${COLOSSEUM_API_BASE_URL}/research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(validatedQuery),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ColosseumApiError(
        `Colosseum API returned ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const rawJson: unknown = await response.json();
    const parsed = ColosseumResponseSchema.parse(rawJson);
    const sanitized = sanitizeColosseumResponse(parsed);

    lastSuccessfulCallTimestamp = new Date().toISOString();

    return sanitized;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ColosseumApiError("Colosseum API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function queryColosseumWithRetry(
  query: ColosseumQuery
): Promise<ColosseumResearchResult> {
  return withRetry(() => executeQuery(query), COLOSSEUM_RETRY_CONFIG);
}

export function buildResearchQuery(
  title: string,
  description: string,
  category: string
): ColosseumQuery {
  const query = [
    `Project: ${title}`,
    `Category: ${category}`,
    `Description: ${description}`,
  ].join("\n");

  const truncatedQuery = query.slice(0, 2000);

  return {
    query: truncatedQuery,
    domain: category,
    mode: "deep_dive",
  };
}

export async function checkColosseumHealth(): Promise<ColosseumHealth> {
  const token = getColosseumToken();

  if (!token) {
    return {
      status: "unavailable",
      tokenValid: false,
      tokenExpiresAt: null,
      lastSuccessfulCall: lastSuccessfulCallTimestamp,
      apiVersion: null,
      errorMessage: "COLOSSEUM_COPILOT_PAT is not configured",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`${COLOSSEUM_API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: "degraded",
        tokenValid: response.status !== 401 && response.status !== 403,
        tokenExpiresAt: null,
        lastSuccessfulCall: lastSuccessfulCallTimestamp,
        apiVersion: COLOSSEUM_API_VERSION,
        errorMessage: `Health check returned ${response.status}`,
      };
    }

    return {
      status: "healthy",
      tokenValid: true,
      tokenExpiresAt: null,
      lastSuccessfulCall: lastSuccessfulCallTimestamp,
      apiVersion: COLOSSEUM_API_VERSION,
      errorMessage: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      status: "unavailable",
      tokenValid: false,
      tokenExpiresAt: null,
      lastSuccessfulCall: lastSuccessfulCallTimestamp,
      apiVersion: null,
      errorMessage: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export { ColosseumApiError, ColosseumTokenMissingError };
export type { ColosseumResearchResult };
