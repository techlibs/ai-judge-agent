const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(prefix: string): Map<string, RateLimitEntry> {
  let store = stores.get(prefix);
  if (!store) {
    store = new Map();
    stores.set(prefix, store);
  }
  return store;
}

function checkLimit(
  prefix: string,
  key: string,
  config: RateLimitConfig
): { success: boolean; retryAfter: number } {
  const store = getStore(prefix);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { success: true, retryAfter: 0 };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil(
      (entry.windowStart + config.windowMs - now) / 1000
    );
    return { success: false, retryAfter };
  }

  entry.count++;
  return { success: true, retryAfter: 0 };
}

const PROPOSAL_SUBMIT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: WINDOW_MS,
};

const EVALUATION_TRIGGER_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: WINDOW_MS,
};

export function checkProposalSubmitLimit(
  key: string
): { success: boolean; retryAfter: number } {
  return checkLimit("proposal-submit", key, PROPOSAL_SUBMIT_CONFIG);
}

export function checkEvaluationTriggerLimit(
  key: string
): { success: boolean; retryAfter: number } {
  return checkLimit("evaluation-trigger", key, EVALUATION_TRIGGER_CONFIG);
}
