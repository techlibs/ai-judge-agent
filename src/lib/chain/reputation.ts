import { parseAbiItem } from "viem";
import { getPublicClient } from "@/lib/chain/client";
import { getContractAddresses } from "@/lib/chain/contracts";
import { REPUTATION_REGISTRY_ABI } from "@/lib/chain/contracts";
import type { ReputationFeedbackEntry, ReputationSummary } from "./reputation-schemas";

type FeedbackEntryWithoutTxHash = Omit<ReputationFeedbackEntry, "txHash">;

const FEEDBACK_GIVEN_EVENT = parseAbiItem(
  "event FeedbackGiven(uint256 indexed tokenId, address indexed evaluator, uint256 score, string contentHash)",
);

export async function getReputationHistory(
  agentId: string,
): Promise<ReadonlyArray<FeedbackEntryWithoutTxHash>> {
  try {
    const publicClient = getPublicClient();
    const { reputationRegistry } = getContractAddresses();

    const feedbackCount = await publicClient.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getFeedbackCount",
      args: [BigInt(agentId)],
    });

    const count = Number(feedbackCount);
    if (count === 0) return [];

    const entries: FeedbackEntryWithoutTxHash[] = [];
    const blockTimestampCache = new Map<number, number>();

    for (let i = 0; i < count; i++) {
      const result = await publicClient.readContract({
        address: reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "readFeedback",
        args: [BigInt(agentId), BigInt(i)],
      });

      const [evaluator, score, contentHash, timestamp] = result;

      const blockNumber = Number(timestamp);
      let blockTimestamp = blockTimestampCache.get(blockNumber);
      if (blockTimestamp === undefined) {
        try {
          const block = await publicClient.getBlock({
            blockNumber: BigInt(blockNumber),
          });
          blockTimestamp = Number(block.timestamp);
        } catch {
          blockTimestamp = 0;
        }
        blockTimestampCache.set(blockNumber, blockTimestamp);
      }

      entries.push({
        clientAddress: evaluator,
        value: Number(score) / 100,
        tag1: "grant-evaluation",
        tag2: "",
        feedbackURI: contentHash,
        feedbackHash: contentHash,
        blockNumber,
        timestamp: blockTimestamp,
      });
    }

    entries.sort((a, b) => b.blockNumber - a.blockNumber);
    return entries;
  } catch (error) {
    console.error("Failed to read reputation history:", error);
    return [];
  }
}

export async function getReputationSummary(
  agentId: string,
): Promise<ReputationSummary> {
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
      feedbackCount: Number(count),
      averageScore: Number(avgScore) / 100,
    };
  } catch (error) {
    console.error("Failed to read reputation summary:", error);
    return { feedbackCount: 0, averageScore: 0 };
  }
}

export async function getTxHashesForBlocks(
  agentId: string,
  blockNumbers: ReadonlyArray<number>,
): Promise<Map<number, string>> {
  const txHashMap = new Map<number, string>();
  const uniqueBlocks = [...new Set(blockNumbers)];

  const publicClient = getPublicClient();
  const { reputationRegistry } = getContractAddresses();

  for (const blockNum of uniqueBlocks) {
    try {
      const logs = await publicClient.getLogs({
        address: reputationRegistry,
        event: FEEDBACK_GIVEN_EVENT,
        args: { tokenId: BigInt(agentId) },
        fromBlock: BigInt(blockNum),
        toBlock: BigInt(blockNum),
      });

      if (logs.length > 0 && logs[0].transactionHash) {
        txHashMap.set(blockNum, logs[0].transactionHash);
      }
    } catch (error) {
      console.error(
        `Failed to get txHash for block ${blockNum}:`,
        error,
      );
    }
  }

  return txHashMap;
}
