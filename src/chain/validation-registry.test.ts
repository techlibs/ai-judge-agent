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
  getValidationRegistryAddress: () => MOCK_ADDRESS,
  getDeploymentBlock: () => 500n,
}));

import {
  prepareValidationRequest,
  prepareValidationResponse,
  getValidationSummary,
  getValidationRequestedEvents,
  getValidationRespondedEvents,
  VALIDATION_REGISTRY_ABI,
} from "./validation-registry";

describe("validation-registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("VALIDATION_REGISTRY_ABI", () => {
    it("is exported and non-empty", () => {
      expect(VALIDATION_REGISTRY_ABI).toBeDefined();
      expect(VALIDATION_REGISTRY_ABI.length).toBeGreaterThan(0);
    });
  });

  describe("prepareValidationRequest", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareValidationRequest(1n, "ipfs://request-uri");
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      prepareValidationRequest(42n, "ipfs://req");
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "validationRequest",
          args: [42n, "ipfs://req"],
        })
      );
    });
  });

  describe("prepareValidationResponse", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareValidationResponse(
        1n,
        85,
        "ipfs://response",
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "quality"
      );
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      const hash =
        "0x0000000000000000000000000000000000000000000000000000000000000abc";
      prepareValidationResponse(10n, 90, "ipfs://resp", hash, "accuracy");
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "validationResponse",
          args: [10n, 90, "ipfs://resp", hash, "accuracy"],
        })
      );
    });
  });

  describe("getValidationSummary", () => {
    it("calls publicClient.readContract with correct params", async () => {
      const mockSummary = {
        totalRequests: 20n,
        respondedRequests: 18n,
        averageScoreBps: 8500n,
      };
      mockReadContract.mockResolvedValue(mockSummary);
      const result = await getValidationSummary(1n);
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

  describe("getValidationRequestedEvents", () => {
    it("uses deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getValidationRequestedEvents();
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "ValidationRequested",
          fromBlock: 500n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      const events = [{ args: { requestId: 1n } }];
      mockGetContractEvents.mockResolvedValue(events);
      const result = await getValidationRequestedEvents(2000n);
      expect(result).toEqual(events);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 2000n,
        })
      );
    });
  });

  describe("getValidationRespondedEvents", () => {
    it("uses deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getValidationRespondedEvents();
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "ValidationResponded",
          fromBlock: 500n,
        })
      );
    });

    it("uses provided fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      await getValidationRespondedEvents(3000n);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 3000n,
        })
      );
    });
  });
});
