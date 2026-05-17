import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset module so the in-memory stores are fresh for every test.
    // We re-import dynamically after resetting.
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---- Helpers ----
  // Because the module keeps state in a module-level Map we need to
  // re-import it for every test to get clean stores.
  async function freshModule() {
    vi.resetModules();
    const mod = await import("@/lib/rate-limit");
    return mod;
  }

  // ---- checkProposalSubmitLimit (5 per hour) ----

  describe("checkProposalSubmitLimit", () => {
    it("succeeds on the first call", async () => {
      const { checkProposalSubmitLimit: check } = await freshModule();
      const result = check("user-1");
      expect(result).toEqual({ success: true, retryAfter: 0 });
    });

    it("succeeds for calls up to the limit (5)", async () => {
      const { checkProposalSubmitLimit: check } = await freshModule();
      for (let i = 0; i < 5; i++) {
        expect(check("user-1").success).toBe(true);
      }
    });

    it("fails on the 6th call with retryAfter > 0", async () => {
      const { checkProposalSubmitLimit: check } = await freshModule();
      for (let i = 0; i < 5; i++) {
        check("user-1");
      }
      const result = check("user-1");
      expect(result.success).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("keeps independent limits per key", async () => {
      const { checkProposalSubmitLimit: check } = await freshModule();
      for (let i = 0; i < 5; i++) {
        check("user-a");
      }
      expect(check("user-a").success).toBe(false);
      expect(check("user-b").success).toBe(true);
    });

    it("resets the window after 1 hour", async () => {
      const { checkProposalSubmitLimit: check } = await freshModule();
      for (let i = 0; i < 5; i++) {
        check("user-1");
      }
      expect(check("user-1").success).toBe(false);

      // Advance past the 1-hour window
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      expect(check("user-1").success).toBe(true);
    });

    it("returns retryAfter in seconds (ceiling)", async () => {
      const { checkProposalSubmitLimit: check } = await freshModule();
      for (let i = 0; i < 5; i++) {
        check("user-1");
      }

      // Advance 30 minutes into the window
      vi.advanceTimersByTime(30 * 60 * 1000);

      const result = check("user-1");
      expect(result.success).toBe(false);
      // Remaining should be ~30 minutes = 1800 seconds
      expect(result.retryAfter).toBe(1800);
    });
  });

  // ---- checkEvaluationTriggerLimit (10 per hour) ----

  describe("checkEvaluationTriggerLimit", () => {
    it("succeeds on the first call", async () => {
      const { checkEvaluationTriggerLimit: check } = await freshModule();
      expect(check("eval-1")).toEqual({ success: true, retryAfter: 0 });
    });

    it("succeeds for calls up to the limit (10)", async () => {
      const { checkEvaluationTriggerLimit: check } = await freshModule();
      for (let i = 0; i < 10; i++) {
        expect(check("eval-1").success).toBe(true);
      }
    });

    it("fails on the 11th call with retryAfter > 0", async () => {
      const { checkEvaluationTriggerLimit: check } = await freshModule();
      for (let i = 0; i < 10; i++) {
        check("eval-1");
      }
      const result = check("eval-1");
      expect(result.success).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("keeps independent limits per key", async () => {
      const { checkEvaluationTriggerLimit: check } = await freshModule();
      for (let i = 0; i < 10; i++) {
        check("key-a");
      }
      expect(check("key-a").success).toBe(false);
      expect(check("key-b").success).toBe(true);
    });

    it("resets the window after 1 hour", async () => {
      const { checkEvaluationTriggerLimit: check } = await freshModule();
      for (let i = 0; i < 10; i++) {
        check("eval-1");
      }
      expect(check("eval-1").success).toBe(false);

      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      expect(check("eval-1").success).toBe(true);
    });
  });

  // ---- Cross-store isolation ----

  describe("store isolation", () => {
    it("proposal and evaluation stores are independent", async () => {
      const mod = await freshModule();
      // Exhaust proposal limit
      for (let i = 0; i < 5; i++) {
        mod.checkProposalSubmitLimit("shared-key");
      }
      expect(mod.checkProposalSubmitLimit("shared-key").success).toBe(false);
      // Evaluation limit for the same key should still work
      expect(mod.checkEvaluationTriggerLimit("shared-key").success).toBe(true);
    });
  });
});
