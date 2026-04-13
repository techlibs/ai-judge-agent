import { type Hex, encodeFunctionData } from "viem";
import {
  publicClient,
  getMilestoneManagerAddress,
  getDeploymentBlock,
} from "./contracts";

const MILESTONE_MANAGER_ABI = [
  {
    name: "releaseMilestone",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "bytes32" },
      { name: "milestoneIndex", type: "uint8" },
      { name: "score", type: "uint16" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "getMilestone",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "bytes32" },
      { name: "milestoneIndex", type: "uint8" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "score", type: "uint16" },
          { name: "releasePercentage", type: "uint16" },
          { name: "released", type: "bool" },
          { name: "totalAmount", type: "uint256" },
          { name: "releasedAmount", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "FundReleased",
    type: "event",
    inputs: [
      { name: "projectId", type: "bytes32", indexed: true },
      { name: "milestoneIndex", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "releasePercentage", type: "uint16", indexed: false },
    ],
  },
  {
    name: "FundsForwarded",
    type: "event",
    inputs: [
      { name: "projectId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "matchingPool", type: "address", indexed: false },
    ],
  },
  {
    name: "BonusDistributed",
    type: "event",
    inputs: [
      { name: "projectId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "score", type: "uint16", indexed: false },
    ],
  },
] as const;

export function prepareReleaseMilestone(
  projectId: Hex,
  milestoneIndex: number,
  score: number,
  recipient: Hex
): Hex {
  return encodeFunctionData({
    abi: MILESTONE_MANAGER_ABI,
    functionName: "releaseMilestone",
    args: [projectId, milestoneIndex, score, recipient],
  });
}

export async function getMilestone(projectId: Hex, milestoneIndex: number) {
  return publicClient.readContract({
    address: getMilestoneManagerAddress(),
    abi: MILESTONE_MANAGER_ABI,
    functionName: "getMilestone",
    args: [projectId, milestoneIndex],
  });
}

export async function getFundReleasedEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getMilestoneManagerAddress(),
    abi: MILESTONE_MANAGER_ABI,
    eventName: "FundReleased",
    fromBlock: startBlock,
  });
}

export async function getFundsForwardedEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getMilestoneManagerAddress(),
    abi: MILESTONE_MANAGER_ABI,
    eventName: "FundsForwarded",
    fromBlock: startBlock,
  });
}

export { MILESTONE_MANAGER_ABI };
