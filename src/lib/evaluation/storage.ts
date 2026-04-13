import type { ProposalEvaluation } from "./schemas";
import { getServerEnv } from "@/lib/env";
import { getWalletClient, getPublicClient } from "@/lib/chain/client";
import { REPUTATION_REGISTRY_ABI } from "@/lib/chain/contracts";
import { getClientEnv } from "@/lib/env";
import { isAddress, keccak256, toHex, type Address } from "viem";
import { z } from "zod";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

const pinataResponseSchema = z.object({
  IpfsHash: z.string(),
});

export async function pinEvaluationToIPFS(
  evaluation: ProposalEvaluation,
): Promise<string> {
  const env = getServerEnv();
  if (!env.PINATA_JWT) {
    console.warn(
      "Pinata JWT not configured — skipping IPFS pinning",
    );
    return "ipfs-disabled";
  }

  const response = await fetch(PINATA_PIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: evaluation,
      pinataMetadata: { name: `evaluation-${evaluation.proposalId}` },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata pin failed (${response.status}): ${text}`);
  }

  const json: unknown = await response.json();
  const result = pinataResponseSchema.parse(json);
  return result.IpfsHash;
}

const addressSchema = z
  .string()
  .refine((val): val is Address => isAddress(val), {
    message: "Invalid Ethereum address",
  });

export async function publishScoreOnChain(
  proposalId: string,
  score: number,
  ipfsCid: string,
): Promise<string> {
  const clientEnv = getClientEnv();
  const reputationAddress = clientEnv.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS;

  if (!reputationAddress) {
    console.warn(
      "ReputationRegistry address not configured — skipping on-chain publish",
    );
    return "chain-disabled";
  }

  let serverEnv;
  try {
    serverEnv = getServerEnv();
  } catch {
    console.warn("Server env not available — skipping on-chain publish");
    return "chain-disabled";
  }

  if (!serverEnv.DEPLOYER_PRIVATE_KEY || !serverEnv.RPC_URL) {
    console.warn(
      "Chain credentials not configured — skipping on-chain publish",
    );
    return "chain-disabled";
  }

  const validAddress = addressSchema.parse(reputationAddress);
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const numericValue = Number(proposalId);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error(`Invalid proposalId for BigInt conversion: ${proposalId}`);
  }
  const tokenId = BigInt(proposalId);
  const scoreRounded = BigInt(Math.round(score));
  const contentHash = `ipfs://${ipfsCid}`;

  const { request } = await publicClient.simulateContract({
    address: validAddress,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [tokenId, scoreRounded, contentHash],
    account: walletClient.account,
  });

  const txHash = await walletClient.writeContract(request);
  return txHash;
}
