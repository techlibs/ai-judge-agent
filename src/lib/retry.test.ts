import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, withEvaluationRetry, withChainRetry } from "@/lib/retry";

describe("retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: advance all pending timers so sleep() resolves
  function flushTimers() {
    return vi.runAllTimersAsync();
  }

  describe("withRetry", () => {
    it("returns the value on first successful call", async () => {
      const op = vi.fn().mockResolvedValue("ok");
      const result = await withRetry(op);
      expect(result).toBe("ok");
      expect(op).toHaveBeenCalledTimes(1);
    });

    it("retries on failure then returns success", async () => {
      const op = vi
        .fn()
        .mockRejectedValueOnce(new Error("fail-1"))
        .mockRejectedValueOnce(new Error("fail-2"))
        .mockResolvedValue("success");

      const promise = withRetry(op);
      // Flush timers to allow sleep between retries
      await flushTimers();
      const result = await promise;

      expect(result).toBe("success");
      expect(op).toHaveBeenCalledTimes(3);
    });

    it("throws the last error after exhausting all attempts (default 3)", async () => {
      const op = vi.fn().mockRejectedValue(new Error("always-fail"));

      const promise = withRetry(op).catch((e: unknown) => e);
      await flushTimers();

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("always-fail");
      expect(op).toHaveBeenCalledTimes(3);
    });

    it("wraps non-Error throws into Error", async () => {
      const op = vi.fn().mockRejectedValue("string-error");

      const promise = withRetry(op, {
        maxAttempts: 1,
        initialDelayMs: 100,
        multiplier: 2,
        maxDelayMs: 1000,
      }).catch((e: unknown) => e);
      await flushTimers();

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("string-error");
    });

    it("uses exponential backoff delays", async () => {
      const sleepSpy = vi.spyOn(globalThis, "setTimeout");
      const op = vi.fn().mockRejectedValue(new Error("fail"));

      const config = {
        maxAttempts: 4,
        initialDelayMs: 100,
        multiplier: 2,
        maxDelayMs: 10000,
      } as const;

      const promise = withRetry(op, config).catch(() => {});
      await flushTimers();
      await promise;

      // Expected delays: attempt 0 → 100*2^0=100, attempt 1 → 100*2^1=200, attempt 2 → 100*2^2=400
      // (no delay after the last attempt)
      const timeoutCalls = sleepSpy.mock.calls
        .map((call) => call[1])
        .filter((ms): ms is number => typeof ms === "number" && ms >= 100);

      expect(timeoutCalls).toContain(100);
      expect(timeoutCalls).toContain(200);
      expect(timeoutCalls).toContain(400);

      sleepSpy.mockRestore();
    });

    it("caps delay at maxDelayMs", async () => {
      const sleepSpy = vi.spyOn(globalThis, "setTimeout");
      const op = vi.fn().mockRejectedValue(new Error("fail"));

      const config = {
        maxAttempts: 5,
        initialDelayMs: 10000,
        multiplier: 3,
        maxDelayMs: 15000,
      } as const;

      const promise = withRetry(op, config).catch(() => {});
      await flushTimers();
      await promise;

      // initialDelayMs * 3^1 = 30000 > maxDelayMs → capped at 15000
      const timeoutCalls = sleepSpy.mock.calls
        .map((call) => call[1])
        .filter((ms): ms is number => typeof ms === "number" && ms >= 10000);

      // All delays should be <= maxDelayMs
      for (const delay of timeoutCalls) {
        expect(delay).toBeLessThanOrEqual(15000);
      }

      sleepSpy.mockRestore();
    });

    it("accepts custom config", async () => {
      const op = vi.fn().mockRejectedValue(new Error("fail"));

      const config = {
        maxAttempts: 2,
        initialDelayMs: 50,
        multiplier: 2,
        maxDelayMs: 500,
      } as const;

      const promise = withRetry(op, config).catch((e: unknown) => e);
      await flushTimers();

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("fail");
      expect(op).toHaveBeenCalledTimes(2);
    });

    it("does not sleep after the last failed attempt", async () => {
      const sleepSpy = vi.spyOn(globalThis, "setTimeout");
      const op = vi.fn().mockRejectedValue(new Error("fail"));

      const config = {
        maxAttempts: 2,
        initialDelayMs: 1000,
        multiplier: 2,
        maxDelayMs: 30000,
      } as const;

      const promise = withRetry(op, config).catch(() => {});
      await flushTimers();
      await promise;

      // Only 1 sleep (between attempt 0 and 1), not after attempt 1
      const sleepCalls = sleepSpy.mock.calls.filter(
        (call) => typeof call[1] === "number" && call[1] >= 1000
      );
      expect(sleepCalls).toHaveLength(1);

      sleepSpy.mockRestore();
    });
  });

  describe("withEvaluationRetry", () => {
    it("uses default evaluation config (maxAttempts=3)", async () => {
      const op = vi.fn().mockRejectedValue(new Error("fail"));

      const promise = withEvaluationRetry(op).catch((e: unknown) => e);
      await flushTimers();

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("fail");
      expect(op).toHaveBeenCalledTimes(3);
    });

    it("returns value on success", async () => {
      const op = vi.fn().mockResolvedValue(42);
      const result = await withEvaluationRetry(op);
      expect(result).toBe(42);
    });
  });

  describe("withChainRetry", () => {
    it("uses chain config (maxAttempts=5)", async () => {
      const op = vi.fn().mockRejectedValue(new Error("chain-fail"));

      const promise = withChainRetry(op).catch((e: unknown) => e);
      await flushTimers();

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("chain-fail");
      expect(op).toHaveBeenCalledTimes(5);
    });

    it("returns value on success", async () => {
      const op = vi.fn().mockResolvedValue("tx-hash");
      const result = await withChainRetry(op);
      expect(result).toBe("tx-hash");
    });

    it("retries and eventually succeeds", async () => {
      const op = vi
        .fn()
        .mockRejectedValueOnce(new Error("nonce"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValue("0xabc");

      const promise = withChainRetry(op);
      await flushTimers();

      expect(await promise).toBe("0xabc");
      expect(op).toHaveBeenCalledTimes(3);
    });
  });
});
