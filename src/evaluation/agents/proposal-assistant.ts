import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { proposalFormSchema } from "@/app/grants/submit/schema";
import { extractGithubRepo } from "./tools/extract-github";
import { extractVideoContext } from "./tools/extract-video";

const PROPOSAL_CATEGORIES = ["infrastructure", "education", "community", "research", "governance"] as const;
const BUDGET_CURRENCIES = ["USD", "ETH"] as const;

const PROPOSAL_ASSISTANT_SYSTEM_PROMPT = `You are a friendly and helpful proposal assistant for IPE City Grants. Your job is to guide users through creating a complete grant proposal via conversation.

You need to collect ALL of the following information before a proposal can be submitted:
1. **Title** - A concise, descriptive title (max 200 characters)
2. **Category** - One of: ${PROPOSAL_CATEGORIES.join(", ")}
3. **Description** - A detailed description of the proposal (minimum 50 characters)
4. **Technical Description** - Technical approach and implementation details (minimum 50 characters)
5. **Budget Amount** - A positive number
6. **Budget Currency** - Either USD or ETH
7. **Team Members** - At least one team member with their role and experience
8. **Budget Breakdown** - Optional line items (category, amount, description)

CONVERSATION GUIDELINES:
- Start by asking what the user's project is about. Let them describe it naturally.
- Extract information from their responses. Don't ask for every field one by one — group related questions.
- After the user describes their project, ask follow-up questions for missing fields.
- When you have enough information for a field, confirm it with the user.
- Use the validatePartialProposal tool periodically to check what fields are still missing.
- Once all required fields are collected, use the extractCompleteProposal tool to produce the final structured data.
- Be conversational and encouraging. Help users refine their ideas.
- If a field doesn't meet requirements (e.g., description too short), explain what's needed and help them expand it.

GITHUB INTEGRATION:
- When a user shares a GitHub URL, use the extractGithubRepo tool to fetch project details.
- Use the extracted data (README, description, languages, topics) to help pre-fill proposal fields.
- Always confirm extracted data with the user before using it in the proposal.
- The README often contains the best project description — use it to draft the Description and Technical Description fields.

VIDEO CONTEXT:
- When a user shares a YouTube, Loom, or Vimeo URL, use the extractVideoContext tool.
- YouTube videos include a transcript — use it to understand the project and draft proposal fields.
- For Loom/Vimeo, only metadata is available (title, description) — use what's there.
- Always confirm extracted information with the user before incorporating it.

IMPORTANT:
- Never fabricate proposal data. Only use information the user explicitly provides.
- If the user's input is ambiguous, ask for clarification.
- When the proposal is complete, present a summary and ask for confirmation before extracting.`;

const partialProposalSchema = z.object({
  title: z.string().optional(),
  category: z.enum(PROPOSAL_CATEGORIES).optional(),
  description: z.string().optional(),
  technicalDescription: z.string().optional(),
  budgetAmount: z.number().optional(),
  budgetCurrency: z.enum(BUDGET_CURRENCIES).optional(),
  teamMembers: z.array(z.object({
    role: z.string(),
    experience: z.string(),
  })).optional(),
  budgetBreakdown: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    description: z.string(),
  })).optional(),
});

const validatePartialProposal = createTool({
  id: "validatePartialProposal",
  description: "Validates the proposal data collected so far and reports which fields are missing or invalid. Use this to check progress and inform the user what's still needed.",
  inputSchema: partialProposalSchema,
  outputSchema: z.object({
    isComplete: z.boolean(),
    missingFields: z.array(z.string()),
    invalidFields: z.array(z.object({
      field: z.string(),
      error: z.string(),
    })),
  }),
  execute: async (input) => {
    const missingFields: Array<string> = [];
    const invalidFields: Array<{ field: string; error: string }> = [];

    if (!input.title || input.title.length === 0) {
      missingFields.push("title");
    } else if (input.title.length > 200) {
      invalidFields.push({ field: "title", error: "Must be under 200 characters" });
    }

    if (!input.category) {
      missingFields.push("category");
    }

    if (!input.description || input.description.length === 0) {
      missingFields.push("description");
    } else if (input.description.length < 50) {
      invalidFields.push({ field: "description", error: `Must be at least 50 characters (currently ${input.description.length})` });
    }

    if (!input.technicalDescription || input.technicalDescription.length === 0) {
      missingFields.push("technicalDescription");
    } else if (input.technicalDescription.length < 50) {
      invalidFields.push({ field: "technicalDescription", error: `Must be at least 50 characters (currently ${input.technicalDescription.length})` });
    }

    if (input.budgetAmount === undefined || input.budgetAmount === null) {
      missingFields.push("budgetAmount");
    } else if (input.budgetAmount <= 0) {
      invalidFields.push({ field: "budgetAmount", error: "Must be a positive number" });
    }

    if (!input.budgetCurrency) {
      missingFields.push("budgetCurrency");
    }

    if (!input.teamMembers || input.teamMembers.length === 0) {
      missingFields.push("teamMembers");
    }

    const isComplete = missingFields.length === 0 && invalidFields.length === 0;

    return { isComplete, missingFields, invalidFields };
  },
});

const extractCompleteProposal = createTool({
  id: "extractCompleteProposal",
  description: "Extracts and validates the complete proposal data. Only call this when all required fields have been collected and confirmed by the user. Returns the validated proposal or validation errors.",
  inputSchema: z.object({
    title: z.string(),
    category: z.enum(PROPOSAL_CATEGORIES),
    description: z.string(),
    technicalDescription: z.string(),
    budgetAmount: z.number(),
    budgetCurrency: z.enum(BUDGET_CURRENCIES),
    teamMembers: z.array(z.object({
      role: z.string(),
      experience: z.string(),
    })),
    budgetBreakdown: z.array(z.object({
      category: z.string(),
      amount: z.number(),
      description: z.string(),
    })).optional().default([]),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    proposal: proposalFormSchema.optional(),
    errors: z.array(z.string()).optional(),
  }),
  execute: async (input) => {
    const result = proposalFormSchema.safeParse(input);

    if (result.success) {
      return { success: true, proposal: result.data };
    }

    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return { success: false, errors };
  },
});

export const proposalAssistant = new Agent({
  id: "proposal-assistant",
  name: "proposal-assistant",
  instructions: PROPOSAL_ASSISTANT_SYSTEM_PROMPT,
  model: openai("gpt-4o"),
  tools: {
    validatePartialProposal,
    extractCompleteProposal,
    extractGithubRepo,
    extractVideoContext,
  },
});

export { validatePartialProposal, extractCompleteProposal, PROPOSAL_ASSISTANT_SYSTEM_PROMPT };
