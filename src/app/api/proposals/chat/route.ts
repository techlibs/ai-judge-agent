import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { proposalSchema } from "@/lib/schemas/proposal";
import { PROPOSAL_ASSISTANT_SYSTEM_PROMPT } from "@/lib/agents/proposal-assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

const validateProposalTool = tool({
  description:
    "Validate partial or complete proposal data against the schema. Use this to check if the user has provided enough information for a valid proposal.",
  inputSchema: z.object({
    title: z.string().optional().describe("The proposal title"),
    description: z.string().optional().describe("The proposal description"),
    teamInfo: z.string().optional().describe("Team information"),
    budget: z.number().optional().describe("Budget in USD"),
    externalLinks: z.array(z.string()).optional().describe("External URLs"),
  }),
  execute: async (input) => {
    const missingFields: string[] = [];
    if (!input.title) missingFields.push("title");
    if (!input.description) missingFields.push("description");
    if (!input.teamInfo) missingFields.push("teamInfo");
    if (input.budget === undefined || input.budget === null)
      missingFields.push("budget");

    if (missingFields.length > 0) {
      return {
        valid: false as const,
        errors: missingFields.map(
          (field) => `Missing required field: ${field}`
        ),
        missingFields,
      };
    }

    const result = proposalSchema.safeParse({
      title: input.title,
      description: input.description,
      teamInfo: input.teamInfo,
      budget: input.budget,
      externalLinks: input.externalLinks ?? [],
    });

    if (result.success) {
      return { valid: true as const, errors: [] as string[], missingFields: [] as string[] };
    }

    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return { valid: false as const, errors, missingFields: [] as string[] };
  },
});

const submitProposalTool = tool({
  description:
    "Submit the finalized proposal. Only call this after validate_proposal returns valid: true. This extracts the structured proposal data for submission.",
  inputSchema: z.object({
    title: z.string().describe("The proposal title"),
    description: z.string().describe("The proposal description"),
    teamInfo: z.string().describe("Team information"),
    budget: z.number().describe("Budget in USD"),
    externalLinks: z
      .array(z.string())
      .optional()
      .describe("External URLs"),
  }),
  execute: async (input) => {
    const data = {
      title: input.title,
      description: input.description,
      teamInfo: input.teamInfo,
      budget: input.budget,
      externalLinks: input.externalLinks ?? [],
    };

    const result = proposalSchema.safeParse(data);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return { success: false as const, error: errorMessages };
    }

    return { success: true as const, proposal: result.data };
  },
});

const bodySchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())),
});

function isUIMessageArray(value: unknown): value is UIMessage[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      "role" in m &&
      "parts" in m &&
      Array.isArray(m.parts),
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Request must include a messages array" },
      { status: 400 }
    );
  }

  if (!isUIMessageArray(parsed.data.messages)) {
    return Response.json(
      { error: "Invalid message format" },
      { status: 400 },
    );
  }

  const modelMessages = await convertToModelMessages(parsed.data.messages);

  const result = streamText({
    model: openai("gpt-4o"),
    system: PROPOSAL_ASSISTANT_SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      validate_proposal: validateProposalTool,
      submit_proposal: submitProposalTool,
    },
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
