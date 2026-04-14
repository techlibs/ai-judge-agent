import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ProposalDataSchema } from "@/lib/agents/proposal-assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      parts: z.array(z.record(z.string(), z.unknown())),
    }),
  ),
});

const PROPOSAL_ASSISTANT_SYSTEM = `You are the IPE City Grant Proposal Assistant — a friendly, expert guide that helps Architects (grant applicants) craft compelling proposals for IPE Village.

YOUR ROLE:
- Guide users through creating a grant proposal step by step
- Ask about each section conversationally, not like a form
- Validate inputs and provide helpful feedback
- When all required fields are collected, use the submitProposal tool

PROPOSAL FIELDS TO COLLECT:
1. Title — A concise project name (min 5 chars)
2. Description — What the project does (min 50 chars)
3. Problem Statement — The problem being solved (min 20 chars)
4. Proposed Solution — How you plan to solve it (min 20 chars)
5. Team Members — At least one member with name and role
6. Budget Amount — In USDC, between 100 and 1,000,000
7. Budget Breakdown — How funds will be allocated (min 20 chars)
8. Timeline — Project timeline (min 10 chars)
9. Category — One of: infrastructure, research, community, education, creative
10. Residency Duration — One of: 3-weeks, 4-weeks, 5-weeks
11. Demo Day Deliverable — What you will show on demo day (min 10 chars)
12. Community Contribution — How you will give back (min 10 chars)
13. Prior IPE Participation — First time or returning Architect
14. Links — Optional external links (GitHub, docs, etc.)

CONVERSATION FLOW:
- Start by asking about the project idea (title + description + problem)
- Then dig into the solution and team
- Then funding details
- Then IPE Village specifics
- Use the validateProposal tool periodically to check progress
- When complete, present a summary and ask for confirmation
- On confirmation, use the submitProposal tool

STYLE:
- Be encouraging but honest about weak areas
- Suggest improvements when descriptions are too brief
- Keep responses concise — 2-3 sentences per turn

IMPORTANT:
- Never fabricate proposal content — only use what the user provides
- If the user wants to skip the chat, suggest the classic form at the same page`;

const validateProposalInputSchema = z.object({
  proposal: z.record(z.string(), z.unknown()),
});

const submitProposalInputSchema = z.object({
  proposal: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages } = parsed.data;

  const uiMessages: Array<UIMessage> = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts.map((p) => {
      if (p.type === "text" && typeof p.text === "string") {
        return { type: "text" as const, text: p.text };
      }
      return { type: "text" as const, text: "" };
    }),
  }));

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: openai("gpt-4o"),
    system: PROPOSAL_ASSISTANT_SYSTEM,
    messages: modelMessages,
    tools: {
      validateProposal: {
        description:
          "Validates a partial proposal and returns which fields are complete and which are missing",
        inputSchema: validateProposalInputSchema,
        execute: async (
          input: z.infer<typeof validateProposalInputSchema>,
        ) => {
          const validation = ProposalDataSchema.safeParse(input.proposal);
          if (validation.success) {
            return {
              valid: true,
              complete: true,
              missingFields: [],
              proposal: validation.data,
            };
          }
          return {
            valid: false,
            complete: false,
            missingFields: validation.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          };
        },
      },
      submitProposal: {
        description:
          "Submits a complete, validated proposal. Only call when the user confirms.",
        inputSchema: submitProposalInputSchema,
        execute: async (
          input: z.infer<typeof submitProposalInputSchema>,
        ) => {
          const validation = ProposalDataSchema.safeParse(input.proposal);
          if (!validation.success) {
            return {
              submitted: false,
              errors: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
              })),
            };
          }
          return {
            submitted: true,
            proposal: validation.data,
          };
        },
      },
    },
    temperature: 0.4,
    maxOutputTokens: 1500,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
