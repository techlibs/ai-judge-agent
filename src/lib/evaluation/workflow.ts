import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";
import { computeAggregateScore } from "@/lib/judges/weights";
import { JudgeEvaluationSchema } from "@/lib/judges/schemas";
import { getJudgePrompt, buildProposalContext, buildEnrichedProposalContext } from "@/lib/judges/prompts";
import { mastra } from "@/lib/mastra";
import { uploadJson } from "@/lib/ipfs/client";
import { runQualityScorers } from "@/lib/evaluation/scorers";
import { detectInjectionPatterns } from "@/lib/judges/agents";
import { logSecurityEvent } from "@/lib/security-log";
import { queryColosseum } from "@/lib/colosseum/client";
import { marketContextSchema, type MarketContext } from "@/lib/colosseum/schemas";
import { sanitizeColosseumResponse } from "@/lib/judges/external-data-guard";
import { buildMarketContextSection } from "@/lib/judges/context-weaver";
import { performRealityCheck } from "@/lib/judges/reality-checker";
import type { MarketValidation } from "@/lib/judges/schemas";

const MAX_JUDGE_RETRIES = 2;
const JUDGE_RETRY_DELAY_MS = 2000;
const JUDGE_TIMEOUT_MS = 90_000;

const ANOMALY_THRESHOLDS = {
  ALL_MAX: 9500,
  ALL_MIN: 500,
  MAX_DIVERGENCE: 5000,
} as const;

interface WorkflowInput {
  proposalId: string;
  proposal: {
    id: string;
    title: string;
    description: string;
    problemStatement: string;
    proposedSolution: string;
    teamMembers: Array<{ name: string; role: string }>;
    budgetAmount: number;
    budgetBreakdown: string;
    timeline: string;
    category: string;
    residencyDuration: string;
    demoDayDeliverable: string;
    communityContribution: string;
    priorIpeParticipation: boolean;
    links: string[];
    ipfsCid: string | null;
  };
}

interface DimensionResult {
  dimension: JudgeDimension;
  score: number;
  ipfsCid: string;
  evalId: string;
}

interface WorkflowResult {
  aggregateScoreBps: number;
  dimensionResults: DimensionResult[];
  anomalyFlags: string[];
  marketValidation: MarketValidation | null;
}

async function runResearchPhase(proposal: WorkflowInput["proposal"]): Promise<MarketContext | null> {
  try {
    const colosseumData = await queryColosseum(proposal.category, proposal.description);
    if (!colosseumData) return null;

    // Layer 4: Sanitize external data before it enters agent prompts
    const { sanitized, totalDetectedPatterns } = sanitizeColosseumResponse(
      colosseumData as unknown as Record<string, unknown>
    );
    if (totalDetectedPatterns.length > 0) {
      logSecurityEvent({
        type: "external_data_injection",
        source: "colosseum",
        patterns: totalDetectedPatterns,
      });
    }

    // Market Intelligence Agent: synthesize raw data into structured context
    const researchPrompt = `Analyze the following competitive intelligence data for a grant proposal in the "${proposal.category}" domain.

Proposal title: ${proposal.title}
Proposal description: ${proposal.description.slice(0, 1000)}

Raw research data:
${JSON.stringify(sanitized, null, 2)}

Synthesize this into a structured market context report with sections for technical landscape, impact assessment, cost benchmarks, and team fit patterns.`;

    const miResult = await mastra.getAgent("market-intelligence").generate(researchPrompt, {
      structuredOutput: { schema: marketContextSchema },
    });

    if (!miResult.object) {
      console.warn("[Research] Market Intelligence agent produced no output");
      return null;
    }

    return miResult.object;
  } catch (error) {
    console.error("[Research] Research phase failed (non-fatal):", error);
    return null;
  }
}

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

