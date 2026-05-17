import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the contracts module before importing the module under test
vi.mock("@/chain/contracts", () => ({
  publicClient: {
    getTransactionCount: vi.fn(),
    getBalance: vi.fn(),
  },
}));

import { collectOnChainMetrics } from "./onchain";
import { publicClient } from "@/chain/contracts";

const mockedClient = vi.mocked(publicClient);

const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as const;

describe("collectOnChainMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects transaction count and fund utilization", async () => {
    mockedClient.getTransactionCount.mockResolvedValue(42);
    // totalFunded = 10 ETH, balance = 3 ETH => spent = 7 ETH => utilization = 0.7
    mockedClient.getBalance.mockResolvedValue(3_000_000_000_000_000_000n);

    const result = await collectOnChainMetrics({
      projectAddress: TEST_ADDRESS,
      totalFunded: 10_000_000_000_000_000_000n,
      fromBlock: 0n,
    });

    expect(result.transactionCount).toBe(42);
    expect(result.fundUtilization).toBeCloseTo(0.7, 4);
  });

  it("returns zero utilization when totalFunded is zero", async () => {
    mockedClient.getTransactionCount.mockResolvedValue(5);
    mockedClient.getBalance.mockResolvedValue(0n);

    const result = await collectOnChainMetrics({
      projectAddress: TEST_ADDRESS,
      totalFunded: 0n,
      fromBlock: 0n,
    });

    expect(result.transactionCount).toBe(5);
    expect(result.fundUtilization).toBe(0);
  });

  it("returns full utilization (1.0) when all funds are spent", async () => {
    mockedClient.getTransactionCount.mockResolvedValue(100);
    mockedClient.getBalance.mockResolvedValue(0n);

    const result = await collectOnChainMetrics({
      projectAddress: TEST_ADDRESS,
      totalFunded: 5_000_000_000_000_000_000n,
      fromBlock: 0n,
    });

    expect(result.transactionCount).toBe(100);
    expect(result.fundUtilization).toBe(1);
  });

  it("clamps fund utilization to 0 when balance exceeds totalFunded", async () => {
    mockedClient.getTransactionCount.mockResolvedValue(1);
    // Balance is greater than totalFunded (received extra funds)
    mockedClient.getBalance.mockResolvedValue(20_000_000_000_000_000_000n);

    const result = await collectOnChainMetrics({
      projectAddress: TEST_ADDRESS,
      totalFunded: 10_000_000_000_000_000_000n,
      fromBlock: 0n,
    });

    expect(result.transactionCount).toBe(1);
    expect(result.fundUtilization).toBe(0);
  });

  it("clamps fund utilization to 1 maximum", async () => {
    mockedClient.getTransactionCount.mockResolvedValue(10);
    mockedClient.getBalance.mockResolvedValue(0n);

    const result = await collectOnChainMetrics({
      projectAddress: TEST_ADDRESS,
      totalFunded: 1_000_000_000_000_000_000n,
      fromBlock: 0n,
    });

    expect(result.fundUtilization).toBeLessThanOrEqual(1);
    expect(result.fundUtilization).toBeGreaterThanOrEqual(0);
  });
});
