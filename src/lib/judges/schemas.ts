import { z } from "zod";

export const IpeAlignmentSchema = z.object({
  proTechnology: z.number().min(0).max(100),
  proFreedom: z.number().min(0).max(100),
  proHumanProgress: z.number().min(0).max(100),
});

export const JudgeEvaluationSchema = z.object({
  score: z.number().min(0).max(10000),
  confidence: z.enum(["high", "medium", "low"]),
  recommendation: z.enum(["strong_fund", "fund", "conditional", "reject"]),
  justification: z.string().max(2000),
  keyFindings: z.array(z.string()).max(3),
  risks: z.array(z.string()).max(3),
  ipeAlignment: IpeAlignmentSchema,
});

export type JudgeEvaluation = z.infer<typeof JudgeEvaluationSchema>;
export type IpeAlignment = z.infer<typeof IpeAlignmentSchema>;

export const MarketValidationSchema = z.object({
  gapType: z.enum(["full", "partial", "false"]),
  competitorCount: z.number().int().nonnegative(),
  similarProjectsFound: z.number().int().nonnegative(),
  marketCoherenceScore: z.number().int().min(0).max(10000),
  researchConfidence: z.enum(["high", "medium", "low"]),
  coherenceFlags: z.array(
    z.object({
      dimension: z.string(),
      issue: z.string(),
      severity: z.enum(["critical", "warning", "info"]),
    })
  ),
  recommendsReview: z.boolean(),
});

export type MarketValidation = z.infer<typeof MarketValidationSchema>;
