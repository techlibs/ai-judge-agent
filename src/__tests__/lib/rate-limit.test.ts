import { describe, it, expect, beforeAll } from "bun:test";

// Remove Redis env vars before importing to ensure noopLimiter is used
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// Dynamic import after env cleanup
const { proposalSubmitLimiter, evaluationTriggerLimiter, globalEvaluationLimiter } =
  await import("@/lib/rate-limit");

describe("rate limiters (no-op mode, no Redis configured)", () => {
  it("proposalSubmitLimiter always succeeds without Redis", async () => {
    const result = await proposalSubmitLimiter.limit("test-ip");
    expect(result.success).toBe(true);
  });

  it("evaluationTriggerLimiter always succeeds without Redis", async () => {
    const result = await evaluationTriggerLimiter.limit("test-ip");
    expect(result.success).toBe(true);
  });

  it("globalEvaluationLimiter always succeeds without Redis", async () => {
    const result = await globalEvaluationLimiter.limit("test-ip");
    expect(result.success).toBe(true);
  });

  it("noop limiter returns valid shape with reset timestamp", async () => {
    const before = Date.now();
    const result = await proposalSubmitLimiter.limit("shape-test");
    const after = Date.now();

    expect(result.success).toBe(true);
    expect(result.limit).toBe(0);
    expect(result.remaining).toBe(0);
    expect(typeof result.reset).toBe("number");
    expect(result.reset).toBeGreaterThanOrEqual(before);
    expect(result.reset).toBeLessThanOrEqual(after);
    expect(result.pending).toBeInstanceOf(Promise);
  });
});
