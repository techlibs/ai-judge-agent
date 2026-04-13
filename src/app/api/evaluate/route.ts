import { z } from "zod";
import {
  orchestrateEvaluation,
  type EvaluationProgressEvent,
} from "@/lib/evaluation/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

const evaluateRequestSchema = z.object({
  proposalId: z.string().min(1),
  proposalText: z.string().min(1).max(50000),
});

// Per-instance tracking. In production, replace with Redis/KV-backed solution
// to track evaluations across serverless instances.
// TODO: migrate to Redis/KV for multi-instance deployments
const activeEvaluations = new Set<string>();
const MAX_CONCURRENT_EVALUATIONS = 10;

const HEARTBEAT_INTERVAL_MS = 15_000;
const STREAM_TIMEOUT_MS = 90_000;

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

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`:heartbeat\n\n`));
      }, HEARTBEAT_INTERVAL_MS);

      const abortController = new AbortController();
      const timeout = setTimeout(() => {
        abortController.abort();
      }, STREAM_TIMEOUT_MS);

      try {
        await Promise.race([
          orchestrateEvaluation(proposalId, proposalText, sendEvent),
          new Promise<never>((_, reject) => {
            abortController.signal.addEventListener("abort", () => {
              reject(new Error("Evaluation timed out"));
            });
          }),
        ]);
        controller.close();
      } catch (error) {
        console.error("Evaluation failed:", error);
        sendEvent({
          type: "failed",
          error: "Evaluation failed",
        });
        controller.close();
      } finally {
        clearInterval(heartbeat);
        clearTimeout(timeout);
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
