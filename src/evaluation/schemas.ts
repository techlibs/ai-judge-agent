import { z } from "zod";

export const SCORING_DIMENSIONS = [
  "technical_feasibility",
  "impact_potential",
  "cost_efficiency",
  "team_capability",
] as const;

export type ScoringDimension = (typeof SCORING_DIMENSIONS)[number];

export const DIMENSION_WEIGHTS: Record<ScoringDimension, number> = {
  technical_feasibility: 0.25,
  impact_potential: 0.3,
  cost_efficiency: 0.2,
  team_capability: 0.25,
} as const;

export const DimensionScoreSchema = z.object({
  dimension: z.enum(SCORING_DIMENSIONS),
  score: z
    .number()
    .min(0)
    .max(10)
    .describe("Dimension score from 0 to 10"),
  inputDataConsidered: z
    .array(z.string())
    .min(1)
    .describe("Which proposal fields were examined"),
  rubricApplied: z.object({
    criteria: z
      .array(z.string())
      .min(1)
      .describe("Evaluation criteria used for scoring"),
  }),
  reasoningChain: z
    .string()
    .min(50)
    .describe(
      "Full reasoning chain explaining the score, referencing specific proposal data"
    ),
});

export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

export const SanitizedProposalSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(10000),
  budgetAmount: z.number(),
  budgetCurrency: z.string().max(10),
  budgetBreakdown: z
    .array(
      z.object({
        category: z.string().max(100),
        amount: z.number(),
        description: z.string().max(500),
      })
    )
    .max(20),
  technicalDescription: z.string().max(10000),
  teamSize: z.number(),
  teamProfileHash: z.string().describe("Hashed team identifier, no PII"),
  category: z.string().max(100),
});

export type SanitizedProposal = z.infer<typeof SanitizedProposalSchema>;

export const EvaluationResultSchema = z.object({
  proposalId: z.string(),
  scores: z.array(DimensionScoreSchema).length(SCORING_DIMENSIONS.length),
  weightedTotal: z.number().min(0).max(10),
  evaluatedAt: z.string().datetime(),
  modelId: z.string(),
  contentHash: z.string(),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
