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
  getIdentityRegistryAddress: () => MOCK_ADDRESS,
  getDeploymentBlock: () => 100n,
}));

import {
  prepareRegisterAgent,
  prepareSetAgentURI,
  prepareSetMetadata,
  getAgentURI,
  getMetadata,
  getAgentOwner,
  getRegisteredEvents,
  IDENTITY_REGISTRY_ABI,
} from "./identity-registry";

describe("identity-registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("IDENTITY_REGISTRY_ABI", () => {
    it("is exported and non-empty", () => {
      expect(IDENTITY_REGISTRY_ABI).toBeDefined();
      expect(IDENTITY_REGISTRY_ABI.length).toBeGreaterThan(0);
    });
  });

  describe("prepareRegisterAgent", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareRegisterAgent("ipfs://some-uri");
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      prepareRegisterAgent("ipfs://agent-uri");
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "register",
          args: ["ipfs://agent-uri"],
        })
      );
    });
  });

  describe("prepareSetAgentURI", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareSetAgentURI(1n, "ipfs://new-uri");
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      prepareSetAgentURI(42n, "ipfs://updated");
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "setAgentURI",
          args: [42n, "ipfs://updated"],
        })
      );
    });
  });

  describe("prepareSetMetadata", () => {
    it("returns hex-encoded function data", () => {
      const result = prepareSetMetadata(1n, "role", "0xdeadbeef");
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x/);
    });

    it("calls encodeFunctionData with correct args", () => {
      prepareSetMetadata(5n, "version", "0xaa");
      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "setMetadata",
          args: [5n, "version", "0xaa"],
        })
      );
    });
  });

  describe("getAgentURI", () => {
    it("calls publicClient.readContract with correct params", async () => {
      mockReadContract.mockResolvedValue("ipfs://result-uri");
      const result = await getAgentURI(7n);
      expect(result).toBe("ipfs://result-uri");
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          functionName: "getAgentURI",
          args: [7n],
        })
      );
    });
  });

  describe("getMetadata", () => {
    it("calls publicClient.readContract with correct params", async () => {
      mockReadContract.mockResolvedValue("0xdeadbeef");
      const result = await getMetadata(3n, "role");
      expect(result).toBe("0xdeadbeef");
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          functionName: "getMetadata",
          args: [3n, "role"],
        })
      );
    });
  });

  describe("getAgentOwner", () => {
    it("calls publicClient.readContract with correct params", async () => {
      mockReadContract.mockResolvedValue(MOCK_ADDRESS);
      const result = await getAgentOwner(10n);
      expect(result).toBe(MOCK_ADDRESS);
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          functionName: "ownerOf",
          args: [10n],
        })
      );
    });
  });

  describe("getRegisteredEvents", () => {
    it("calls getContractEvents with deployment block when no fromBlock", async () => {
      mockGetContractEvents.mockResolvedValue([]);
      const result = await getRegisteredEvents();
      expect(result).toEqual([]);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ADDRESS,
          eventName: "Registered",
          fromBlock: 100n,
        })
      );
    });

    it("calls getContractEvents with provided fromBlock", async () => {
      const mockEvents = [{ args: { agentId: 1n } }];
      mockGetContractEvents.mockResolvedValue(mockEvents);
      const result = await getRegisteredEvents(500n);
      expect(result).toEqual(mockEvents);
      expect(mockGetContractEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 500n,
        })
      );
    });
  });
});
