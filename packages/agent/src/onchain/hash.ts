import { keccak256, encodePacked, toHex, concat, pad, toBytes, numberToHex } from "viem";
import { toOnchainScore } from "@ipe-city/common";

/**
 * Compute the commit hash for a judge evaluation (must match Solidity's keccak256).
 * Uses manual concatenation to avoid viem encodePacked array limitations.
 */
export function computeCommitHash(params: {
  judgeId: bigint;
  proposalId: `0x${string}`;
  criterionIds: `0x${string}`[];
  scores: number[];
  overallScore: number;
  reasoning: string;
  salt: `0x${string}`;
}): `0x${string}` {
  const onchainScores = params.scores.map((s) => toOnchainScore(s));
  const onchainOverall = toOnchainScore(params.overallScore);

  // Build packed encoding manually to match Solidity's abi.encodePacked
  const parts: `0x${string}`[] = [
    pad(numberToHex(params.judgeId), { size: 32 }), // uint256
    params.proposalId, // bytes32
    ...params.criterionIds, // bytes32[]
    ...onchainScores.map((s) => pad(numberToHex(s), { size: 2 })), // uint16[]
    pad(numberToHex(onchainOverall), { size: 2 }), // uint16
    toHex(toBytes(params.reasoning)), // bytes
    params.salt, // bytes32
  ];

  return keccak256(concat(parts));
}

/**
 * Generate a deterministic proposal ID matching the Solidity implementation.
 */
export function computeProposalId(
  submitter: `0x${string}`,
  title: string,
  timestamp: bigint,
): `0x${string}` {
  return keccak256(
    encodePacked(["address", "string", "uint256"], [submitter, title, timestamp]),
  );
}

/**
 * Generate a random salt for commit-reveal.
 */
export function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

/**
 * Compute criterion ID matching Solidity: keccak256(abi.encodePacked(name))
 */
export function computeCriterionId(name: string): `0x${string}` {
  return keccak256(encodePacked(["string"], [name]));
}
