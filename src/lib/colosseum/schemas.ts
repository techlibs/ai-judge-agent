import { z } from "zod";

export const similarProjectSchema = z.object({
  name: z.string(),
  hackathon: z.string().optional(),
  status: z.enum(["active", "inactive", "unknown"]),
  techStack: z.array(z.string()).optional(),
  description: z.string(),
  relevance: z.enum(["direct_competitor", "adjacent", "inspiration"]),
});

export const gapClassificationSchema = z.object({
  type: z.enum(["full", "partial", "false"]),
  rationale: z.string(),
  uncoveredSegment: z.string().optional(),
  existingCoverage: z.string().optional(),
});

export const colosseumResearchResponseSchema = z.object({
  similarProjects: z.array(similarProjectSchema),
  gapClassification: gapClassificationSchema,
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(["emerging", "growing", "mature"]),
  estimatedTAM: z.string().nullable(),
  keyInsights: z.array(z.string()),
  risks: z.array(z.string()).optional(),
  archiveSources: z.array(z.string()).optional(),
});

export const marketValidationReportSchema = z.object({
  gapClassification: z.enum(["full", "partial", "false"]),
  gapRationale: z.string(),
  similarProjects: z.array(
    z.object({
      name: z.string(),
      hackathon: z.string(),
      status: z.enum(["active", "inactive", "unknown"]),
      relevance: z.enum(["direct_competitor", "adjacent", "inspiration"]),
      description: z.string(),
    }),
  ),
  estimatedTAM: z.string().nullable(),
  marketMaturity: z.enum(["emerging", "growing", "mature"]),
  competitorCount: z.number().int().nonnegative(),
  researchConfidence: z.enum(["high", "medium", "low"]),
  dataSourcesUsed: z.array(z.string()),
  researchedAt: z.string(),
  colosseumApiVersion: z.string(),
  ipfsCid: z.string(),
});
