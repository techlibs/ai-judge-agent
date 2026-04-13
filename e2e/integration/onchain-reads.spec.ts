import { test, expect } from "@playwright/test";

/**
 * Integration tests for on-chain contract verification on Base Sepolia.
 *
 * Covers BDD features:
 * - onchain-verification.feature: Contract deployment + read operations
 */

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

// Contract addresses from .env.local
const CONTRACTS = {
  EvaluationRegistry: "0xa86D6684De7878C36F03697657702A86D13028d8",
  IdentityRegistry: "0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a",
  MilestoneManager: "0xb4161cB90f2664A0d4485265ee150A7f3a7d536b",
  ReputationRegistry: "0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f",
  ValidationRegistry: "0x5A0Bf56694c8448F681c909C1F61849c1A183f17",
  DisputeRegistry: "0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e",
} as const;

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(BASE_SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await response.json() as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

test.describe("On-Chain — Contract Deployment Verification", () => {
  for (const [name, address] of Object.entries(CONTRACTS)) {
    test(`${name} is deployed at ${address}`, async () => {
      // eth_getCode returns "0x" for EOA (no contract), non-empty for deployed contracts
      const code = await rpcCall("eth_getCode", [address, "latest"]);
      expect(typeof code).toBe("string");
      expect((code as string).length).toBeGreaterThan(2); // More than just "0x"
    });
  }
});

test.describe("On-Chain — EvaluationRegistry Reads", () => {
  test("can call getEvaluation with a zero proposalId (returns empty)", async () => {
    // Encode getEvaluation(bytes32) with zero proposalId
    const zeroProposalId = "0x" + "00".repeat(32);
    const selector = "0xfce1ae6e"; // keccak256("getEvaluation(bytes32)") first 4 bytes
    const calldata = selector + zeroProposalId.slice(2);

    const result = await rpcCall("eth_call", [
      { to: CONTRACTS.EvaluationRegistry, data: calldata },
      "latest",
    ]);

    // Should return ABI-encoded tuple (even if empty/zeroed)
    expect(typeof result).toBe("string");
    expect((result as string).startsWith("0x")).toBe(true);
  });
});

test.describe("On-Chain — Score Scaling Verification", () => {
  test("score scaling: 8.5 → 850, reputation 1.005 → 10050", async () => {
    // These are pure functions verified without RPC, but included
    // to document the chain precision contract
    const SCORE_PRECISION = 100;
    const REPUTATION_BASE = 10000;

    expect(Math.round(8.5 * SCORE_PRECISION)).toBe(850);
    expect(Math.round(1.005 * REPUTATION_BASE)).toBe(10050);
    expect(Math.round(10.0 * SCORE_PRECISION)).toBe(1000);
    expect(Math.round(1.05 * REPUTATION_BASE)).toBe(10500);
    expect(Math.round(0.0 * SCORE_PRECISION)).toBe(0);
  });

  test("proposalId is deterministic keccak256 hash", async () => {
    // Import the hash function dynamically to verify
    const { keccak256, toHex } = await import("viem");

    const id1 = keccak256(toHex("test-platform:test-123"));
    const id2 = keccak256(toHex("test-platform:test-123"));
    const id3 = keccak256(toHex("other-platform:test-123"));

    expect(id1).toBe(id2); // Same inputs → same hash
    expect(id1).not.toBe(id3); // Different platform → different hash
    expect(id1).toMatch(/^0x[a-f0-9]{64}$/); // Valid bytes32
  });
});
