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

export async function publishEvaluationOnChain(
  params: PublishParams
): Promise<string> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();
  const addresses = getContractAddresses();

  // 1. Register project identity
  const registerHash = await walletClient.writeContract({
    address: addresses.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [ipfsUri(params.proposalIpfsCid)],
  });

  const registerReceipt = await publicClient.waitForTransactionReceipt({
    hash: registerHash,
  });

  // Extract agentId from Registered event
  const registeredLog = registerReceipt.logs[0];
  const agentId = BigInt(registeredLog?.topics[1] ?? "0");

  // 2. Publish 4x giveFeedback (one per judge dimension)
  const feedbackHashes: string[] = [];

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

    feedbackHashes.push(txHash);
  }

  // Wait for all feedback txs
  for (const hash of feedbackHashes) {
    await publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
    });
  }

  return feedbackHashes[feedbackHashes.length - 1] ?? registerHash;
}
