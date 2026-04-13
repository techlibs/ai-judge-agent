import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRedisClient(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  });
}

const redis = createRedisClient();

export const proposalSubmitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "ratelimit:proposal-submit",
});

export const evaluationTriggerLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "ratelimit:evaluation-trigger",
});

export const globalEvaluationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:global-evaluation",
});

export async function checkRateLimit(
  limiter: Ratelimit,
  key: string
): Promise<{ success: boolean; retryAfter: number }> {
  const result = await limiter.limit(key);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return { success: false, retryAfter };
  }

  return { success: true, retryAfter: 0 };
}
