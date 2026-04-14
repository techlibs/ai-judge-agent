import { z } from "zod";

/** Agent outputs 1-10 (float), on-chain stores 0-1000 (uint16 basis points) */
export const SCORE_MIN = 1;
export const SCORE_MAX = 10;
export const ONCHAIN_SCORE_MAX = 1000;

export const TierSchema = z.enum(["S", "A", "B", "C", "F"]);
export type Tier = z.infer<typeof TierSchema>;

export const TIER_RANGES: Record<Tier, { min: number; max: number }> = {
  S: { min: 9, max: 10 },
  A: { min: 7, max: 8 },
  B: { min: 5, max: 6 },
  C: { min: 3, max: 4 },
  F: { min: 1, max: 2 },
};

/** Convert agent score (1-10) to on-chain basis points (0-1000) */
export function toOnchainScore(agentScore: number): number {
  return Math.round(agentScore * 100);
}

/** Convert on-chain basis points (0-1000) to agent score (1-10) */
export function fromOnchainScore(onchainScore: number): number {
  return onchainScore / 100;
}

/** Validate that a score falls within its declared tier */
export function isScoreInTier(score: number, tier: Tier): boolean {
  const range = TIER_RANGES[tier];
  return score >= range.min && score <= range.max;
}

export const AgentScoreSchema = z
  .number()
  .min(SCORE_MIN)
  .max(SCORE_MAX)
  .describe("Agent evaluation score (1-10)");

export const OnchainScoreSchema = z
  .number()
  .int()
  .min(0)
  .max(ONCHAIN_SCORE_MAX)
  .describe("On-chain score in basis points (0-1000)");
