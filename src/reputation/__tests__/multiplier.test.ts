import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeReputationMultiplierFromIndex,
  lookupReputationIndex,
} from "@/reputation/multiplier";

vi.mock("@/chain/reputation-registry", () => ({
  getReputationSummary: vi.fn(),
}));

import { getReputationSummary } from "@/chain/reputation-registry";

const mockGetReputationSummary = vi.mocked(getReputationSummary);

describe("computeReputationMultiplierFromIndex", () => {
  it("returns exactly 1.0 when index is 0", () => {
    expect(computeReputationMultiplierFromIndex(0)).toBe(1.0);
  });

  it("caps at 1.05 for very high index", () => {
    expect(computeReputationMultiplierFromIndex(999_999)).toBe(1.05);
    expect(computeReputationMultiplierFromIndex(50_000)).toBe(1.05);
  });

  it("returns intermediate value for mid-range index (250)", () => {
    // 1.0 + 250/10000 = 1.025
    expect(computeReputationMultiplierFromIndex(250)).toBe(1.025);
  });

  it("returns raw value below 1.0 for negative index", () => {
    // Implementation does not floor below 1.0 for negatives
    const result = computeReputationMultiplierFromIndex(-100);
    expect(result).toBeCloseTo(0.99, 5);
  });

  it("reaches cap exactly at index 500", () => {
    // 1.0 + 500/10000 = 1.05
    expect(computeReputationMultiplierFromIndex(500)).toBe(1.05);
  });

  it("stays at cap when index is between cap and max", () => {
    expect(computeReputationMultiplierFromIndex(499)).toBeLessThan(1.05);
    expect(computeReputationMultiplierFromIndex(500)).toBe(1.05);
    expect(computeReputationMultiplierFromIndex(501)).toBe(1.05);
  });
});

describe("lookupReputationIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when activeFeedback is 0", async () => {
    mockGetReputationSummary.mockResolvedValueOnce({
      totalFeedback: 5n,
      activeFeedback: 0n,
      averageValueBps: 8000n,
    });

    const result = await lookupReputationIndex(1n);
    expect(result).toBe(0);
  });

  it("returns averageValueBps / BASIS_POINTS when activeFeedback > 0", async () => {
    // averageValueBps = 8000, BASIS_POINTS = 10000
    // Math.floor(8000 / 10000) = 0
    mockGetReputationSummary.mockResolvedValueOnce({
      totalFeedback: 3n,
      activeFeedback: 3n,
      averageValueBps: 8000n,
    });

    const result = await lookupReputationIndex(1n);
    expect(result).toBe(0);
  });

  it("returns non-zero index when averageValueBps >= BASIS_POINTS", async () => {
    // averageValueBps = 15000, BASIS_POINTS = 10000
    // Math.floor(15000 / 10000) = 1
    mockGetReputationSummary.mockResolvedValueOnce({
      totalFeedback: 5n,
      activeFeedback: 5n,
      averageValueBps: 15_000n,
    });

    const result = await lookupReputationIndex(2n);
    expect(result).toBe(1);
  });

  it("returns 0 when chain call throws", async () => {
    mockGetReputationSummary.mockRejectedValueOnce(new Error("RPC failure"));

    const result = await lookupReputationIndex(99n);
    expect(result).toBe(0);
  });

  it("calls getReputationSummary with the provided agentId", async () => {
    mockGetReputationSummary.mockResolvedValueOnce({
      totalFeedback: 1n,
      activeFeedback: 1n,
      averageValueBps: 5000n,
    });

    await lookupReputationIndex(42n);
    expect(mockGetReputationSummary).toHaveBeenCalledWith(42n);
  });
});
