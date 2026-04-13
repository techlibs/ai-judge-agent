import { z } from "zod";

const SCORING_DIMENSIONS = [
  "technical_feasibility",
  "impact_potential",
  "cost_efficiency",
  "team_capability",
] as const;

export const ProposalContentSchema = z.object({
  version: z.literal(1),
  externalId: z.string(),
  platformSource: z.string(),
  title: z.string(),
  description: z.string(),
  budgetAmount: z.number(),
  budgetCurrency: z.string(),
  budgetBreakdown: z.array(
    z.object({
      category: z.string(),
      amount: z.number(),
      description: z.string(),
    })
  ),
  technicalDescription: z.string(),
  teamProfileHash: z.string(),
  teamSize: z.number(),
  category: z.string(),
  submittedAt: z.string(),
});

export type ProposalContent = z.infer<typeof ProposalContentSchema>;

export const EvaluationContentSchema = z.object({
  version: z.literal(1),
  proposalId: z.string(),
  dimensions: z
    .array(
      z.object({
        dimension: z.enum(SCORING_DIMENSIONS),
        weight: z.number(),
        score: z.number().min(0).max(10),
        inputDataConsidered: z.array(z.string()).min(1),
        rubricApplied: z.object({
          criteria: z.array(z.string()).min(1),
        }),
        reasoningChain: z.string().min(50),
        modelId: z.string(),
        promptVersion: z.string(),
      })
    )
    .length(4),
  finalScore: z.number().min(0).max(10),
  reputationMultiplier: z.number().min(1).max(1.05),
  adjustedScore: z.number().min(0).max(10.5),
  evaluatedAt: z.string(),
});

export type EvaluationContent = z.infer<typeof EvaluationContentSchema>;

export const MonitoringReportSchema = z.object({
  version: z.literal(1),
  projectId: z.string(),
  score: z.number().min(0).max(10),
  justification: z.string().min(50),
  githubMetrics: z.object({
    commitFrequency: z.number(),
    issueVelocity: z.number(),
    releases: z.number(),
  }),
  onChainMetrics: z.object({
    transactionCount: z.number(),
    fundUtilization: z.number().min(0).max(1),
  }),
  socialMetrics: z.object({
    announcements: z.number(),
    communityEngagement: z.number(),
  }),
  riskFlags: z.array(
    z.object({
      type: z.enum([
        "inactivity",
        "fund_misuse",
        "scope_drift",
        "team_change",
      ]),
      severity: z.enum(["low", "medium", "high"]),
      description: z.string(),
    })
  ),
  monitoredAt: z.string(),
});

export type MonitoringReport = z.infer<typeof MonitoringReportSchema>;

export const DisputeEvidenceSchema = z.object({
  version: z.literal(1),
  proposalId: z.string(),
  disputeReason: z.string().min(100),
  evidence: z
    .array(
      z.object({
        type: z.enum(["text", "link", "document"]),
        content: z.string(),
        description: z.string(),
      })
    )
    .min(1),
  submittedAt: z.string(),
});

export type DisputeEvidence = z.infer<typeof DisputeEvidenceSchema>;

export const AgentRegistrationSchema = z.object({
  type: z.literal(
    "https://eips.ethereum.org/EIPS/eip-8004#registration-v1"
  ),
  name: z.string(),
  description: z.string(),
  image: z.string().url(),
  services: z.array(
    z.object({
      name: z.string(),
      endpoint: z.string(),
      version: z.string().optional(),
    })
  ),
  x402Support: z.boolean(),
  active: z.boolean(),
  registrations: z.array(
    z.object({
      agentId: z.number(),
      agentRegistry: z.string(),
    })
  ),
  supportedTrust: z.array(z.string()).optional(),
});

export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;

export const AgentFeedbackSchema = z.object({
  agentRegistry: z.string(),
  agentId: z.number(),
  clientAddress: z.string(),
  createdAt: z.string(),
  value: z.number(),
  valueDecimals: z.number().min(0).max(18),
  tag1: z.string().optional(),
  tag2: z.string().optional(),
  endpoint: z.string().optional(),
  proposalId: z.string().optional(),
  evaluationContentCid: z.string().optional(),
  feedbackReason: z.string().optional(),
});

export type AgentFeedback = z.infer<typeof AgentFeedbackSchema>;
