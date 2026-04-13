import { z } from "zod";
import {
  orchestrateEvaluation,
  type EvaluationProgressEvent,
} from "@/lib/evaluation/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

const evaluateRequestSchema = z.object({
  proposalId: z.string().min(1),
  proposalText: z.string().min(1),
});

const activeEvaluations = new Set<string>();
const MAX_CONCURRENT_EVALUATIONS = 10;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = evaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { proposalId, proposalText } = parsed.data;

  if (activeEvaluations.has(proposalId)) {
    return Response.json(
      { error: "Evaluation already in progress for this proposal" },
      { status: 409 },
    );
  }

  if (activeEvaluations.size >= MAX_CONCURRENT_EVALUATIONS) {
    return Response.json(
      {
        error: "TOO_MANY_EVALUATIONS",
        message: "System is at capacity. Try again later.",
      },
      { status: 503 },
    );
  }

  activeEvaluations.add(proposalId);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: EvaluationProgressEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        await orchestrateEvaluation(proposalId, proposalText, sendEvent);
        controller.close();
      } catch (error) {
        sendEvent({
          type: "failed",
          error:
            error instanceof Error ? error.message : "Unknown error",
        });
        controller.close();
      } finally {
        activeEvaluations.delete(proposalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
