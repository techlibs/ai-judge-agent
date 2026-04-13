import { type Hex, encodeFunctionData } from "viem";
import {
  publicClient,
  getIdentityRegistryAddress,
  getDeploymentBlock,
} from "./contracts";

const IDENTITY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "setAgentURI",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "getMetadata",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    name: "setMetadata",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
      { name: "metadataValue", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "getAgentURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "Registered",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
  {
    name: "URIUpdated",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "newURI", type: "string", indexed: false },
      { name: "updatedBy", type: "address", indexed: true },
    ],
  },
  {
    name: "MetadataSet",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "indexedMetadataKey", type: "string", indexed: true },
      { name: "metadataKey", type: "string", indexed: false },
      { name: "metadataValue", type: "bytes", indexed: false },
    ],
  },
] as const;

export function prepareRegisterAgent(agentURI: string): Hex {
  return encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentURI],
  });
}

export function prepareSetAgentURI(agentId: bigint, newURI: string): Hex {
  return encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "setAgentURI",
    args: [agentId, newURI],
  });
}

export function prepareSetMetadata(
  agentId: bigint,
  metadataKey: string,
  metadataValue: Hex
): Hex {
  return encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "setMetadata",
    args: [agentId, metadataKey, metadataValue],
  });
}

export async function getAgentURI(agentId: bigint): Promise<string> {
  return publicClient.readContract({
    address: getIdentityRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "getAgentURI",
    args: [agentId],
  });
}

export async function getMetadata(
  agentId: bigint,
  metadataKey: string
): Promise<Hex> {
  return publicClient.readContract({
    address: getIdentityRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "getMetadata",
    args: [agentId, metadataKey],
  });
}

export async function getAgentOwner(agentId: bigint) {
  return publicClient.readContract({
    address: getIdentityRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "ownerOf",
    args: [agentId],
  });
}

export async function getRegisteredEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getIdentityRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    eventName: "Registered",
    fromBlock: startBlock,
  });
}

export async function getURIUpdatedEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getIdentityRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    eventName: "URIUpdated",
    fromBlock: startBlock,
  });
}

export async function getMetadataSetEvents(fromBlock?: bigint) {
  const deploymentBlock = getDeploymentBlock();
  const startBlock = fromBlock ?? deploymentBlock;

  return publicClient.getContractEvents({
    address: getIdentityRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    eventName: "MetadataSet",
    fromBlock: startBlock,
  });
}

export { IDENTITY_REGISTRY_ABI };
