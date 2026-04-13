import { type Hex, encodeFunctionData, keccak256, toHex } from "viem";
import {
  publicClient,
  getEvaluationRegistryAddress,
  getDeploymentBlock,
} from "./contracts";
import { pinJsonToIpfs } from "@/ipfs/pin";
import { EvaluationContentSchema } from "@/ipfs/schemas";
import type { EvaluationContent } from "@/ipfs/schemas";

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

interface SubmitEvaluationParams {
  readonly proposalId: Hex;
  readonly fundingRoundId: Hex;
  readonly finalScore: number;
  readonly reputationMultiplier: number;
  readonly proposalContentCid: string;
  readonly evaluationContent: EvaluationContent;
}

export async function prepareSubmitScore(
  params: SubmitEvaluationParams
): Promise<{ evaluationContentCid: string; encodedData: Hex }> {
  const evaluationContentCid = await pinJsonToIpfs(
    EvaluationContentSchema,
    params.evaluationContent
  );

  const encodedData = encodeFunctionData({
    abi: EVALUATION_REGISTRY_ABI,
    functionName: "submitScore",
    args: [
      params.proposalId,
      params.fundingRoundId,
      scaleScoreToChain(params.finalScore),
      scaleReputationToChain(params.reputationMultiplier),
      params.proposalContentCid,
      evaluationContentCid,
    ],
  });

  return { evaluationContentCid, encodedData };
}

export async function getEvaluation(proposalId: Hex) {
  const result = await publicClient.readContract({
    address: getEvaluationRegistryAddress(),
    abi: EVALUATION_REGISTRY_ABI,
    functionName: "getEvaluation",
    args: [proposalId],
  });

  return result;
}

export async function getEvaluationEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  const logs = await publicClient.getContractEvents({
    address: getEvaluationRegistryAddress(),
    abi: EVALUATION_REGISTRY_ABI,
    eventName: "EvaluationSubmitted",
    fromBlock: startBlock,
  });

  return logs;
}

export { EVALUATION_REGISTRY_ABI };
