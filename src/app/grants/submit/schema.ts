import { z } from "zod";
import { PROPOSAL_CATEGORIES, RESIDENCY_DURATIONS } from "@/lib/constants";

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  role: z.string().min(1, "Role is required").max(100).trim(),
});

export const proposalFormSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be under 200 characters")
    .trim(),
  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(5000, "Description must be under 5,000 characters")
    .trim(),
  problemStatement: z
    .string()
    .min(20, "Problem statement must be at least 20 characters")
    .max(3000, "Problem statement must be under 3,000 characters")
    .trim(),
  proposedSolution: z
    .string()
    .min(20, "Proposed solution must be at least 20 characters")
    .max(5000, "Proposed solution must be under 5,000 characters")
    .trim(),
  teamMembers: z
    .array(teamMemberSchema)
    .min(1, "At least one team member is required")
    .max(20, "Maximum 20 team members"),
  budgetAmount: z
    .number({ invalid_type_error: "Budget must be a number" })
    .positive("Budget must be positive")
    .max(1_000_000, "Budget cannot exceed 1,000,000"),
  budgetBreakdown: z
    .string()
    .min(10, "Budget breakdown must be at least 10 characters")
    .max(3000, "Budget breakdown must be under 3,000 characters")
    .trim(),
  timeline: z
    .string()
    .min(10, "Timeline must be at least 10 characters")
    .max(2000, "Timeline must be under 2,000 characters")
    .trim(),
  category: z.enum(PROPOSAL_CATEGORIES, {
    errorMap: () => ({ message: "Please select a category" }),
  }),
  residencyDuration: z.enum(RESIDENCY_DURATIONS, {
    errorMap: () => ({ message: "Please select a residency duration" }),
  }),
  demoDayDeliverable: z
    .string()
    .min(10, "Demo Day deliverable must be at least 10 characters")
    .max(1000, "Demo Day deliverable must be under 1,000 characters")
    .trim(),
  communityContribution: z
    .string()
    .min(10, "Community contribution must be at least 10 characters")
    .max(1000, "Community contribution must be under 1,000 characters")
    .trim(),
  priorIpeParticipation: z.boolean(),
  links: z.array(z.string().url("Must be a valid URL")).max(10).default([]),
});

export type ProposalFormData = z.infer<typeof proposalFormSchema>;
export type ProposalFormErrors = Partial<
  Record<keyof ProposalFormData | "server", string[]>
>;
