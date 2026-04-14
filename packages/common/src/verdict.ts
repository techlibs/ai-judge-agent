import { z } from "zod";
import { AgentScoreSchema, TierSchema } from "./scores.js";

export const EvidenceTypeSchema = z.enum([
  "proposal_section",
  "external_reference",
  "prior_work",
  "community_data",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceSchema = z.object({
  type: EvidenceTypeSchema,
  source: z.string().describe("e.g. 'Proposal Section 3.2' or URL"),
  quote: z.string().describe("Exact text being cited"),
  relevance: z.string().describe("Why this evidence supports the claim"),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const GapClassificationSchema = z.enum(["Full", "Partial", "False"]);
export type GapClassification = z.infer<typeof GapClassificationSchema>;

export const EvidenceSufficiencySchema = z.enum(["Sufficient", "Partial", "Insufficient"]);
export type EvidenceSufficiency = z.infer<typeof EvidenceSufficiencySchema>;

export const ScoredDimensionSchema = z.object({
  criterionId: z.string(),
  criterionName: z.string(),
  tier: TierSchema,
  score: AgentScoreSchema,
  reasoning: z.string().min(100).describe("Detailed reasoning for this score"),
  evidence: z.array(EvidenceSchema).min(1).describe("At least 1 citation required (evidence floor)"),
  gapClassification: GapClassificationSchema.optional().describe("Applied when evaluating novelty claims"),
  evidenceSufficiency: EvidenceSufficiencySchema,
  limitations: z.array(z.string()).describe("What the judge could NOT verify"),
});
export type ScoredDimension = z.infer<typeof ScoredDimensionSchema>;

export const JudgeRoleSchema = z.enum([
  "Security",
  "Impact",
  "Alignment",
  "DeFiRisk",
  "GovernanceDesign",
  "Pedagogy",
  "HealthEthics",
  "InfraReliability",
]);
export type JudgeRole = z.infer<typeof JudgeRoleSchema>;

export const JudgeVerdictSchema = z.object({
  judgeId: z.string(),
  judgeRole: JudgeRoleSchema,
  proposalId: z.string(),
  evaluatedAt: z.number().int().positive(),
  dimensions: z.array(ScoredDimensionSchema).min(1),
  overallTier: TierSchema,
  overallScore: AgentScoreSchema,
  summary: z.string().min(100).describe("Overall assessment summary"),
  confidence: z.number().min(0).max(1).describe("Judge confidence in this evaluation"),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;
