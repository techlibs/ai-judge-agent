import { z } from "zod";

export const similarProjectSchema = z.object({
  name: z.string().max(200),
  hackathon: z.string().max(100).optional(),
  status: z.enum(["active", "inactive", "unknown"]),
  techStack: z.array(z.string().max(50)).max(10).optional(),
  description: z.string().max(1000),
  relevance: z.enum(["direct_competitor", "adjacent", "inspiration"]),
});

export type SimilarProject = z.infer<typeof similarProjectSchema>;

export const gapClassificationSchema = z.object({
  type: z.enum(["full", "partial", "false"]),
  rationale: z.string().max(2000),
  existingCoverage: z.string().max(1000).optional(),
  uncoveredSegment: z.string().max(1000).optional(),
});

export type GapClassification = z.infer<typeof gapClassificationSchema>;

export const colosseumResponseSchema = z.object({
  similarProjects: z.array(similarProjectSchema).max(20),
  gapClassification: gapClassificationSchema,
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(["emerging", "growing", "mature"]),
  estimatedTAM: z.string().max(200).nullable(),
  keyInsights: z.array(z.string().max(500)).max(10),
  risks: z.array(z.string().max(500)).max(10).optional(),
});

export type ColosseumResponse = z.infer<typeof colosseumResponseSchema>;

export const marketContextSchema = z.object({
  technical: z.object({
    similarBuilds: z.array(
      z.object({
        name: z.string(),
        techStack: z.array(z.string()),
        outcome: z.string(),
      })
    ),
    noveltyAssessment: z.string(),
  }),
  impact: z.object({
    gapType: z.enum(["full", "partial", "false"]),
    gapRationale: z.string(),
    tam: z.string().nullable(),
    marketMaturity: z.string(),
  }),
  cost: z.object({
    competitorPricing: z.array(z.string()),
    benchmarks: z.string(),
  }),
  team: z.object({
    idealBackground: z.string(),
    successPatterns: z.array(z.string()),
  }),
  confidence: z.enum(["high", "medium", "low"]),
});

export type MarketContext = z.infer<typeof marketContextSchema>;

export const coherenceReportSchema = z.object({
  coherenceScore: z.number().int().min(0).max(10000),
  flags: z.array(
    z.object({
      dimension: z.string(),
      issue: z.string(),
      severity: z.enum(["critical", "warning", "info"]),
      marketEvidence: z.string(),
      judgeScore: z.number(),
    })
  ),
  overallAssessment: z.string().max(500),
  recommendsReview: z.boolean(),
});

export type CoherenceReport = z.infer<typeof coherenceReportSchema>;

export const marketValidationSchema = z.object({
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

export type MarketValidation = z.infer<typeof marketValidationSchema>;
