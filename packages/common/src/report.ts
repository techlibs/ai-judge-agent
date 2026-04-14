import { z } from "zod";
import { AgentScoreSchema, TierSchema } from "./scores.js";
import { JudgeVerdictSchema } from "./verdict.js";
import { DeliberationRoundSchema } from "./deliberation.js";
import { ConsensusStatusSchema } from "./consensus.js";
import { CriteriaSelectionReasoningSchema } from "./criterion.js";
import { ProposalClassificationSchema } from "./proposal.js";

export const EvaluationReportSchema = z.object({
  proposalId: z.string(),
  classification: ProposalClassificationSchema,
  criteriaSelection: CriteriaSelectionReasoningSchema,
  verdicts: z.array(JudgeVerdictSchema).min(3).describe("At least 3 core judges"),
  deliberation: DeliberationRoundSchema.optional().describe("Present only if disagreements found"),
  finalScore: AgentScoreSchema,
  finalTier: TierSchema,
  consensusStatus: ConsensusStatusSchema,
  recommendation: z.enum(["Fund", "Fund with conditions", "Revise and resubmit", "Reject"]),
  executiveSummary: z.string().min(200).describe("Human-readable overall assessment"),
  securityVeto: z.boolean().describe("True if Security score < 4, flagged for human review"),
  evaluatedAt: z.number().int().positive(),
  totalJudges: z.number().int().min(3),
  totalDimensions: z.number().int().min(3),
});
export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;
