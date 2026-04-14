import { type Hex } from "viem";
import { publicClient } from "@/chain/contracts";

interface OnChainMetrics {
  readonly transactionCount: number;
  readonly fundUtilization: number;
}

interface OnChainCollectorParams {
  readonly projectAddress: Hex;
  readonly totalFunded: bigint;
  readonly fromBlock: bigint;
}

export async function collectOnChainMetrics(
  params: OnChainCollectorParams
): Promise<OnChainMetrics> {
  const { projectAddress, totalFunded } = params;

  const transactionCount = await publicClient.getTransactionCount({
    address: projectAddress,
  });

  const balance = await publicClient.getBalance({
    address: projectAddress,
  });

  let fundUtilization = 0;
  if (totalFunded > 0n) {
    const spent = totalFunded - balance;
    fundUtilization =
      Number((spent * 10000n) / totalFunded) / 10000;
    fundUtilization = Math.max(0, Math.min(1, fundUtilization));
  }

  return {
    transactionCount,
    fundUtilization,
  };
}

export type { OnChainMetrics, OnChainCollectorParams };
