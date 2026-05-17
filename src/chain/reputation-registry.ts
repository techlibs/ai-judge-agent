import { type Hex, encodeFunctionData } from "viem";
import {
  publicClient,
  getReputationRegistryAddress,
  getDeploymentBlock,
} from "./contracts";

const REPUTATION_REGISTRY_ABI = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "revokeFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "feedbackIndex", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "totalFeedback", type: "uint256" },
          { name: "activeFeedback", type: "uint256" },
          { name: "averageValueBps", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "readAllFeedback",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "clientAddress", type: "address" },
          { name: "value", type: "uint256" },
          { name: "tag1", type: "string" },
          { name: "tag2", type: "string" },
          { name: "feedbackURI", type: "string" },
          { name: "feedbackHash", type: "bytes32" },
          { name: "exists", type: "bool" },
          { name: "isRevoked", type: "bool" },
          { name: "timestamp", type: "uint48" },
        ],
      },
    ],
  },
  {
    name: "NewFeedback",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "clientAddress", type: "address", indexed: true },
      { name: "feedbackIndex", type: "uint256", indexed: false },
      { name: "value", type: "uint256", indexed: false },
      { name: "tag1", type: "string", indexed: false },
      { name: "tag2", type: "string", indexed: false },
      { name: "feedbackURI", type: "string", indexed: false },
      { name: "feedbackHash", type: "bytes32", indexed: false },
    ],
  },
  {
    name: "FeedbackRevoked",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "feedbackIndex", type: "uint256", indexed: false },
    ],
  },
] as const;

export function prepareGiveFeedback(
  agentId: bigint,
  value: bigint,
  tag1: string,
  tag2: string,
  feedbackURI: string,
  feedbackHash: Hex
): Hex {
  return encodeFunctionData({
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [agentId, value, tag1, tag2, feedbackURI, feedbackHash],
  });
}

export function prepareRevokeFeedback(
  agentId: bigint,
  feedbackIndex: bigint
): Hex {
  return encodeFunctionData({
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "revokeFeedback",
    args: [agentId, feedbackIndex],
  });
}

export async function getReputationSummary(agentId: bigint) {
  return publicClient.readContract({
    address: getReputationRegistryAddress(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [agentId],
  });
}

export async function readAllFeedback(
  agentId: bigint,
  offset: bigint,
  limit: bigint
) {
  return publicClient.readContract({
    address: getReputationRegistryAddress(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "readAllFeedback",
    args: [agentId, offset, limit],
  });
}

export async function getNewFeedbackEvents(fromBlock?: bigint) {
  const startBlock = fromBlock ?? getDeploymentBlock();
  return publicClient.getContractEvents({
    address: getReputationRegistryAddress(),
    abi: REPUTATION_REGISTRY_ABI,
    eventName: "NewFeedback",
    fromBlock: startBlock,
  });
}

export { REPUTATION_REGISTRY_ABI };
