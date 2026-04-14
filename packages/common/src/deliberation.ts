import { z } from "zod";
import { TierSchema } from "./scores.js";
import { JudgeRoleSchema } from "./verdict.js";

export const DisagreementResolutionSchema = z.enum([
  "Consensus",
  "Dissent",
  "Reconciled",
]);
export type DisagreementResolution = z.infer<typeof DisagreementResolutionSchema>;

export const DisagreementRecordSchema = z.object({
  dimension: z.string().describe("The criterion where judges disagree"),
  judges: z.array(
    z.object({
      judgeRole: JudgeRoleSchema,
      tier: TierSchema,
      score: z.number(),
      keyArgument: z.string().describe("Core reasoning for their position"),
    })
  ).min(2),
  tierSpread: z.number().int().min(0).describe("Tier gap between most divergent judges"),
  question: z.string().describe("Specific question posed by Presiding Judge"),
  responses: z.array(
    z.object({
      judgeRole: JudgeRoleSchema,
      response: z.string(),
      revisedScore: z.number().optional(),
      revisedTier: TierSchema.optional(),
    })
  ),
  resolution: DisagreementResolutionSchema,
  resolutionReasoning: z.string().describe("Why this resolution was reached"),
});
export type DisagreementRecord = z.infer<typeof DisagreementRecordSchema>;

export const DeliberationRoundSchema = z.object({
  proposalId: z.string(),
  disagreements: z.array(DisagreementRecordSchema),
  totalDisagreements: z.number().int().min(0),
  resolvedCount: z.number().int().min(0),
  dissentCount: z.number().int().min(0),
  deliberatedAt: z.number().int().positive(),
});
export type DeliberationRound = z.infer<typeof DeliberationRoundSchema>;
