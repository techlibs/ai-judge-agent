const DEFAULT_EVALUATION_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
} as const;

const DEFAULT_CHAIN_RETRY_CONFIG = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
} as const;

interface RetryConfig {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly multiplier: number;
  readonly maxDelayMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.multiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_EVALUATION_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxAttempts - 1) {
        const delay = computeDelay(attempt, config);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

export async function withEvaluationRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  return withRetry(operation, DEFAULT_EVALUATION_RETRY_CONFIG);
}

export async function withChainRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  return withRetry(operation, DEFAULT_CHAIN_RETRY_CONFIG);
}
