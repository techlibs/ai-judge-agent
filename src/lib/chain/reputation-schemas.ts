import { z } from "zod";

export const reputationFeedbackEntrySchema = z.object({
  clientAddress: z.string(),
  value: z.number(),
  tag1: z.string(),
  tag2: z.string(),
  feedbackURI: z.string(),
  feedbackHash: z.string(),
  blockNumber: z.number().int().nonnegative(),
  timestamp: z.number().int().nonnegative(),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .nullable(),
});

export const reputationSummarySchema = z.object({
  feedbackCount: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(10000),
});

export const reputationResponseSchema = z.object({
  tokenId: z.string(),
  summary: reputationSummarySchema,
  history: z.array(reputationFeedbackEntrySchema),
});

export type ReputationFeedbackEntry = z.infer<
  typeof reputationFeedbackEntrySchema
>;
export type ReputationSummary = z.infer<typeof reputationSummarySchema>;
export type ReputationResponse = z.infer<typeof reputationResponseSchema>;
