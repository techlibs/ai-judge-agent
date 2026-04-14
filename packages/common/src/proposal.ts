import { z } from "zod";

export const ProposalDomainSchema = z.enum([
  "DeFi",
  "Governance",
  "Education",
  "Health",
  "Infrastructure",
  "Other",
]);
export type ProposalDomain = z.infer<typeof ProposalDomainSchema>;

export const ProposalStatusSchema = z.enum([
  "Submitted",
  "UnderReview",
  "Evaluated",
  "Disputed",
]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.object({
  proposalId: z.string().describe("Deterministic ID: keccak256(submitter, title, timestamp)"),
  submitter: z.string().describe("Wallet address of the submitter"),
  title: z.string().min(1).max(200),
  summary: z.string().min(50).max(1000).describe("Brief summary of the proposal"),
  content: z.string().min(100).describe("Full proposal text"),
  domain: ProposalDomainSchema,
  requestedAmount: z.number().positive().describe("Requested grant amount in USD"),
  submittedAt: z.number().int().positive().describe("Unix timestamp"),
  status: ProposalStatusSchema,
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const ProposalClassificationSchema = z.object({
  primaryDomain: ProposalDomainSchema,
  secondaryDomain: ProposalDomainSchema.optional(),
  domainConfidence: z.number().min(0).max(1),
  reasoning: z.string().min(50).describe("Why this domain classification was chosen"),
  suggestedAdaptiveCriteria: z.array(z.string()).min(1).max(4),
  suggestedAdaptiveJudges: z.array(z.string()).min(0).max(2),
});
export type ProposalClassification = z.infer<typeof ProposalClassificationSchema>;
