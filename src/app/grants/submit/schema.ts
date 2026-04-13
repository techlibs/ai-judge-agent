import { z } from "zod";

const teamMemberSchema = z.object({
  role: z.string().min(1, "Role is required").max(100).trim(),
  experience: z.string().min(1, "Experience is required").max(500).trim(),
});

const budgetBreakdownItemSchema = z.object({
  category: z.string().min(1).max(100).trim(),
  amount: z.number().positive("Amount must be positive").max(100_000_000),
  description: z.string().min(1).max(500).trim(),
});

export const proposalFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters").trim(),
  description: z.string().min(50, "Description must be at least 50 characters").max(10_000, "Description must be under 10,000 characters").trim(),
  category: z.enum(["infrastructure", "education", "community", "research", "governance"], {
    errorMap: () => ({ message: "Please select a category" }),
  }),
  budgetAmount: z.number({ invalid_type_error: "Budget must be a number" }).positive("Budget must be positive").max(100_000_000, "Budget cannot exceed 100,000,000"),
  budgetCurrency: z.enum(["USD", "ETH"], {
    errorMap: () => ({ message: "Please select a currency" }),
  }),
  technicalDescription: z.string().min(50, "Technical description must be at least 50 characters").max(10_000, "Technical description must be under 10,000 characters").trim(),
  teamMembers: z.array(teamMemberSchema).min(1, "At least one team member is required").max(20, "Maximum 20 team members"),
  budgetBreakdown: z.array(budgetBreakdownItemSchema).max(20).optional().default([]),
});

export type ProposalFormData = z.infer<typeof proposalFormSchema>;
export type ProposalFormErrors = Partial<Record<keyof ProposalFormData | "server", string[]>>;
