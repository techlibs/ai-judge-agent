import { getPublicClient } from "@/lib/chain/client";
import { getContractAddresses } from "@/lib/chain/contracts";
import { REPUTATION_REGISTRY_ABI } from "@/lib/chain/contracts";
import type { ReputationFeedbackEntry, ReputationSummary } from "./reputation-schemas";

type FeedbackEntryWithoutTxHash = Omit<ReputationFeedbackEntry, "txHash">;

const MAX_FEEDBACK_ENTRIES = 100;

const FEEDBACK_GIVEN_EVENT = REPUTATION_REGISTRY_ABI[4];

export type ReputationHistoryResult =
  | { ok: true; data: ReadonlyArray<FeedbackEntryWithoutTxHash> }
  | { ok: false; error: string };

export async function getReputationHistory(
  agentId: string,
): Promise<ReputationHistoryResult> {
  try {
    const publicClient = getPublicClient();
    const { reputationRegistry } = getContractAddresses();

    const feedbackCount = await publicClient.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getFeedbackCount",
      args: [BigInt(agentId)],
    });

    const totalCount = Number(feedbackCount);
    if (totalCount === 0) return { ok: true, data: [] };

    const count = Math.min(totalCount, MAX_FEEDBACK_ENTRIES);

    const feedbackPromises = Array.from({ length: count }, (_, i) =>
      publicClient.readContract({
        address: reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "readFeedback",
        args: [BigInt(agentId), BigInt(i)],
      }),
    );
    const feedbackResults = await Promise.all(feedbackPromises);

    const rawEntries = feedbackResults.map((result) => {
      const [evaluator, score, contentHash, blockNumberValue] = result;
      return { evaluator, score, contentHash, blockNumber: blockNumberValue };
    });

    const uniqueBlockNumbers = [
      ...new Set(rawEntries.map((e) => e.blockNumber)),
    ];

    const blockTimestampMap = new Map<bigint, bigint>();
    const blockPromises = uniqueBlockNumbers.map(async (blockNum) => {
      try {
        const block = await publicClient.getBlock({
          blockNumber: blockNum,
        });
        blockTimestampMap.set(blockNum, block.timestamp);
      } catch {
        blockTimestampMap.set(blockNum, 0n);
      }
    });
    await Promise.all(blockPromises);

    const entries: FeedbackEntryWithoutTxHash[] = rawEntries.map((raw) => ({
      clientAddress: raw.evaluator,
      value: Number(raw.score),
      tag1: "grant-evaluation",
      tag2: "",
      feedbackURI: raw.contentHash,
      feedbackHash: raw.contentHash,
      blockNumber: Number(raw.blockNumber),
      timestamp: Number(blockTimestampMap.get(raw.blockNumber) ?? 0n),
    }));

    entries.sort((a, b) => b.blockNumber - a.blockNumber);
    return { ok: true, data: entries };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to read reputation history:", error);
    return { ok: false, error: message };
  }
}

export type ReputationSummaryResult =
  | { ok: true; data: ReputationSummary }
  | { ok: false; error: string };

export async function getReputationSummary(
  agentId: string,
): Promise<ReputationSummaryResult> {
  try {
    const publicClient = getPublicClient();
    const { reputationRegistry } = getContractAddresses();

    const result = await publicClient.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getSummary",
      args: [BigInt(agentId)],
    });

    const [count, avgScore] = result;
    return {
      ok: true,
      data: {
        feedbackCount: Number(count),
        averageScore: Number(avgScore),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to read reputation summary:", error);
    return { ok: false, error: message };
  }
}

export async function getTxHashesForBlocks(
  agentId: string,
  blockNumbers: ReadonlyArray<number>,
): Promise<Map<number, string>> {
  const txHashMap = new Map<number, string>();
  const uniqueBlocks = [...new Set(blockNumbers)];
  if (uniqueBlocks.length === 0) return txHashMap;

  const publicClient = getPublicClient();
  const { reputationRegistry } = getContractAddresses();

  const logPromises = uniqueBlocks.map(async (blockNum) => {
    try {
      const logs = await publicClient.getLogs({
        address: reputationRegistry,
        event: FEEDBACK_GIVEN_EVENT,
        args: { tokenId: BigInt(agentId) },
        fromBlock: BigInt(blockNum),
        toBlock: BigInt(blockNum),
      });

      if (logs.length > 0 && logs[0].transactionHash) {
        return { blockNum, txHash: logs[0].transactionHash };
      }
    } catch (error) {
      console.error(
        `Failed to get txHash for block ${blockNum}:`,
        error,
      );
    }
    return null;
  });

  const results = await Promise.all(logPromises);
  for (const result of results) {
    if (result) {
      txHashMap.set(result.blockNum, result.txHash);
    }
  }

  return txHashMap;
}
