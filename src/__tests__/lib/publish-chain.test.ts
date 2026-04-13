import { describe, it, expect, mock, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// Mock setup — must happen BEFORE dynamic import of the module under test
// ---------------------------------------------------------------------------

const IDENTITY_ADDRESS = "0x1111111111111111111111111111111111111111";
const REPUTATION_ADDRESS = "0x2222222222222222222222222222222222222222";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Mutable references — updated in beforeEach / individual tests
let mockGetContractAddresses = mock(() => ({
  identityRegistry: IDENTITY_ADDRESS,
  reputationRegistry: REPUTATION_ADDRESS,
  milestoneManager: ZERO_ADDRESS,
}));

const writeContractMock = mock(async () => "0xabc");
const waitForReceiptMock = mock(async ({ hash }: { hash: string }) => ({
  status: "success" as const,
  logs: [
    {
      topics: [
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ],
    },
  ],
}));

mock.module("@/lib/chain/config", () => ({
  getWalletClient: () => ({ writeContract: writeContractMock }),
  getPublicClient: () => ({ waitForTransactionReceipt: waitForReceiptMock }),
}));

mock.module("@/lib/chain/contracts", () => ({
  IDENTITY_REGISTRY_ABI: [],
  REPUTATION_REGISTRY_ABI: [],
  getContractAddresses: () => mockGetContractAddresses(),
}));

mock.module("@/lib/ipfs/client", () => ({
  ipfsUri: (cid: string) => `ipfs://${cid}`,
}));

// Dynamic import AFTER mock.module so the module sees our mocks
const { publishEvaluationOnChainDetailed } = await import(
  "@/lib/evaluation/publish-chain"
);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const SAMPLE_PARAMS = {
  proposalId: "prop-001",
  proposalIpfsCid: "QmProposal",
  evaluations: [
    { dimension: "tech" as const, score: 80, ipfsCid: "QmTech" },
    { dimension: "impact" as const, score: 75, ipfsCid: "QmImpact" },
    { dimension: "cost" as const, score: 70, ipfsCid: "QmCost" },
    { dimension: "team" as const, score: 85, ipfsCid: "QmTeam" },
  ],
  aggregateIpfsCid: "QmAggregate",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("publishEvaluationOnChainDetailed", () => {
  beforeEach(() => {
    writeContractMock.mockReset();
    waitForReceiptMock.mockReset();
    mockGetContractAddresses = mock(() => ({
      identityRegistry: IDENTITY_ADDRESS,
      reputationRegistry: REPUTATION_ADDRESS,
      milestoneManager: ZERO_ADDRESS,
    }));

    // Default: all txs succeed; hash varies per call index
    let writeCallCount = 0;
    writeContractMock.mockImplementation(async () => {
      writeCallCount++;
      return `0xtx${writeCallCount}`;
    });

    waitForReceiptMock.mockImplementation(async (_args: { hash: string }) => ({
      status: "success" as const,
      logs: [
        {
          topics: [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000001",
          ],
        },
      ],
    }));
  });

  // -------------------------------------------------------------------------
  // 1. Happy path
  // -------------------------------------------------------------------------
  it("happy path: returns all hashes and agentId=1n when all txs succeed", async () => {
    const result = await publishEvaluationOnChainDetailed(SAMPLE_PARAMS);

    expect(result.registerTxHash).toBe("0xtx1");
    expect(result.agentId).toBe(1n);
    expect(Object.keys(result.feedbackTxHashes)).toHaveLength(4);
    expect(result.feedbackTxHashes["tech"]).toBeDefined();
    expect(result.feedbackTxHashes["impact"]).toBeDefined();
    expect(result.feedbackTxHashes["cost"]).toBeDefined();
    expect(result.feedbackTxHashes["team"]).toBeDefined();
    expect(result.aggregateFeedbackTxHash).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 2. Calls writeContract exactly 6 times
  // -------------------------------------------------------------------------
  it("calls writeContract exactly 6 times (1 register + 4 feedback + 1 aggregate)", async () => {
    await publishEvaluationOnChainDetailed(SAMPLE_PARAMS);

    expect(writeContractMock).toHaveBeenCalledTimes(6);
  });

  // -------------------------------------------------------------------------
  // 3. Zero identity address throws
  // -------------------------------------------------------------------------
  it("throws when identity registry address is zero", async () => {
    mockGetContractAddresses = mock(() => ({
      identityRegistry: ZERO_ADDRESS,
      reputationRegistry: REPUTATION_ADDRESS,
      milestoneManager: ZERO_ADDRESS,
    }));

    await expect(
      publishEvaluationOnChainDetailed(SAMPLE_PARAMS)
    ).rejects.toThrow("IDENTITY_REGISTRY_ADDRESS is not configured");
  });

  // -------------------------------------------------------------------------
  // 4. Zero reputation address throws
  // -------------------------------------------------------------------------
  it("throws when reputation registry address is zero", async () => {
    mockGetContractAddresses = mock(() => ({
      identityRegistry: IDENTITY_ADDRESS,
      reputationRegistry: ZERO_ADDRESS,
      milestoneManager: ZERO_ADDRESS,
    }));

    await expect(
      publishEvaluationOnChainDetailed(SAMPLE_PARAMS)
    ).rejects.toThrow("REPUTATION_REGISTRY_ADDRESS is not configured");
  });

  // -------------------------------------------------------------------------
  // 5. Register tx reverts
  // -------------------------------------------------------------------------
  it("throws when identity registration transaction reverts", async () => {
    waitForReceiptMock.mockImplementation(async (_args: { hash: string }) => ({
      status: "reverted" as const,
      logs: [],
    }));

    await expect(
      publishEvaluationOnChainDetailed(SAMPLE_PARAMS)
    ).rejects.toThrow("Identity registration transaction reverted");
  });

  // -------------------------------------------------------------------------
  // 6. Verifies keccak256 content hashing
  // -------------------------------------------------------------------------
  it("verifies keccak256 content hashing", async () => {
    await publishEvaluationOnChainDetailed(SAMPLE_PARAMS);

    // Feedback calls are indices 1-4 (0 is register, 5 is aggregate)
    for (let i = 1; i <= 4; i++) {
      const callArgs = writeContractMock.mock.calls[i][0] as Record<string, unknown>;
      const args = callArgs.args as Array<unknown>;
      // contentHash is the last arg (index 7) — should be a bytes32 hex string (66 chars: 0x + 64 hex)
      const contentHash = args[7] as string;
      expect(contentHash).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });

  // -------------------------------------------------------------------------
  // 7. Verifies 60s timeout on waitForTransactionReceipt
  // -------------------------------------------------------------------------
  it("verifies 60s timeout on waitForTransactionReceipt", async () => {
    await publishEvaluationOnChainDetailed(SAMPLE_PARAMS);

    expect(waitForReceiptMock.mock.calls[0][0]).toHaveProperty("timeout", 60000);
  });

  // -------------------------------------------------------------------------
  // 8. Each feedback tx sends correct dimension
  // -------------------------------------------------------------------------
  it("each feedback tx sends correct dimension", async () => {
    await publishEvaluationOnChainDetailed(SAMPLE_PARAMS);

    const dimensions = ["tech", "impact", "cost", "team"];
    // writeContract calls: 0=register, 1-4=feedback, 5=aggregate
    for (let i = 0; i < dimensions.length; i++) {
      const callArgs = writeContractMock.mock.calls[i + 1][0] as Record<string, unknown>;
      const args = callArgs.args as Array<unknown>;
      // dimension is at index 3 in giveFeedback args
      expect(args[3]).toBe(dimensions[i]);
    }
  });

  // -------------------------------------------------------------------------
  // 9. Aggregate milestone sends correct metadata
  // -------------------------------------------------------------------------
  it("aggregate milestone sends correct metadata", async () => {
    await publishEvaluationOnChainDetailed(SAMPLE_PARAMS);

    // Last writeContract call (index 5) is the aggregate
    const lastCall = writeContractMock.mock.calls[5][0] as Record<string, unknown>;
    const args = lastCall.args as Array<unknown>;
    expect(args).toContain("aggregate");
    expect(args).toContain("milestone-v1");
  });

  // -------------------------------------------------------------------------
  // 10. Feedback tx reverts
  // -------------------------------------------------------------------------
  it("throws when a feedback transaction reverts", async () => {
    let receiptCallCount = 0;

    waitForReceiptMock.mockImplementation(async (_args: { hash: string }) => {
      receiptCallCount++;
      if (receiptCallCount === 1) {
        // Register receipt — success
        return {
          status: "success" as const,
          logs: [
            {
              topics: [
                "0x0000000000000000000000000000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000000000000000000000000001",
              ],
            },
          ],
        };
      }
      // First feedback receipt reverts
      return {
        status: "reverted" as const,
        logs: [],
      };
    });

    await expect(
      publishEvaluationOnChainDetailed(SAMPLE_PARAMS)
    ).rejects.toThrow(/reverted/);
  });
});
