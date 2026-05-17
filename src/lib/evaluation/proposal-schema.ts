import { z } from "zod";
import { PROPOSAL_CATEGORIES, RESIDENCY_DURATIONS } from "@/lib/constants";

export const ProposalSubmissionSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(5000),
  problemStatement: z.string().min(20).max(3000),
  proposedSolution: z.string().min(20).max(5000),
  teamMembers: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        role: z.string().min(1).max(100),
      })
    )
    .min(1)
    .max(20),
  budgetAmount: z.number().positive().max(1_000_000),
  budgetBreakdown: z.string().min(10).max(3000),
  timeline: z.string().min(10).max(2000),
  category: z.enum(PROPOSAL_CATEGORIES),
  residencyDuration: z.enum(RESIDENCY_DURATIONS),
  demoDayDeliverable: z.string().min(10).max(1000),
  communityContribution: z.string().min(10).max(1000),
  priorIpeParticipation: z.boolean(),
  links: z.array(z.string().url()).max(10).default([]),
});

export type ProposalSubmission = z.infer<typeof ProposalSubmissionSchema>;
