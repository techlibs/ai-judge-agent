import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedisConfig =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedisConfig ? Redis.fromEnv() : undefined;

/** No-op limiter for local dev when Redis is not configured */
const noopLimiter = {
  limit: async (_key: string) => ({
    success: true,
    limit: 0,
    remaining: 0,
    reset: Date.now(),
    pending: Promise.resolve(),
  }),
};

export const proposalSubmitLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:proposal",
    })
  : noopLimiter;

export const evaluationTriggerLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "rl:evaluate",
    })
  : noopLimiter;

export const globalEvaluationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "rl:evaluate:global",
    })
  : noopLimiter;