async function runJudgeStep(
  dim: JudgeDimension,
  proposalId: string,
  proposalContext: string,
  proposalIpfsCid: string | null
): Promise<DimensionResult> {
  const db = getDb();
  const promptText = getJudgePrompt(dim);

  // Check for existing complete evaluation (idempotency)
  const existingEval = await db.query.evaluations.findFirst({
    where: and(eq(evaluations.proposalId, proposalId), eq(evaluations.dimension, dim)),
  });
  if (existingEval?.status === "complete" && existingEval.score !== null && existingEval.ipfsCid) {
    return {
      dimension: dim,
      score: existingEval.score,
      ipfsCid: existingEval.ipfsCid,
      evalId: existingEval.id,
    };
  }

  // Create evaluation record
  const evalId = crypto.randomUUID();
  await db.insert(evaluations).values({
    id: evalId,
    proposalId,
    dimension: dim,
    status: "streaming",
    model: "gpt-5.4",
    promptVersion: `judge-${dim}-v1`,
    startedAt: new Date(),
  });

  // Log injection attempts
  const detectedPatterns = detectInjectionPatterns(proposalContext);
  if (detectedPatterns.length > 0) {
    logSecurityEvent({
      type: "injection_attempt",
      proposalId,
      stripped: detectedPatterns,
    });
  }

  try {
    const { output, attempts } = await runJudgeWithRetry(dim, proposalContext);

    // Run quality scorers
    let qualityScores: Awaited<ReturnType<typeof runQualityScorers>> | undefined;
    try {
      qualityScores = await runQualityScorers({
        proposalContext,
        justification: output.justification,
        promptText,
      });
    } catch {
      console.warn(`Quality scoring failed for ${dim}/${proposalId}`);
    }

    // Build IPFS payload with prompt transparency
    const evaluatedAt = new Date().toISOString();
    const ipfsPayload = {
      type: "https://ipe.city/schemas/judge-evaluation-v1",
      proposalCID: proposalIpfsCid,
      dimension: dim,
      ...output,
      scoreDecimals: 2,
      model: "gpt-5.4",
      promptVersion: `judge-${dim}-v1`,
      evaluatedAt,
      qualityScores: qualityScores ?? null,
      promptTransparency: {
        systemPrompt: promptText,
        userMessage: proposalContext,
        model: "gpt-5.4",
        structuredOutputSchema: "JudgeEvaluationSchema",
        temperature: "default",
        retryAttempts: attempts,
        maxRetries: MAX_JUDGE_RETRIES + 1,
        timeoutMs: JUDGE_TIMEOUT_MS,
        evaluatedAt,
        methodology:
          "Single-dimension independent judge evaluation using Mastra Agent with Zod-validated structured output. Score is basis points (0-10000). Evaluation is independent per dimension with no cross-judge contamination.",
        limitations: [
          "LLM evaluations may vary between runs despite structured output constraints",
          "Score calibration depends on prompt anchoring, not ground truth",
          "Proposal text is the sole input — no external data verification",
        ],
      },
    };

    const ipfsResult = await uploadJson(ipfsPayload, `eval-${dim}-${proposalId}.json`);

    // Update evaluation record
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
        qualityScores: qualityScores
          ? {
              faithfulness: qualityScores.faithfulness,
              hallucination: qualityScores.hallucination,
              promptAlignment: qualityScores.promptAlignment,
            }
          : null,
      })
      .where(eq(evaluations.id, evalId));

    return {
      dimension: dim,
      score: output.score,
      ipfsCid: ipfsResult.cid,
      evalId,
    };
  } catch (error) {
    await db
      .update(evaluations)
      .set({ status: "failed" })
      .where(eq(evaluations.id, evalId));
    throw error;
  }
}

function detectAnomalies(scores: number[]): string[] {
  const flags: string[] = [];
  if (scores.every((s) => s >= ANOMALY_THRESHOLDS.ALL_MAX)) {
    flags.push("ALL_SCORES_SUSPICIOUSLY_HIGH");
  }
  if (scores.every((s) => s <= ANOMALY_THRESHOLDS.ALL_MIN)) {
    flags.push("ALL_SCORES_SUSPICIOUSLY_LOW");
  }
  const range = Math.max(...scores) - Math.min(...scores);
  if (range > ANOMALY_THRESHOLDS.MAX_DIVERGENCE) {
    flags.push("EXTREME_SCORE_DIVERGENCE");
  }
  return flags;
}

