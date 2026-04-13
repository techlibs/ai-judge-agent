import { type Hex, encodeFunctionData } from "viem";
import {
  publicClient,
  getDisputeRegistryAddress,
  getDeploymentBlock,
} from "./contracts";

const DISPUTE_REGISTRY_ABI = [
  {
    name: "openDispute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "proposalId", type: "bytes32" },
      { name: "evidenceCid", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "castVote",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "disputeId", type: "uint256" },
      { name: "voteUphold", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "resolveDispute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "disputeId", type: "uint256" },
      { name: "newScore", type: "uint16" },
    ],
    outputs: [],
  },
  {
    name: "getDispute",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "disputeId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "proposalId", type: "bytes32" },
          { name: "initiator", type: "address" },
          { name: "stakeAmount", type: "uint256" },
          { name: "evidenceCid", type: "string" },
          { name: "status", type: "uint8" },
          { name: "newScore", type: "uint16" },
          { name: "deadline", type: "uint48" },
          { name: "createdAt", type: "uint48" },
          { name: "upholdVotes", type: "uint32" },
          { name: "overturnVotes", type: "uint32" },
        ],
      },
    ],
  },
  {
    name: "DisputeOpened",
    type: "event",
    inputs: [
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "proposalId", type: "bytes32", indexed: true },
      { name: "initiator", type: "address", indexed: true },
      { name: "stakeAmount", type: "uint256", indexed: false },
      { name: "evidenceCid", type: "string", indexed: false },
      { name: "deadline", type: "uint48", indexed: false },
    ],
  },
  {
    name: "DisputeVoteCast",
    type: "event",
    inputs: [
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "validator", type: "address", indexed: true },
      { name: "voteUphold", type: "bool", indexed: false },
      { name: "stakeAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "DisputeResolved",
    type: "event",
    inputs: [
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "status", type: "uint8", indexed: false },
      { name: "newScore", type: "uint16", indexed: false },
    ],
  },
] as const;

export function prepareOpenDispute(
  proposalId: Hex,
  evidenceCid: string
): Hex {
  return encodeFunctionData({
    abi: DISPUTE_REGISTRY_ABI,
    functionName: "openDispute",
    args: [proposalId, evidenceCid],
  });
}

export function prepareCastVote(
  disputeId: bigint,
  voteUphold: boolean
): Hex {
  return encodeFunctionData({
    abi: DISPUTE_REGISTRY_ABI,
    functionName: "castVote",
    args: [disputeId, voteUphold],
  });
}

export function prepareResolveDispute(
  disputeId: bigint,
  newScore: number
): Hex {
  return encodeFunctionData({
    abi: DISPUTE_REGISTRY_ABI,
    functionName: "resolveDispute",
    args: [disputeId, newScore],
  });
}

export async function getDispute(disputeId: bigint) {
  return publicClient.readContract({
    address: getDisputeRegistryAddress(),
    abi: DISPUTE_REGISTRY_ABI,
    functionName: "getDispute",
    args: [disputeId],
  });
}

export async function getDisputeOpenedEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getDisputeRegistryAddress(),
    abi: DISPUTE_REGISTRY_ABI,
    eventName: "DisputeOpened",
    fromBlock: startBlock,
  });
}

export async function getDisputeVoteCastEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getDisputeRegistryAddress(),
    abi: DISPUTE_REGISTRY_ABI,
    eventName: "DisputeVoteCast",
    fromBlock: startBlock,
  });
}

export async function getDisputeResolvedEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getDisputeRegistryAddress(),
    abi: DISPUTE_REGISTRY_ABI,
    eventName: "DisputeResolved",
    fromBlock: startBlock,
  });
}

export { DISPUTE_REGISTRY_ABI };
