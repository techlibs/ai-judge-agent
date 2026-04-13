import { mastra } from "@/lib/mastra";
import { z } from "zod";

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  proposalId: z.string().min(1),
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

  const { messages, proposalId } = parsed.data;

  const agent = mastra.getAgent("grant-chat-assistant");

  const contextPrefix = `[Context: The user is discussing proposal ID "${proposalId}". Use the getProposalData and getEvaluationScores tools with this ID to retrieve relevant data when needed.]\n\n`;

  const augmentedMessages = messages.map((msg, idx) => {
    if (idx === 0 && msg.role === "user") {
      return { ...msg, content: contextPrefix + msg.content };
    }
    return msg;
  });

  const stream = await agent.stream(augmentedMessages);

  return stream.toDataStreamResponse();
}
