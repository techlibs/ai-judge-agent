import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProposalSubmissionSchema } from "@/lib/evaluation/proposal-schema";
import { runEvaluationWorkflow, type ProgressEvent } from "@/lib/evaluation/workflow";
import { logSecurityEvent } from "@/lib/security-log";
import { validateOrigin } from "@/lib/validate-origin";
import { requireApiKey } from "@/lib/api-auth";
import { checkEvaluationTriggerLimit } from "@/lib/rate-limit";

const StreamEvaluateRequestSchema = z.object({
  proposal: ProposalSubmissionSchema,
});

const MAX_CONNECTION_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15_000;

function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const authError = requireApiKey(request);
  if (authError) {
    logSecurityEvent({ type: "auth_failed", reason: "invalid_api_key" });
    return authError;
  }

  const originError = validateOrigin(request);
  if (originError) {
    logSecurityEvent({ type: "auth_failed", reason: "invalid_origin" });
    return originError;
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = checkEvaluationTriggerLimit(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = StreamEvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { proposal } = parsed.data;
  const proposalId = crypto.randomUUID();

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let connectionTimer: ReturnType<typeof setTimeout> | undefined;
  let streamClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          streamClosed = true;
        }
      };

      // Heartbeat to keep connection alive and detect dead clients
      heartbeatTimer = setInterval(() => {
        enqueue(": heartbeat\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      // Max connection duration to prevent resource exhaustion
      connectionTimer = setTimeout(() => {
        enqueue(formatSSE("evaluation:error", {
          error: "Connection timeout exceeded",
          timestamp: new Date().toISOString(),
        }));
        cleanup();
        controller.close();
      }, MAX_CONNECTION_MS);

      const cleanup = () => {
        streamClosed = true;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (connectionTimer) clearTimeout(connectionTimer);
      };

      const onProgress = (event: ProgressEvent) => {
        enqueue(formatSSE(event.type, event));
      };

      runEvaluationWorkflow({ id: proposalId, ...proposal }, onProgress)
        .then((result) => {
          enqueue(formatSSE("result", {
            proposalId: result.proposalId,
            aggregateScore: result.aggregateScoreBps,
            dimensions: result.dimensions.map((d) => ({
              dimension: d.dimension,
              score: d.evaluation.score,
              confidence: d.evaluation.confidence,
              recommendation: d.evaluation.recommendation,
              justification: d.evaluation.justification,
              keyFindings: d.evaluation.keyFindings,
              risks: d.evaluation.risks,
              ipeAlignment: d.evaluation.ipeAlignment,
              qualityScores: d.qualityScores,
            })),
            anomalyFlags: result.anomalyFlags,
            evaluatedAt: result.evaluatedAt,
          }));
          cleanup();
          controller.close();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Evaluation failed";
          console.error("Streaming evaluation failed:", error);
          enqueue(formatSSE("evaluation:error", {
            error: message,
            proposalId,
            timestamp: new Date().toISOString(),
          }));
          cleanup();
          controller.close();
        });
    },
    cancel() {
      streamClosed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (connectionTimer) clearTimeout(connectionTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
