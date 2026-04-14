import { streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { proposalFormSchema } from "@/app/grants/submit/schema";
import { PROPOSAL_ASSISTANT_SYSTEM_PROMPT } from "@/evaluation/agents/proposal-assistant";

const MODEL_ID = "gpt-4o";

const PROPOSAL_CATEGORIES = ["infrastructure", "education", "community", "research", "governance"] as const;
const BUDGET_CURRENCIES = ["USD", "ETH"] as const;

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

const validatePartialProposal = tool({
  description: "Validates the proposal data collected so far and reports which fields are missing or invalid.",
  parameters: z.object({
    title: z.string().optional(),
    category: z.enum(PROPOSAL_CATEGORIES).optional(),
    description: z.string().optional(),
    technicalDescription: z.string().optional(),
    budgetAmount: z.number().optional(),
    budgetCurrency: z.enum(BUDGET_CURRENCIES).optional(),
    teamMembers: z.array(z.object({ role: z.string(), experience: z.string() })).optional(),
    budgetBreakdown: z.array(z.object({ category: z.string(), amount: z.number(), description: z.string() })).optional(),
  }),
  execute: async (input) => {
    const missingFields: Array<string> = [];
    const invalidFields: Array<{ field: string; error: string }> = [];

    if (!input.title || input.title.length === 0) {
      missingFields.push("title");
    } else if (input.title.length > 200) {
      invalidFields.push({ field: "title", error: "Must be under 200 characters" });
    }

    if (!input.category) missingFields.push("category");

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

    if (!input.budgetCurrency) missingFields.push("budgetCurrency");
    if (!input.teamMembers || input.teamMembers.length === 0) missingFields.push("teamMembers");

    return { isComplete: missingFields.length === 0 && invalidFields.length === 0, missingFields, invalidFields };
  },
});

const extractCompleteProposal = tool({
  description: "Extracts and validates the complete proposal data. Only call when all required fields are collected and confirmed by the user.",
  parameters: z.object({
    title: z.string(),
    category: z.enum(PROPOSAL_CATEGORIES),
    description: z.string(),
    technicalDescription: z.string(),
    budgetAmount: z.number(),
    budgetCurrency: z.enum(BUDGET_CURRENCIES),
    teamMembers: z.array(z.object({ role: z.string(), experience: z.string() })),
    budgetBreakdown: z.array(z.object({ category: z.string(), amount: z.number(), description: z.string() })).optional().default([]),
  }),
  execute: async (input) => {
    const result = proposalFormSchema.safeParse(input);
    if (result.success) {
      return { success: true, proposal: result.data };
    }
    const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    return { success: false, errors };
  },
});

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = streamText({
    model: openai(MODEL_ID),
    system: PROPOSAL_ASSISTANT_SYSTEM_PROMPT,
    messages: parsed.data.messages,
    tools: { validatePartialProposal, extractCompleteProposal },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
