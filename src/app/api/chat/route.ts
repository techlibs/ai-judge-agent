import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildChatSystemPrompt } from "@/lib/chat/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())),
  proposalContext: z.string().min(1).max(100_000),
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
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages, proposalContext } = parsed.data;

  if (!isUIMessageArray(messages)) {
    return Response.json(
      { error: "Invalid message format" },
      { status: 400 },
    );
  }

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
