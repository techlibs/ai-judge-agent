import { z } from "zod";
import { isAddress, type Address } from "viem";
import { getClientEnv } from "@/lib/env";

export const IDENTITY_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "owner", type: "address" },
      { name: "agentURI", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMetadata",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "agentURI", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ProjectRegistered",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
    ],
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "giveFeedback",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "contentHash", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getSummary",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "feedbackCount", type: "uint256" },
      { name: "averageScore", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "readFeedback",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      { name: "evaluator", type: "address" },
      { name: "score", type: "uint256" },
      { name: "contentHash", type: "string" },
      { name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getFeedbackCount",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "FeedbackGiven",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "evaluator", type: "address", indexed: true },
      { name: "score", type: "uint256", indexed: false },
      { name: "contentHash", type: "string", indexed: false },
    ],
  },
] as const;

const addressSchema = z
  .string()
  .refine((val): val is Address => isAddress(val), {
    message: "Invalid Ethereum address",
  });

export function getContractAddresses(): {
  identityRegistry: Address;
  reputationRegistry: Address;
} {
  const env = getClientEnv();

  if (!env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS) {
    throw new Error(
      "Missing NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS env var",
    );
  }
  if (!env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS) {
    throw new Error(
      "Missing NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS env var",
    );
  }

  const identity = addressSchema.parse(
    env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS,
  );
  const reputation = addressSchema.parse(
    env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS,
  );
  return {
    identityRegistry: identity,
    reputationRegistry: reputation,
  };
}
