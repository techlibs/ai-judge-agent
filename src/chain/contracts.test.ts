import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We must mock viem before importing the module under test, because
// contracts.ts calls createPublicClient and getChainConfig at the top level.
vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn(),
    getContractEvents: vi.fn(),
  })),
  http: vi.fn(() => "mock-transport"),
  isAddress: vi.fn((addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr)),
}));

vi.mock("viem/chains", () => ({
  baseSepolia: { id: 84532, name: "Base Sepolia" },
  base: { id: 8453, name: "Base" },
}));

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("contracts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getChainConfig", () => {
    it("throws on unsupported chain ID", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "999";
      await expect(
        import("./contracts")
      ).rejects.toThrow("Unsupported NEXT_PUBLIC_CHAIN_ID: 999");
    });

    it("accepts Base Sepolia chain ID (84532)", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      const mod = await import("./contracts");
      expect(mod.publicClient).toBeDefined();
    });

    it("accepts Base mainnet chain ID (8453)", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "8453";
      const mod = await import("./contracts");
      expect(mod.publicClient).toBeDefined();
    });

    it("defaults to 84532 when NEXT_PUBLIC_CHAIN_ID is unset", async () => {
      delete process.env.NEXT_PUBLIC_CHAIN_ID;
      const mod = await import("./contracts");
      expect(mod.publicClient).toBeDefined();
    });
  });

  describe("getEvaluationRegistryAddress", () => {
    it("throws when env var is missing", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      delete process.env.NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS;
      const mod = await import("./contracts");
      expect(() => mod.getEvaluationRegistryAddress()).toThrow(
        "NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS environment variable is required"
      );
    });

    it("throws when address is invalid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS = "not-an-address";
      const mod = await import("./contracts");
      expect(() => mod.getEvaluationRegistryAddress()).toThrow(
        "NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS is not a valid address"
      );
    });

    it("returns address when valid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS = VALID_ADDRESS;
      const mod = await import("./contracts");
      expect(mod.getEvaluationRegistryAddress()).toBe(VALID_ADDRESS);
    });
  });

  describe("getIdentityRegistryAddress", () => {
    it("throws when env var is missing", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      delete process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS;
      const mod = await import("./contracts");
      expect(() => mod.getIdentityRegistryAddress()).toThrow(
        "NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS environment variable is required"
      );
    });

    it("throws when address is invalid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS = "0xINVALID";
      const mod = await import("./contracts");
      expect(() => mod.getIdentityRegistryAddress()).toThrow(
        "NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS is not a valid address"
      );
    });

    it("returns address when valid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS = VALID_ADDRESS;
      const mod = await import("./contracts");
      expect(mod.getIdentityRegistryAddress()).toBe(VALID_ADDRESS);
    });
  });

  describe("getMilestoneManagerAddress", () => {
    it("throws when env var is missing", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      delete process.env.NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS;
      const mod = await import("./contracts");
      expect(() => mod.getMilestoneManagerAddress()).toThrow(
        "NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS environment variable is required"
      );
    });

    it("throws when address is invalid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS = "bad";
      const mod = await import("./contracts");
      expect(() => mod.getMilestoneManagerAddress()).toThrow(
        "NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS is not a valid address"
      );
    });

    it("returns address when valid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS = VALID_ADDRESS;
      const mod = await import("./contracts");
      expect(mod.getMilestoneManagerAddress()).toBe(VALID_ADDRESS);
    });
  });

  describe("getReputationRegistryAddress", () => {
    it("throws when env var is missing", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      delete process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS;
      const mod = await import("./contracts");
      expect(() => mod.getReputationRegistryAddress()).toThrow(
        "NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS environment variable is required"
      );
    });

    it("throws when address is invalid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS = "xyz";
      const mod = await import("./contracts");
      expect(() => mod.getReputationRegistryAddress()).toThrow(
        "NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS is not a valid address"
      );
    });

    it("returns address when valid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS = VALID_ADDRESS;
      const mod = await import("./contracts");
      expect(mod.getReputationRegistryAddress()).toBe(VALID_ADDRESS);
    });
  });

  describe("getValidationRegistryAddress", () => {
    it("throws when env var is missing", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      delete process.env.NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS;
      const mod = await import("./contracts");
      expect(() => mod.getValidationRegistryAddress()).toThrow(
        "NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS environment variable is required"
      );
    });

    it("throws when address is invalid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS = "no";
      const mod = await import("./contracts");
      expect(() => mod.getValidationRegistryAddress()).toThrow(
        "NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS is not a valid address"
      );
    });

    it("returns address when valid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS = VALID_ADDRESS;
      const mod = await import("./contracts");
      expect(mod.getValidationRegistryAddress()).toBe(VALID_ADDRESS);
    });
  });

  describe("getDisputeRegistryAddress", () => {
    it("throws when env var is missing", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      delete process.env.NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS;
      const mod = await import("./contracts");
      expect(() => mod.getDisputeRegistryAddress()).toThrow(
        "NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS environment variable is required"
      );
    });

    it("throws when address is invalid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS = "0xZZZ";
      const mod = await import("./contracts");
      expect(() => mod.getDisputeRegistryAddress()).toThrow(
        "NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS is not a valid address"
      );
    });

    it("returns address when valid", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS = VALID_ADDRESS;
      const mod = await import("./contracts");
      expect(mod.getDisputeRegistryAddress()).toBe(VALID_ADDRESS);
    });
  });

  describe("getDeploymentBlock", () => {
    it("returns BigInt from env when set", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      process.env.DEPLOYMENT_BLOCK = "12345";
      const mod = await import("./contracts");
      expect(mod.getDeploymentBlock()).toBe(12345n);
    });

    it("returns 0n when DEPLOYMENT_BLOCK is not set", async () => {
      process.env.NEXT_PUBLIC_CHAIN_ID = "84532";
      delete process.env.DEPLOYMENT_BLOCK;
      const mod = await import("./contracts");
      expect(mod.getDeploymentBlock()).toBe(0n);
    });
  });
});
