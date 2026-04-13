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
