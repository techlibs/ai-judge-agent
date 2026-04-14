import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/prompts";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DIMENSION_LABELS, type JudgeDimension } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 30;

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(z.record(z.string(), z.unknown())),
  })),
  proposalId: z.string().min(1),
});

const proposalIdSchema = z.object({
  proposalId: z.string().describe("The unique ID of the proposal"),
});

const searchStatusSchema = z.object({
  status: z
    .enum(["pending", "evaluating", "evaluated", "publishing", "published", "failed"])
    .optional()
    .describe("Filter by proposal status"),
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

  const { messages, proposalId } = parsed.data;

  const contextPrefix = `[Context: The user is discussing proposal ID "${proposalId}". Use the getProposalData and getEvaluationScores tools with this ID to retrieve relevant data when needed.]\n\n`;

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

  if (uiMessages.length > 0 && uiMessages[0].role === "user") {
    const firstMsg = uiMessages[0];
    const existingText = firstMsg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    uiMessages[0] = {
      ...firstMsg,
      parts: [{ type: "text" as const, text: contextPrefix + existingText }],
    };
  }

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: openai("gpt-4o"),
    system: CHAT_SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      getProposalData: {
        description: "Retrieves full proposal details for a given proposal ID",
        inputSchema: proposalIdSchema,
        execute: async (input: z.infer<typeof proposalIdSchema>) => {
          const db = getDb();
          const proposal = await db.query.proposals.findFirst({
            where: eq(proposals.id, input.proposalId),
          });
          if (!proposal) return { found: false, message: `No proposal found with ID ${input.proposalId}` };
          return { found: true, proposal };
        },
      },
      getEvaluationScores: {
        description: "Retrieves judge evaluation scores and justifications for a proposal",
        inputSchema: proposalIdSchema,
        execute: async (input: z.infer<typeof proposalIdSchema>) => {
          const db = getDb();
          const evals = await db.query.evaluations.findMany({
            where: eq(evaluations.proposalId, input.proposalId),
          });
          const aggregate = await db.query.aggregateScores.findFirst({
            where: eq(aggregateScores.proposalId, input.proposalId),
          });
          if (evals.length === 0) return { found: false, message: `No evaluations found for proposal ${input.proposalId}` };
          const dimensionResults = evals.map((e) => ({
            dimension: e.dimension,
            dimensionLabel: DIMENSION_LABELS[e.dimension as JudgeDimension] ?? e.dimension,
            score: e.score,
            confidence: e.confidence,
            recommendation: e.recommendation,
            justification: e.justification,
            keyFindings: e.keyFindings,
            risks: e.risks,
          }));
          return { found: true, aggregateScore: aggregate?.scoreBps ?? null, dimensions: dimensionResults };
        },
      },
      searchProposals: {
        description: "Lists all proposals with their status and aggregate scores",
        inputSchema: searchStatusSchema,
        execute: async (input: z.infer<typeof searchStatusSchema>) => {
          const db = getDb();
          const allProposals = input.status
            ? await db.query.proposals.findMany({ where: eq(proposals.status, input.status) })
            : await db.query.proposals.findMany();
          if (allProposals.length === 0) return { found: false, message: "No proposals found." };
          const allAggregates = await db.query.aggregateScores.findMany();
          const aggregateMap = new Map(allAggregates.map((a) => [a.proposalId, a.scoreBps]));
          return {
            found: true,
            proposals: allProposals.map((p) => ({
              id: p.id,
              title: p.title,
              category: p.category,
              status: p.status,
              budgetAmount: p.budgetAmount,
              aggregateScore: aggregateMap.get(p.id) ?? null,
            })),
          };
        },
      },
    },
    temperature: 0.4,
    maxOutputTokens: 1500,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
