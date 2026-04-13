import { z } from "zod";

export const RECOMMENDATIONS = [
  "strong_approve",
  "approve",
  "needs_revision",
  "reject",
] as const;

export const evaluationOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  justification: z.string().min(1),
  recommendation: z.enum(RECOMMENDATIONS),
  keyFindings: z.array(z.string()).min(1).max(3),
});

export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>;

export const DIMENSIONS = ["technical", "impact", "cost", "team"] as const;
export type EvaluationDimension = (typeof DIMENSIONS)[number];

export const dimensionEvaluationSchema = z.object({
  dimension: z.enum(DIMENSIONS),
  output: evaluationOutputSchema,
  audit: z.object({
    promptSent: z.string(),
    modelUsed: z.string(),
    rawResponse: z.string(),
    evaluatedAt: z.number(),
  }),
});

export type DimensionEvaluation = z.infer<typeof dimensionEvaluationSchema>;

export const proposalEvaluationSchema = z.object({
  proposalId: z.string(),
  dimensions: z.array(dimensionEvaluationSchema).min(1).max(4),
  aggregate: z.object({
    weightedScore: z.number().min(0).max(100),
    completedDimensions: z.number().int().min(1).max(4),
    computedAt: z.number(),
  }),
  status: z.enum(["evaluating", "evaluated", "failed"]),
});

export type ProposalEvaluation = z.infer<typeof proposalEvaluationSchema>;
