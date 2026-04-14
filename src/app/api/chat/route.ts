import { streamText } from "ai";
import { z } from "zod";
import { JUDGE_ASSISTANT_SYSTEM_PROMPT } from "@/chat/prompts";
import {
  getProposalData,
  getEvaluationScores,
  searchProposals,
} from "@/chat/tools";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const OPENAI_FALLBACK_MODEL = "gpt-4o";

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  proposalId: z.string().optional(),
});

function buildSystemPrompt(proposalId: string | undefined): string {
  if (!proposalId) {
    return JUDGE_ASSISTANT_SYSTEM_PROMPT;
  }
  return `${JUDGE_ASSISTANT_SYSTEM_PROMPT}\n\nCONTEXT:\nThe user is viewing proposal "${proposalId}". When they ask questions without specifying a proposal, assume they mean this one. Use the getProposalData and getEvaluationScores tools with this proposal ID to retrieve relevant data.`;
}

async function selectModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    const { anthropic } = await import("@ai-sdk/anthropic");
    return anthropic(ANTHROPIC_MODEL);
  }
  const { openai } = await import("@ai-sdk/openai");
  return openai(OPENAI_FALLBACK_MODEL);
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, proposalId } = parsed.data;
  const systemPrompt = buildSystemPrompt(proposalId);
  const model = await selectModel();

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    tools: { getProposalData, getEvaluationScores, searchProposals },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
