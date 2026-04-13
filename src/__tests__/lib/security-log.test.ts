import { describe, it, expect, spyOn } from "bun:test";
import { logSecurityEvent } from "@/lib/security-log";

describe("logSecurityEvent", () => {
  it("logs JSON with timestamp and SECURITY level", () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
    logSecurityEvent({ type: "rate_limited", ip: "1.2.3.4", endpoint: "/api/proposals", limit: "5/h" });
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.level).toBe("SECURITY");
    expect(logged.timestamp).toBeDefined();
    expect(logged.type).toBe("rate_limited");
    spy.mockRestore();
  });

  it("includes event metadata", () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
    logSecurityEvent({ type: "pii_detected", proposalId: "p-1", patterns: ["email"] });
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.proposalId).toBe("p-1");
    expect(logged.patterns).toEqual(["email"]);
    spy.mockRestore();
  });

  it("handles score_anomaly events", () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
    logSecurityEvent({ type: "score_anomaly", proposalId: "p-2", flags: ["ALL_MAX"] });
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.type).toBe("score_anomaly");
    expect(logged.flags).toEqual(["ALL_MAX"]);
    spy.mockRestore();
  });
});
