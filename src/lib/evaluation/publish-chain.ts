import { keccak256, toBytes } from "viem";
import { getPublicClient, getWalletClient } from "@/lib/chain/config";
import {
  REPUTATION_REGISTRY_ABI,
  IDENTITY_REGISTRY_ABI,
  getContractAddresses,
} from "@/lib/chain/contracts";
import { ipfsUri } from "@/lib/ipfs/client";
import type { JudgeDimension } from "@/lib/constants";

interface PublishParams {
  proposalId: string;
  proposalIpfsCid: string;
  evaluations: Array<{
    dimension: JudgeDimension;
    score: number;
    ipfsCid: string;
  }>;
  aggregateIpfsCid: string;
}

interface PublishResult {
  registerTxHash: string;
  agentId: bigint;
  feedbackTxHashes: Record<string, string>;
  aggregateFeedbackTxHash: string;
}

const CHAIN_TX_TIMEOUT_MS = 60_000;

function isZeroAddress(address: string): boolean {
  return address === "0x0000000000000000000000000000000000000000";
}

export async function publishEvaluationOnChain(
  params: PublishParams
): Promise<string> {
  const result = await publishEvaluationOnChainDetailed(params);
  return result.aggregateFeedbackTxHash;
}

export async function publishEvaluationOnChainDetailed(
  params: PublishParams
): Promise<PublishResult> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();
  const addresses = getContractAddresses();

  // Guard: verify contract addresses are configured
  if (isZeroAddress(addresses.identityRegistry)) {
    throw new Error(
      "IDENTITY_REGISTRY_ADDRESS is not configured. Deploy the IdentityRegistry contract and set the environment variable."
    );
  }
  if (isZeroAddress(addresses.reputationRegistry)) {
    throw new Error(
      "REPUTATION_REGISTRY_ADDRESS is not configured. Deploy the ReputationRegistry contract and set the environment variable."
    );
  }

  // 1. Register project identity (CHAIN-01)
  const registerHash = await walletClient.writeContract({
    address: addresses.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [ipfsUri(params.proposalIpfsCid)],
  });

  const registerReceipt = await publicClient.waitForTransactionReceipt({
    hash: registerHash,
    timeout: CHAIN_TX_TIMEOUT_MS,
  });

  if (registerReceipt.status === "reverted") {
    throw new Error(`Identity registration transaction reverted: ${registerHash}`);
  }

  // Extract agentId from Registered event
  const registeredLog = registerReceipt.logs[0];
  const agentId = BigInt(registeredLog?.topics[1] ?? "0");

  // 2. Publish 4x giveFeedback — one per judge dimension (CHAIN-02)
  const feedbackTxHashes: Record<string, string> = {};

  for (const evaluation of params.evaluations) {
    const feedbackContent = JSON.stringify({
      dimension: evaluation.dimension,
      score: evaluation.score,
      ipfsCid: evaluation.ipfsCid,
    });
    const contentHash = keccak256(toBytes(feedbackContent));

    const txHash = await walletClient.writeContract({
      address: addresses.reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "giveFeedback",
      args: [
        agentId,
        BigInt(evaluation.score),
        2,
        evaluation.dimension,
        "judge-v1",
        "",
        ipfsUri(evaluation.ipfsCid),
        contentHash,
      ],
    });

    feedbackTxHashes[evaluation.dimension] = txHash;
  }

  // Wait for all feedback txs and verify receipts
  for (const [dimension, hash] of Object.entries(feedbackTxHashes)) {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      timeout: CHAIN_TX_TIMEOUT_MS,
    });
    if (receipt.status === "reverted") {
      throw new Error(`Feedback transaction for ${dimension} reverted: ${hash}`);
    }
  }

  // 3. Publish aggregate score as milestone marker (CHAIN-03)
  const aggregateContent = JSON.stringify({
    proposalId: params.proposalId,
    aggregateIpfsCid: params.aggregateIpfsCid,
    milestone: "evaluation-complete",
  });
  const aggregateHash = keccak256(toBytes(aggregateContent));

  const aggregateTxHash = await walletClient.writeContract({
    address: addresses.reputationRegistry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [
      agentId,
      BigInt(0), // aggregate tracked separately
      2,
      "aggregate",
      "milestone-v1",
      "",
      ipfsUri(params.aggregateIpfsCid),
      aggregateHash,
    ],
  });

  const aggregateReceipt = await publicClient.waitForTransactionReceipt({
    hash: aggregateTxHash,
    timeout: CHAIN_TX_TIMEOUT_MS,
  });
  if (aggregateReceipt.status === "reverted") {
    throw new Error(`Aggregate milestone transaction reverted: ${aggregateTxHash}`);
  }

  return {
    registerTxHash: registerHash,
    agentId,
    feedbackTxHashes,
    aggregateFeedbackTxHash: aggregateTxHash,
  };
}
