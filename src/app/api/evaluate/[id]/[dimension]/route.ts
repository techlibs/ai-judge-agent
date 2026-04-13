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

export const maxDuration = 120;

const MAX_JUDGE_RETRIES = 2;
const JUDGE_RETRY_DELAY_MS = 2000;
const JUDGE_TIMEOUT_MS = 90_000;

async function runJudgeWithRetry(
  dim: JudgeDimension,
  proposalContext: string
): Promise<{ output: ReturnType<typeof JudgeEvaluationSchema.parse>; attempts: number }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_JUDGE_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);

    try {
      const judgeAgent = new Agent({
        id: `judge-${dim}`,
        name: `Judge ${dim}`,
        model: anthropic("claude-sonnet-4-20250514"),
        instructions: getJudgePrompt(dim),
      });

      const result = await judgeAgent.generate(proposalContext, {
        structuredOutput: { schema: JudgeEvaluationSchema },
        abortSignal: controller.signal,
      });
      clearTimeout(timeout);

      const output = result.object;
      if (!output) {
        throw new Error("Evaluation produced no structured output");
      }

      return { output, attempts: attempt + 1 };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt < MAX_JUDGE_RETRIES) {
        const delay = JUDGE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

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

  const proposalContext = buildProposalContext(proposal);
  const promptText = getJudgePrompt(dim);

  try {
    const { output, attempts } = await runJudgeWithRetry(dim, proposalContext);

    // Build IPFS payload including prompt transparency metadata (EVAL-08)
    const evaluatedAt = new Date().toISOString();
    const ipfsPayload = {
      type: "https://ipe.city/schemas/judge-evaluation-v1",
      proposalCID: proposal.ipfsCid,
      dimension: dim,
      ...output,
      model: "claude-sonnet-4-20250514",
      promptVersion: `judge-${dim}-v1`,
      evaluatedAt,
      promptTransparency: {
        systemPrompt: promptText,
        userMessage: proposalContext,
        model: "claude-sonnet-4-20250514",
        structuredOutputSchema: "JudgeEvaluationSchema",
        temperature: "default",
        retryAttempts: attempts,
        maxRetries: MAX_JUDGE_RETRIES + 1,
        timeoutMs: JUDGE_TIMEOUT_MS,
        evaluatedAt,
        methodology: "Single-dimension independent judge evaluation using Mastra Agent with Zod-validated structured output. Score is basis points (0-10000). Evaluation is independent per dimension with no cross-judge contamination.",
        limitations: [
          "LLM evaluations may vary between runs despite structured output constraints",
          "Score calibration depends on prompt anchoring, not ground truth",
          "Proposal text is the sole input — no external data verification",
        ],
      },
    };

    const ipfsResult = await uploadJson(ipfsPayload, `eval-${dim}-${id}.json`);

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
    await db
      .update(evaluations)
      .set({ status: "failed" })
      .where(eq(evaluations.id, evalId));
    return new Response("Evaluation failed after retries", { status: 500 });
  }
}
