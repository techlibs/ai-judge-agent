import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logSecurityEvent } from "@/lib/security-log";

describe("logSecurityEvent", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function firstLogArg(): string {
    const call = consoleSpy.mock.calls[0];
    if (!call) throw new Error("Expected console.log to have been called");
    return call[0] as string;
  }

  it("logs a JSON string to console.log", () => {
    logSecurityEvent({ type: "rate_limited" });
    expect(consoleSpy).toHaveBeenCalledOnce();
    const arg = firstLogArg();
    expect(() => JSON.parse(arg)).not.toThrow();
  });

  it("includes level=SECURITY in the output", () => {
    logSecurityEvent({ type: "auth_failed" });
    const parsed = JSON.parse(firstLogArg()) as Record<
      string,
      unknown
    >;
    expect(parsed.level).toBe("SECURITY");
  });

  it("includes an ISO timestamp", () => {
    logSecurityEvent({ type: "pii_detected" });
    const parsed = JSON.parse(firstLogArg()) as Record<
      string,
      unknown
    >;
    expect(parsed.timestamp).toBeDefined();
    // Verify it's a valid ISO date
    expect(new Date(parsed.timestamp as string).toISOString()).toBe(
      parsed.timestamp
    );
  });

  it("includes the event type", () => {
    logSecurityEvent({ type: "injection_attempt" });
    const parsed = JSON.parse(firstLogArg()) as Record<
      string,
      unknown
    >;
    expect(parsed.type).toBe("injection_attempt");
  });

  it("spreads additional event properties", () => {
    logSecurityEvent({
      type: "score_anomaly",
      proposalId: "prop-123",
      score: 99,
      details: "Unusually high score",
    });
    const parsed = JSON.parse(firstLogArg()) as Record<
      string,
      unknown
    >;
    expect(parsed.proposalId).toBe("prop-123");
    expect(parsed.score).toBe(99);
    expect(parsed.details).toBe("Unusually high score");
  });

  it("event type overwrites level if there is a conflict (spread order)", () => {
    // The implementation does { level, timestamp, ...event }
    // So event.level would overwrite level, and event.timestamp would overwrite timestamp
    logSecurityEvent({
      type: "dispute_opened",
      level: "CUSTOM" as unknown,
    } as { type: "dispute_opened"; [key: string]: unknown });

    const parsed = JSON.parse(firstLogArg()) as Record<
      string,
      unknown
    >;
    // Spread overwrites the earlier keys
    expect(parsed.level).toBe("CUSTOM");
  });

  it("handles all defined event types", () => {
    const types = [
      "rate_limited",
      "auth_failed",
      "score_anomaly",
      "pii_detected",
      "injection_attempt",
      "external_data_injection",
      "coherence_review_recommended",
      "webhook_signature_invalid",
      "dispute_opened",
      "dispute_resolved",
    ] as const;

    for (const type of types) {
      consoleSpy.mockClear();
      logSecurityEvent({ type });
      const parsed = JSON.parse(
        firstLogArg()
      ) as Record<string, unknown>;
      expect(parsed.type).toBe(type);
    }
  });
});
