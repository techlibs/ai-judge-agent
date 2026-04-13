import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { proposals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { evaluationTriggerLimiter, globalEvaluationLimiter } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security-log";
import { runEvaluationWorkflow } from "@/lib/evaluation/workflow";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { success: ipSuccess, reset } = await evaluationTriggerLimiter.limit(ip);
  if (!ipSuccess) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    logSecurityEvent({ type: "rate_limited", ip, endpoint: `/api/evaluate/${id}`, limit: "10/h" });
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  const { success: globalSuccess } = await globalEvaluationLimiter.limit("global");
  if (!globalSuccess) {
    return NextResponse.json({ error: "TOO_MANY_EVALUATIONS", message: "System is at capacity. Try again later." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!origin || origin !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.status !== "pending") {
    return NextResponse.json(
      { error: "Proposal already being evaluated" },
      { status: 409 }
    );
  }

  await db
    .update(proposals)
    .set({ status: "evaluating" })
    .where(eq(proposals.id, id));

  // Start server-orchestrated workflow in background (non-blocking)
  runEvaluationWorkflow({
    proposalId: id,
    proposal: {
      ...proposal,
      ipfsCid: proposal.ipfsCid ?? null,
    },
  }).catch((err) => {
    console.error("Workflow failed:", err);
    db.update(proposals).set({ status: "failed" }).where(eq(proposals.id, id));
  });

  // Return dimension URLs for backward compatibility
  return NextResponse.json({
    id,
    status: "evaluating",
    streams: {
      tech: `/api/evaluate/${id}/tech`,
      impact: `/api/evaluate/${id}/impact`,
      cost: `/api/evaluate/${id}/cost`,
      team: `/api/evaluate/${id}/team`,
    },
  });
}
