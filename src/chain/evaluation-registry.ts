import { type Hex, encodeFunctionData, keccak256, toHex, zeroHash } from "viem";
import {
  publicClient,
  getEvaluationRegistryAddress,
  getDeploymentBlock,
  getWalletClient,
} from "./contracts";

const EVALUATION_REGISTRY_ABI = [
  {
    name: "submitScore",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "bytes32" },
      { name: "fundingRoundId", type: "bytes32" },
      { name: "finalScore", type: "uint16" },
      { name: "reputationMultiplier", type: "uint16" },
      { name: "proposalContentCid", type: "string" },
      { name: "evaluationContentCid", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "getEvaluation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "proposalId", type: "bytes32" },
          { name: "fundingRoundId", type: "bytes32" },
          { name: "finalScore", type: "uint16" },
          { name: "reputationMultiplier", type: "uint16" },
          { name: "adjustedScore", type: "uint16" },
          { name: "timestamp", type: "uint48" },
          { name: "proposalContentCid", type: "string" },
          { name: "evaluationContentCid", type: "string" },
        ],
      },
    ],
  },
  {
    name: "EvaluationSubmitted",
    type: "event",
    inputs: [
      { name: "proposalId", type: "bytes32", indexed: true },
      { name: "fundingRoundId", type: "bytes32", indexed: true },
      { name: "finalScore", type: "uint16", indexed: false },
      { name: "adjustedScore", type: "uint16", indexed: false },
      { name: "proposalContentCid", type: "string", indexed: false },
      { name: "evaluationContentCid", type: "string", indexed: false },
    ],
  },
] as const;

const SCORE_PRECISION = 100;
const REPUTATION_BASE = 10000;

export function computeProposalId(
  platformSource: string,
  externalId: string
): Hex {
  return keccak256(toHex(`${platformSource}:${externalId}`));
}

export function scaleScoreToChain(score: number): number {
  return Math.round(score * SCORE_PRECISION);
}

export function scaleReputationToChain(multiplier: number): number {
  return Math.round(multiplier * REPUTATION_BASE);
}

export function prepareSubmitScore(params: {
  readonly proposalId: Hex;
  readonly fundingRoundId: Hex;
  readonly finalScore: number;
  readonly reputationMultiplier: number;
  readonly proposalContentCid: string;
  readonly evaluationContentCid: string;
}): Hex {
  return encodeFunctionData({
    abi: EVALUATION_REGISTRY_ABI,
    functionName: "submitScore",
    args: [
      params.proposalId,
      params.fundingRoundId,
      scaleScoreToChain(params.finalScore),
      scaleReputationToChain(params.reputationMultiplier),
      params.proposalContentCid,
      params.evaluationContentCid,
    ],
  });
}

export async function getEvaluation(proposalId: Hex) {
  return publicClient.readContract({
    address: getEvaluationRegistryAddress(),
    abi: EVALUATION_REGISTRY_ABI,
    functionName: "getEvaluation",
    args: [proposalId],
  });
}

export async function getEvaluationEvents(fromBlock?: bigint) {
  const startBlock = fromBlock ?? getDeploymentBlock();
  return publicClient.getContractEvents({
    address: getEvaluationRegistryAddress(),
    abi: EVALUATION_REGISTRY_ABI,
    eventName: "EvaluationSubmitted",
    fromBlock: startBlock,
  });
}

export async function submitEvaluationOnChain(args: {
  readonly proposalIdHex: Hex;
  readonly fundingRoundId?: Hex;
  /** Per-mille score (0–1000). Contract reverts above 1000. */
  readonly finalScoreMille: number;
  readonly reputationMultiplier?: number;
  readonly proposalContentCid: string;
  readonly evaluationContentCid: string;
}): Promise<{ txHash: Hex }> {
  const wallet = getWalletClient();
  const account = wallet.account;
  if (!account) throw new Error("wallet client has no account");
  const clampedScore = Math.max(0, Math.min(1000, Math.round(args.finalScoreMille)));
  const txHash = await wallet.writeContract({
    address: getEvaluationRegistryAddress(),
    abi: EVALUATION_REGISTRY_ABI,
    functionName: "submitScore",
    args: [
      args.proposalIdHex,
      args.fundingRoundId ?? zeroHash,
      clampedScore,
      scaleReputationToChain(args.reputationMultiplier ?? 1),
      args.proposalContentCid,
      args.evaluationContentCid,
    ],
    account,
    chain: null,
  });
  return { txHash };
}

export async function awaitEvaluationConfirmation(
  txHash: Hex,
  timeoutMs = 120_000,
): Promise<{ blockNumber: number }> {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: timeoutMs,
  });
  if (receipt.status !== "success") {
    throw new Error(`tx ${txHash} reverted`);
  }
  return { blockNumber: Number(receipt.blockNumber) };
}

export { EVALUATION_REGISTRY_ABI };
