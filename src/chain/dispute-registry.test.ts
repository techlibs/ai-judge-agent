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
  getDisputeRegistryAddress: () => MOCK_ADDRESS,
  getDeploymentBlock: () => 300n,
}));

import {
  prepareOpenDispute,
  prepareCastVote,
  prepareResolveDispute,
  getDispute,
  getDisputeOpenedEvents,
  getDisputeVoteCastEvents,
  getDisputeResolvedEvents,
  DISPUTE_REGISTRY_ABI,
} from "./dispute-registry";

describe("dispute-registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DISPUTE_REGISTRY_ABI", () => {
    it("is exported and non-empty", () => {
      expect(DISPUTE_REGISTRY_ABI).toBeDefined();
      expect(DISPUTE_REGISTRY_ABI.length).toBeGreaterThan(0);
    });
  });

  describe("prepareOpenDispute", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareOpenDispute(
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "ipfs://evidence"
      );
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      const proposalId =
        "0x0000000000000000000000000000000000000000000000000000000000000abc";
      prepareOpenDispute(proposalId, "ipfs://ev");
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "openDispute",
          args: [proposalId, "ipfs://ev"],
        })
      );
    });
  });

  describe("prepareCastVote", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareCastVote(1n, true);
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with uphold=true", () => {
      prepareCastVote(5n, true);
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "castVote",
          args: [5n, true],
        })
      );
    });

    it("calls encodeFunctionData with uphold=false", () => {
      prepareCastVote(5n, false);
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "castVote",
          args: [5n, false],
        })
      );
    });
  });

  describe("prepareResolveDispute", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareResolveDispute(1n, 8500);
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      prepareResolveDispute(10n, 7200);
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "resolveDispute",
          args: [10n, 7200],
        })
      );
    });
  });

  describe("getDispute", () => {
    it("calls publicClient.readContract with correct params", async () => {
      const mockDispute = {
        proposalId: "0x01",
        initiator: MOCK_ADDRESS,
        stakeAmount: 1000n,
        evidenceCid: "ipfs://ev",
        status: 0,
        newScore: 0,
        deadline: 1700000000,
        createdAt: 1699000000,
        upholdVotes: 3,
        overturnVotes: 1,
      };
      mockReadContract.mockResolvedValue(mockDispute);
      const result = await getDispute(1n);
      expect(result).toEqual(mockDispute);
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          functionName: "getDispute",
          args: [1n],
        })
      );
    });
  });

  describe("getDisputeOpenedEvents", () => {
    it("uses deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getDisputeOpenedEvents();
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "DisputeOpened",
          fromBlock: 300n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getDisputeOpenedEvents(999n);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 999n,
        })
      );
    });
  });

  describe("getDisputeVoteCastEvents", () => {
    it("uses deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getDisputeVoteCastEvents();
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "DisputeVoteCast",
          fromBlock: 300n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getDisputeVoteCastEvents(777n);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 777n,
        })
      );
    });
  });

  describe("getDisputeResolvedEvents", () => {
    it("uses deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getDisputeResolvedEvents();
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "DisputeResolved",
          fromBlock: 300n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getDisputeResolvedEvents(1500n);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 1500n,
        })
      );
    });
  });
});
