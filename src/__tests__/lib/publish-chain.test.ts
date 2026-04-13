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
  // 6. Feedback tx reverts
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
