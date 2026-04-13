import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { JudgeEvaluationSchema } from "@/lib/judges/schemas";
import { getJudgePrompt, buildProposalContext } from "@/lib/judges/prompts";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations } from "@/lib/db/schema";
import { uploadJson } from "@/lib/ipfs/client";
import { eq, and } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";
import { evaluationTriggerLimiter } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; dimension: string }> }
) {
  const { id, dimension } = await params;

  if (!JUDGE_DIMENSIONS.includes(dimension as JudgeDimension)) {
    return new Response("Invalid dimension", { status: 400 });
  }
  const dim = dimension as JudgeDimension;

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { success } = await evaluationTriggerLimiter.limit(ip);
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const db = getDb();
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal) {
    return new Response("Proposal not found", { status: 404 });
  }

  const existingEval = await db.query.evaluations.findFirst({
    where: and(eq(evaluations.proposalId, id), eq(evaluations.dimension, dim)),
  });
  if (existingEval?.status === "complete") {
    return new Response(JSON.stringify(existingEval), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (existingEval?.status === "streaming") {
    return new Response("Evaluation already in progress", { status: 409 });
  }

  const evalId = crypto.randomUUID();
  await db.insert(evaluations).values({
    id: evalId,
    proposalId: id,
    dimension: dim,
    status: "streaming",
    model: "claude-sonnet-4-20250514",
    promptVersion: `judge-${dim}-v1`,
    startedAt: new Date(),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  const judgeAgent = new Agent({
    id: `judge-${dim}`,
    name: `Judge ${dim}`,
    model: anthropic("claude-sonnet-4-20250514"),
    instructions: getJudgePrompt(dim),
  });

  try {
    const result = await judgeAgent.generate(buildProposalContext(proposal), {
      structuredOutput: { schema: JudgeEvaluationSchema },
      abortSignal: controller.signal,
    });
    clearTimeout(timeout);
    const output = result.object;

    if (!output) {
      await db
        .update(evaluations)
        .set({ status: "failed" })
        .where(eq(evaluations.id, evalId));
      return new Response("Evaluation produced no output", { status: 500 });
    }

    const ipfsResult = await uploadJson(
      {
        type: "https://ipe.city/schemas/judge-evaluation-v1",
        proposalCID: proposal.ipfsCid,
        dimension: dim,
        ...output,
        model: "claude-sonnet-4-20250514",
        promptVersion: `judge-${dim}-v1`,
        evaluatedAt: new Date().toISOString(),
      },
      `eval-${dim}-${id}.json`
    );

    await db
      .update(evaluations)
      .set({
        score: output.score,
        scoreDecimals: output.scoreDecimals,
        confidence: output.confidence,
        recommendation: output.recommendation,
        justification: output.justification,
        keyFindings: output.keyFindings,
        risks: output.risks,
        ipeAlignmentTech: output.ipeAlignment.proTechnology,
        ipeAlignmentFreedom: output.ipeAlignment.proFreedom,
        ipeAlignmentProgress: output.ipeAlignment.proHumanProgress,
        status: "complete",
        ipfsCid: ipfsResult.cid,
        completedAt: new Date(),
      })
      .where(eq(evaluations.id, evalId));

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    clearTimeout(timeout);
    await db
      .update(evaluations)
      .set({ status: "failed" })
      .where(eq(evaluations.id, evalId));
    return new Response("Evaluation failed", { status: 500 });
  }
}
