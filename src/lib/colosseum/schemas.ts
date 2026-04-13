import { z } from "zod";

// --- Colosseum API Request ---

const COLOSSEUM_QUERY_MIN_LENGTH = 10;
const COLOSSEUM_QUERY_MAX_LENGTH = 2000;
const COLOSSEUM_DOMAIN_MIN_LENGTH = 2;
const COLOSSEUM_DOMAIN_MAX_LENGTH = 100;

export const ColosseumQuerySchema = z.object({
  query: z
    .string()
    .min(COLOSSEUM_QUERY_MIN_LENGTH)
    .max(COLOSSEUM_QUERY_MAX_LENGTH),
  domain: z
    .string()
    .min(COLOSSEUM_DOMAIN_MIN_LENGTH)
    .max(COLOSSEUM_DOMAIN_MAX_LENGTH),
  mode: z.enum(["conversational", "deep_dive"]),
});

export type ColosseumQuery = z.infer<typeof ColosseumQuerySchema>;

// --- Colosseum API Response ---

const ProjectStatusValues = ["active", "inactive", "unknown"] as const;
const GapTypeValues = ["full", "partial", "false"] as const;
const MarketMaturityValues = ["emerging", "growing", "mature"] as const;

export const ColosseumSimilarProjectSchema = z.object({
  name: z.string(),
  hackathon: z.string().optional(),
  year: z.number().optional(),
  status: z.enum(ProjectStatusValues),
  techStack: z.array(z.string()),
  description: z.string(),
  accelerator: z.string().optional(),
});

export type ColosseumSimilarProject = z.infer<
  typeof ColosseumSimilarProjectSchema
>;

export const ColosseumGapClassificationSchema = z.object({
  type: z.enum(GapTypeValues),
  rationale: z.string(),
  existingCoverage: z.string().optional(),
  uncoveredSegment: z.string().optional(),
});

export type ColosseumGapClassification = z.infer<
  typeof ColosseumGapClassificationSchema
>;

export const ColosseumArchiveInsightSchema = z.object({
  source: z.string(),
  insight: z.string(),
  relevance: z.string(),
});

export type ColosseumArchiveInsight = z.infer<
  typeof ColosseumArchiveInsightSchema
>;

export const ColosseumResponseSchema = z.object({
  similarProjects: z.array(ColosseumSimilarProjectSchema),
  gapClassification: ColosseumGapClassificationSchema,
  archiveInsights: z.array(ColosseumArchiveInsightSchema),
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(MarketMaturityValues),
  estimatedTAM: z.string().nullable(),
  keyInsights: z.array(z.string()),
  risks: z.array(z.string()),
  furtherReading: z.array(z.string()).optional(),
});

export type ColosseumResponse = z.infer<typeof ColosseumResponseSchema>;

// --- Market Context (synthesized for judge prompts) ---

const RelevanceValues = [
  "direct_competitor",
  "adjacent",
  "inspiration",
] as const;

export const MarketContextSimilarProjectSchema = z.object({
  name: z.string(),
  hackathon: z.string().optional(),
  status: z.enum(ProjectStatusValues),
  description: z.string(),
  relevance: z.enum(RelevanceValues),
});

export type MarketContextSimilarProject = z.infer<
  typeof MarketContextSimilarProjectSchema
>;

export const MarketContextSchema = z.object({
  gapClassification: z.object({
    type: z.enum(GapTypeValues),
    rationale: z.string(),
    uncoveredSegment: z.string().optional(),
  }),
  similarProjects: z.array(MarketContextSimilarProjectSchema),
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(MarketMaturityValues),
  estimatedTAM: z.string().nullable(),
  keyInsights: z.array(z.string()),
});

export type MarketContext = z.infer<typeof MarketContextSchema>;

// --- IPFS Document ---

export const MarketResearchDocumentSchema = z.object({
  version: z.literal("1.0.0"),
  proposalId: z.string(),
  researchedAt: z.string(),
  source: z.literal("colosseum-copilot"),
  apiVersion: z.string(),
  gapClassification: ColosseumGapClassificationSchema,
  similarProjects: z.array(ColosseumSimilarProjectSchema),
  competitorCount: z.number().int().nonnegative(),
  marketMaturity: z.enum(MarketMaturityValues),
  keyInsights: z.array(z.string()),
  proposalContentHash: z.string(),
});

export type MarketResearchDocument = z.infer<
  typeof MarketResearchDocumentSchema
>;

// --- Health Check ---

const HealthStatusValues = ["healthy", "degraded", "unavailable"] as const;

export const ColosseumHealthSchema = z.object({
  status: z.enum(HealthStatusValues),
  tokenValid: z.boolean(),
  tokenExpiresAt: z.string().nullable(),
  lastSuccessfulCall: z.string().nullable(),
  apiVersion: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

export type ColosseumHealth = z.infer<typeof ColosseumHealthSchema>;
