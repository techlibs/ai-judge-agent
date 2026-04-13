import { type Hex, encodeFunctionData } from "viem";
import {
  publicClient,
  getValidationRegistryAddress,
  getDeploymentBlock,
} from "./contracts";

const VALIDATION_REGISTRY_ABI = [
  {
    name: "validationRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "requestURI", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "validationResponse",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256" },
      { name: "score", type: "uint8" },
      { name: "responseURI", type: "string" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
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
          { name: "totalRequests", type: "uint256" },
          { name: "respondedRequests", type: "uint256" },
          { name: "averageScoreBps", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "ValidationRequested",
    type: "event",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "requestURI", type: "string", indexed: false },
    ],
  },
  {
    name: "ValidationResponded",
    type: "event",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "validator", type: "address", indexed: true },
      { name: "score", type: "uint8", indexed: false },
      { name: "responseURI", type: "string", indexed: false },
      { name: "responseHash", type: "bytes32", indexed: false },
      { name: "tag", type: "string", indexed: false },
    ],
  },
] as const;

export function prepareValidationRequest(
  agentId: bigint,
  requestURI: string
): Hex {
  return encodeFunctionData({
    abi: VALIDATION_REGISTRY_ABI,
    functionName: "validationRequest",
    args: [agentId, requestURI],
  });
}

export function prepareValidationResponse(
  requestId: bigint,
  score: number,
  responseURI: string,
  responseHash: Hex,
  tag: string
): Hex {
  return encodeFunctionData({
    abi: VALIDATION_REGISTRY_ABI,
    functionName: "validationResponse",
    args: [requestId, score, responseURI, responseHash, tag],
  });
}

export async function getValidationSummary(agentId: bigint) {
  return publicClient.readContract({
    address: getValidationRegistryAddress(),
    abi: VALIDATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [agentId],
  });
}

export async function getValidationRequestedEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getValidationRegistryAddress(),
    abi: VALIDATION_REGISTRY_ABI,
    eventName: "ValidationRequested",
    fromBlock: startBlock,
  });
}

export async function getValidationRespondedEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getValidationRegistryAddress(),
    abi: VALIDATION_REGISTRY_ABI,
    eventName: "ValidationResponded",
    fromBlock: startBlock,
  });
}

export { VALIDATION_REGISTRY_ABI };
