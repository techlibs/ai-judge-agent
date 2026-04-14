import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProposalSubmissionSchema } from "@/lib/evaluation/proposal-schema";
import { runEvaluationWorkflow } from "@/lib/evaluation/workflow";
import { logSecurityEvent } from "@/lib/security-log";
import { validateOrigin } from "@/lib/validate-origin";
import { requireApiKey } from "@/lib/api-auth";
import { checkEvaluationTriggerLimit } from "@/lib/rate-limit";

const EvaluateRequestSchema = z.object({
  proposal: ProposalSubmissionSchema,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // API key authentication
  const authError = requireApiKey(request);
  if (authError) {
    logSecurityEvent({ type: "auth_failed", reason: "invalid_api_key" });
    return authError;
  }

  // Origin validation
  const originError = validateOrigin(request);
  if (originError) {
    logSecurityEvent({ type: "auth_failed", reason: "invalid_origin" });
    return originError;
  }

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = checkEvaluationTriggerLimit(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
      { status: 429 }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = EvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { proposal } = parsed.data;
  const proposalId = crypto.randomUUID();

  try {
    const result = await runEvaluationWorkflow({
      id: proposalId,
      ...proposal,
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Evaluation failed:", error);
    return NextResponse.json(
      { error: "Evaluation failed", proposalId },
      { status: 500 }
    );
  }
}
