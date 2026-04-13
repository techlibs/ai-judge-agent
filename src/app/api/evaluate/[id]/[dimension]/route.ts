import { JudgeEvaluationSchema } from "@/lib/judges/schemas";
import { getJudgePrompt, buildProposalContext } from "@/lib/judges/prompts";
import { mastra } from "@/lib/mastra";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations } from "@/lib/db/schema";
import { uploadJson } from "@/lib/ipfs/client";
import { eq, and } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";
import { evaluationTriggerLimiter } from "@/lib/rate-limit";
import { runQualityScorers } from "@/lib/evaluation/scorers";
import { logSecurityEvent } from "@/lib/security-log";
import { detectInjectionPatterns } from "@/lib/judges/agents";

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
      const result = await mastra.getAgent(`judge-${dim}`).generate(proposalContext, {
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

  // E2E test mock — return canned judge evaluation without calling LLM
  if (process.env.E2E_MOCK_JUDGES === "true") {
    const db = getDb();
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, id),
    });
    if (!proposal) {
      return new Response("Proposal not found", { status: 404 });
    }

    const mockScores: Record<string, number> = {
      tech: 8000, impact: 7500, cost: 6000, team: 8500,
    };
    const mockOutput = {
      score: mockScores[dim] ?? 7500,
      confidence: "high" as const,
      recommendation: "fund" as const,
      justification: `Mock ${dim} evaluation for E2E testing. Strong proposal with clear objectives.`,
      keyFindings: [`${dim} approach is well-structured`, `Clear implementation plan`],
      risks: [`Standard ${dim} risks apply`],
      ipeAlignment: { proTechnology: 80, proFreedom: 75, proHumanProgress: 85 },
    };

    const evalId = crypto.randomUUID();
    await db.insert(evaluations).values({
      id: evalId,
      proposalId: id,
      dimension: dim,
      score: mockOutput.score,
      scoreDecimals: 2,
      confidence: mockOutput.confidence,
      recommendation: mockOutput.recommendation,
      justification: mockOutput.justification,
      keyFindings: mockOutput.keyFindings,
      risks: mockOutput.risks,
      ipeAlignmentTech: mockOutput.ipeAlignment.proTechnology,
      ipeAlignmentFreedom: mockOutput.ipeAlignment.proFreedom,
      ipeAlignmentProgress: mockOutput.ipeAlignment.proHumanProgress,
      status: "complete",
      model: "mock-e2e",
      promptVersion: `judge-${dim}-v1`,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return new Response(JSON.stringify(mockOutput), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  const detectedPatterns = detectInjectionPatterns(proposalContext);
  if (detectedPatterns.length > 0) {
    logSecurityEvent({
      type: "injection_attempt",
      proposalId: id,
      stripped: detectedPatterns,
    });
  }

  try {
    const { output, attempts } = await runJudgeWithRetry(dim, proposalContext);

    // Run meta-evaluation quality scorers (non-blocking)
    let qualityScores: Awaited<ReturnType<typeof runQualityScorers>> | undefined;
    try {
      qualityScores = await runQualityScorers({
        proposalContext,
        justification: output.justification,
        promptText: promptText,
      });
    } catch {
      console.warn(`Quality scoring failed for ${dim}/${id}`);
    }

    // Build IPFS payload including prompt transparency metadata (EVAL-08)
    const evaluatedAt = new Date().toISOString();
    const ipfsPayload = {
      type: "https://ipe.city/schemas/judge-evaluation-v1",
      proposalCID: proposal.ipfsCid,
      dimension: dim,
      ...output,
      scoreDecimals: 2,
      model: "claude-sonnet-4-20250514",
      promptVersion: `judge-${dim}-v1`,
      evaluatedAt,
      qualityScores: qualityScores ?? null,
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
        scoreDecimals: 2,
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
        qualityFlag: qualityScores?.qualityFlag ?? false,
        qualityScores: qualityScores ? {
          faithfulness: qualityScores.faithfulness,
          hallucination: qualityScores.hallucination,
          promptAlignment: qualityScores.promptAlignment,
        } : null,
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
