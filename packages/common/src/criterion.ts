import { z } from "zod";
import { ProposalDomainSchema } from "./proposal.js";

export const CriterionCategorySchema = z.enum(["Security", "Impact", "Alignment", "Adaptive"]);
export type CriterionCategory = z.infer<typeof CriterionCategorySchema>;

export const CriterionSchema = z.object({
  criterionId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().min(10),
  category: CriterionCategorySchema,
  weight: z.number().int().min(0).max(10000).describe("Weight in basis points (0-10000)"),
  isCore: z.boolean().describe("Core criteria are always applied"),
  applicableDomains: z.array(ProposalDomainSchema).describe("Domains where this criterion applies (empty = all)"),
  evaluationGuidelines: z.string().describe("Instructions for the judge evaluating this criterion"),
  evidenceRequirements: z.array(z.string()).min(1).describe("Minimum evidence types required"),
});
export type Criterion = z.infer<typeof CriterionSchema>;

export const CriteriaSelectionReasoningSchema = z.object({
  selectedCriteria: z.array(
    z.object({
      criterionId: z.string(),
      reason: z.string().min(30).describe("Why this criterion was selected for this proposal"),
    })
  ),
  totalWeight: z.number().int().describe("Must sum to 10000"),
});
export type CriteriaSelectionReasoning = z.infer<typeof CriteriaSelectionReasoningSchema>;
