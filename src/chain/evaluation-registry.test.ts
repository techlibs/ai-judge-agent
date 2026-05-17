import { describe, it, expect } from "vitest";
import {
  computeProposalId,
  scaleScoreToChain,
  scaleReputationToChain,
} from "./evaluation-registry";

describe("computeProposalId", () => {
  it("produces a deterministic bytes32 hex", () => {
    const id = computeProposalId("web-form", "abc-123");
    expect(id).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("produces different IDs for different inputs", () => {
    const id1 = computeProposalId("web-form", "abc-123");
    const id2 = computeProposalId("web-form", "xyz-456");
    expect(id1).not.toBe(id2);
  });

  it("produces different IDs for different platforms", () => {
    const id1 = computeProposalId("web-form", "abc-123");
    const id2 = computeProposalId("api", "abc-123");
    expect(id1).not.toBe(id2);
  });

  it("is idempotent", () => {
    const id1 = computeProposalId("web-form", "abc-123");
    const id2 = computeProposalId("web-form", "abc-123");
    expect(id1).toBe(id2);
  });
});

describe("scaleScoreToChain", () => {
  it("scales score by 100x", () => {
    expect(scaleScoreToChain(7.5)).toBe(750);
  });

  it("rounds fractional results", () => {
    expect(scaleScoreToChain(7.555)).toBe(756);
  });

  it("handles zero", () => {
    expect(scaleScoreToChain(0)).toBe(0);
  });
});

describe("scaleReputationToChain", () => {
  it("scales multiplier by 10000x", () => {
    expect(scaleReputationToChain(1.0)).toBe(10000);
  });

  it("handles multiplier above 1", () => {
    expect(scaleReputationToChain(1.5)).toBe(15000);
  });

  it("handles fractional multipliers", () => {
    expect(scaleReputationToChain(0.85)).toBe(8500);
  });
});
