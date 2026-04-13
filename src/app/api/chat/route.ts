import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildChatSystemPrompt } from "@/lib/chat/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

const uiMessagePartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const uiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(uiMessagePartSchema),
});

const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema),
  proposalContext: z.string().min(1).max(100_000),
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

  const { messages, proposalContext } = parsed.data;
  const systemPrompt = buildChatSystemPrompt(proposalContext);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: modelMessages,
    temperature: 0.4,
    maxOutputTokens: 1500,
  });

  return result.toUIMessageStreamResponse();
}
