import { z } from "zod";
import { PROPOSAL_CATEGORIES, RESIDENCY_DURATIONS } from "@/lib/constants";

export const TeamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
});

export const ProposalInputSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(10000),
  problemStatement: z.string().min(20).max(5000),
  proposedSolution: z.string().min(20).max(5000),
  teamMembers: z.array(TeamMemberSchema).min(1).max(10),
  budgetAmount: z.number().min(100).max(1_000_000),
  budgetBreakdown: z.string().min(20).max(5000),
  timeline: z.string().min(10).max(2000),
  category: z.enum(PROPOSAL_CATEGORIES),
  residencyDuration: z.enum(RESIDENCY_DURATIONS),
  demoDayDeliverable: z.string().min(10).max(2000),
  communityContribution: z.string().min(10).max(2000),
  priorIpeParticipation: z.boolean(),
  links: z.array(z.string().url().max(500)).max(5),
});

export type ProposalInput = z.infer<typeof ProposalInputSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
