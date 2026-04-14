import { z } from "zod";
import { OnchainScoreSchema } from "./scores.js";

export const ConsensusStatusSchema = z.enum([
  "Pending",
  "Agreed",
  "Disagreed",
  "Reconciled",
]);
export type ConsensusStatus = z.infer<typeof ConsensusStatusSchema>;

export const ConsensusRecordSchema = z.object({
  proposalId: z.string(),
  status: ConsensusStatusSchema,
  finalScore: OnchainScoreSchema,
  spreadBps: z.number().int().min(0).describe("Max score difference in basis points"),
  resolvedAt: z.number().int().positive(),
  judgeCount: z.number().int().min(1),
  revealedCount: z.number().int().min(0),
});
export type ConsensusRecord = z.infer<typeof ConsensusRecordSchema>;

/** Default consensus threshold: 15% (150 basis points) */
export const DEFAULT_CONSENSUS_THRESHOLD_BPS = 150;

/** Default required judge count for core evaluation */
export const DEFAULT_REQUIRED_JUDGE_COUNT = 3;

/** Reveal phase timeout in seconds (24 hours) */
export const REVEAL_TIMEOUT_SECONDS = 86400;
