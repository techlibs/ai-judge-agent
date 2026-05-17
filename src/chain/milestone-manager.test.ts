import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadContract = vi.fn();
const mockGetContractEvents = vi.fn();
const mockEncodeFunctionData = vi.fn((_params: unknown) => "0xabcdef" as const);
const MOCK_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

vi.mock("viem", () => ({
  encodeFunctionData: (params: unknown) => mockEncodeFunctionData(params),
}));

vi.mock("./contracts", () => ({
  publicClient: {
    readContract: (...args: unknown[]) => mockReadContract(...args),
    getContractEvents: (...args: unknown[]) => mockGetContractEvents(...args),
  },
  getMilestoneManagerAddress: () => MOCK_ADDRESS,
  getDeploymentBlock: () => 400n,
}));

import {
  prepareReleaseMilestone,
  getMilestone,
  getFundReleasedEvents,
  getFundsForwardedEvents,
  MILESTONE_MANAGER_ABI,
} from "./milestone-manager";

describe("milestone-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MILESTONE_MANAGER_ABI", () => {
    it("is exported and non-empty", () => {
      expect(MILESTONE_MANAGER_ABI).toBeDefined();
      expect(MILESTONE_MANAGER_ABI.length).toBeGreaterThan(0);
    });
  });

  describe("prepareReleaseMilestone", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareReleaseMilestone(
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        0,
        8500,
        "0x1234567890abcdef1234567890abcdef12345678"
      );
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      const projectId =
        "0x0000000000000000000000000000000000000000000000000000000000000abc";
      const recipient = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      prepareReleaseMilestone(projectId, 2, 9000, recipient);
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "releaseMilestone",
          args: [projectId, 2, 9000, recipient],
        })
      );
    });
  });

  describe("getMilestone", () => {
    it("calls publicClient.readContract with correct params", async () => {
      const mockMilestone = {
        score: 8500,
        releasePercentage: 2500,
        released: true,
        totalAmount: 1000000n,
        releasedAmount: 250000n,
      };
      mockReadContract.mockResolvedValue(mockMilestone);
      const projectId =
        "0x0000000000000000000000000000000000000000000000000000000000000001";
      const result = await getMilestone(projectId, 0);
      expect(result).toEqual(mockMilestone);
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          functionName: "getMilestone",
          args: [projectId, 0],
        })
      );
    });
  });

  describe("getFundReleasedEvents", () => {
    it("uses deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getFundReleasedEvents();
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "FundReleased",
          fromBlock: 400n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      const events = [{ args: { milestoneIndex: 0 } }];
      mockGetContractEvents.mockResolvedValue(events);
      const result = await getFundReleasedEvents(800n);
      expect(result).toEqual(events);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 800n,
        })
      );
    });
  });

  describe("getFundsForwardedEvents", () => {
    it("uses deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getFundsForwardedEvents();
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "FundsForwarded",
          fromBlock: 400n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getFundsForwardedEvents(600n);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 600n,
        })
      );
    });
  });
});