export async function runEvaluationWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  const { proposalId, proposal } = input;
  const db = getDb();
  const baseProposalContext = buildProposalContext(proposal);

  // Step 0: Research phase — Colosseum API + Market Intelligence Agent
  const marketContext = await runResearchPhase(proposal);

  // Step 1: Run all 4 judges in parallel (enriched with market context if available)
  const judgeResults = await Promise.allSettled(
    JUDGE_DIMENSIONS.map((dim) => {
      const proposalContext = marketContext
        ? buildEnrichedProposalContext(
            proposal,
            buildMarketContextSection(dim, marketContext)
          )
        : baseProposalContext;
      return runJudgeStep(dim, proposalId, proposalContext, proposal.ipfsCid);
    })
  );

  // Collect results, track failures
  const dimensionResults: DimensionResult[] = [];
  const failures: Array<{ dimension: JudgeDimension; reason: string }> = [];

  for (let i = 0; i < JUDGE_DIMENSIONS.length; i++) {
    const dim = JUDGE_DIMENSIONS[i];
    const result = judgeResults[i];
    if (result.status === "fulfilled") {
      dimensionResults.push(result.value);
    } else {
      failures.push({
        dimension: dim,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  // If any dimension failed, mark proposal as failed and throw
  if (failures.length > 0) {
    await db
      .update(proposals)
      .set({ status: "failed" })
      .where(eq(proposals.id, proposalId));
    throw new Error(
      `Evaluation failed for dimensions: ${failures.map((f) => `${f.dimension} (${f.reason})`).join(", ")}`
    );
  }

  // Step 2: Aggregate — compute weighted score + anomaly detection
  const scores: Record<string, number> = {};
  for (const result of dimensionResults) {
    scores[result.dimension] = result.score;
  }

  const scoreValues = Object.values(scores);
  const anomalyFlags = detectAnomalies(scoreValues);
  if (anomalyFlags.length > 0) {
    logSecurityEvent({ type: "score_anomaly", proposalId, flags: anomalyFlags });
  }

  const aggregateBps = computeAggregateScore(scores as Record<JudgeDimension, number>);

  // Step 3: Reality Check — post-evaluation coherence validation
  let marketValidation: MarketValidation | null = null;
  if (marketContext) {
    const judgeScoresForCheck = dimensionResults.map((r) => ({
      dimension: r.dimension,
      score: r.score,
      confidence: "medium" as const,
    }));

    const coherenceReport = await performRealityCheck(
      judgeScoresForCheck,
      marketContext
    );

    if (coherenceReport) {
      marketValidation = {
        gapType: marketContext.impact.gapType as "full" | "partial" | "false",
        competitorCount: marketContext.technical.similarBuilds.length,
        similarProjectsFound: marketContext.technical.similarBuilds.length,
        marketCoherenceScore: coherenceReport.coherenceScore,
        researchConfidence: marketContext.confidence,
        coherenceFlags: coherenceReport.flags.map((f) => ({
          dimension: f.dimension,
          issue: f.issue,
          severity: f.severity,
        })),
        recommendsReview: coherenceReport.recommendsReview,
      };

      if (coherenceReport.recommendsReview) {
        logSecurityEvent({
          type: "coherence_review_recommended",
          proposalId,
          coherenceScore: coherenceReport.coherenceScore,
          flags: coherenceReport.flags.length,
        });
      }
    }
  }

  // Upload aggregate to IPFS
  const aggregateData = {
    type: "https://ipe.city/schemas/aggregate-evaluation-v1",
    proposalId,
    aggregateScoreBps: aggregateBps,
    dimensions: dimensionResults.map((r) => ({
      dimension: r.dimension,
      score: r.score,
      ipfsCid: r.ipfsCid,
    })),
    anomalyFlags: anomalyFlags.length > 0 ? anomalyFlags : undefined,
    marketValidation,
    computedAt: new Date().toISOString(),
  };

  const ipfsResult = await uploadJson(aggregateData, `aggregate-${proposalId}.json`);

  // Save aggregate score
  await db.insert(aggregateScores).values({
    id: crypto.randomUUID(),
    proposalId,
    scoreBps: aggregateBps,
    ipfsCid: ipfsResult.cid,
    computedAt: new Date(),
  });

  // Update proposal status to "evaluated" (ready for finalize/publish)
  await db
    .update(proposals)
    .set({ status: "evaluated" })
    .where(eq(proposals.id, proposalId));

  return {
    aggregateScoreBps: aggregateBps,
    dimensionResults,
    anomalyFlags,
    marketValidation,
  };
}
