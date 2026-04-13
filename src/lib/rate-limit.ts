import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redisInstance: Redis | undefined;

function getRedis(): Redis | undefined {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return undefined;
  }
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisInstance;
}

function createLimiter(window: Parameters<typeof Ratelimit.slidingWindow>, prefix: string): Ratelimit | undefined {
  const redis = getRedis();
  if (!redis) return undefined;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(...window),
    prefix,
  });
}

export function getProposalSubmitLimiter(): Ratelimit | undefined {
  return createLimiter([5, "1 h"], "ratelimit:proposal-submit");
}

export function getEvaluationTriggerLimiter(): Ratelimit | undefined {
  return createLimiter([10, "1 h"], "ratelimit:evaluation-trigger");
}

export function getGlobalEvaluationLimiter(): Ratelimit | undefined {
  return createLimiter([10, "1 m"], "ratelimit:global-evaluation");
}

export async function checkRateLimit(
  limiter: Ratelimit | undefined,
  key: string
): Promise<{ success: boolean; retryAfter: number }> {
  if (!limiter) {
    return { success: true, retryAfter: 0 };
  }

  const result = await limiter.limit(key);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return { success: false, retryAfter };
  }

  return { success: true, retryAfter: 0 };
}
