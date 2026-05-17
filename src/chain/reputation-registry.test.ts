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
  getReputationRegistryAddress: () => MOCK_ADDRESS,
  getDeploymentBlock: () => 200n,
}));

import {
  prepareGiveFeedback,
  prepareRevokeFeedback,
  getReputationSummary,
  readAllFeedback,
  getNewFeedbackEvents,
  REPUTATION_REGISTRY_ABI,
} from "./reputation-registry";

describe("reputation-registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("REPUTATION_REGISTRY_ABI", () => {
    it("is exported and non-empty", () => {
      expect(REPUTATION_REGISTRY_ABI).toBeDefined();
      expect(REPUTATION_REGISTRY_ABI.length).toBeGreaterThan(0);
    });
  });

  describe("prepareGiveFeedback", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareGiveFeedback(
        1n,
        8000n,
        "quality",
        "delivery",
        "ipfs://feedback",
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      prepareGiveFeedback(
        2n,
        9000n,
        "tag-a",
        "tag-b",
        "ipfs://fb",
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      );
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "giveFeedback",
          args: [
            2n,
            9000n,
            "tag-a",
            "tag-b",
            "ipfs://fb",
            "0x0000000000000000000000000000000000000000000000000000000000000002",
          ],
        })
      );
    });
  });

  describe("prepareRevokeFeedback", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareRevokeFeedback(1n, 0n);
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      prepareRevokeFeedback(5n, 3n);
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "revokeFeedback",
          args: [5n, 3n],
        })
      );
    });
  });

  describe("getReputationSummary", () => {
    it("calls publicClient.readContract with correct params", async () => {
      const mockSummary = {
        totalFeedback: 10n,
        activeFeedback: 8n,
        averageValueBps: 7500n,
      };
      mockReadContract.mockResolvedValue(mockSummary);
      const result = await getReputationSummary(1n);
      expect(result).toEqual(mockSummary);
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          functionName: "getSummary",
          args: [1n],
        })
      );
    });
  });

  describe("readAllFeedback", () => {
    it("calls publicClient.readContract with correct params", async () => {
      const mockFeedback = [
        {
          clientAddress: MOCK_ADDRESS,
          value: 8000n,
          tag1: "quality",
          tag2: "speed",
          feedbackURI: "ipfs://fb1",
          feedbackHash: "0x01",
          exists: true,
          isRevoked: false,
          timestamp: 1700000000,
        },
      ];
      mockReadContract.mockResolvedValue(mockFeedback);
      const result = await readAllFeedback(1n, 0n, 10n);
      expect(result).toEqual(mockFeedback);
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          functionName: "readAllFeedback",
          args: [1n, 0n, 10n],
        })
      );
    });
  });

  describe("getNewFeedbackEvents", () => {
    it("uses deployment block when no fromBlock provided", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      const result = await getNewFeedbackEvents();
      expect(result).toEqual([]);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "NewFeedback",
          fromBlock: 200n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      const events = [{ args: { agentId: 1n } }];
      mockGetContractEvents.mockResolvedValue(events);
      const result = await getNewFeedbackEvents(1000n);
      expect(result).toEqual(events);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 1000n,
        })
      );
    });
  });
});
