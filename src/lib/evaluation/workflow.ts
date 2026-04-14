import {
  JUDGE_DIMENSIONS,
  type JudgeDimension,
  MAX_JUDGE_RETRIES,
  JUDGE_RETRY_DELAY_MS,
  JUDGE_TIMEOUT_MS,
  ANOMALY_THRESHOLDS,
} from "@/lib/constants";
import { JudgeEvaluationSchema, type JudgeEvaluation } from "@/lib/judges/schemas";
import { getJudgePrompt, buildProposalContext } from "@/lib/judges/prompts";
import { computeAggregateScore } from "@/lib/judges/scoring";
import { detectInjectionPatterns } from "@/lib/judges/agents";
import { runQualityScorers, type QualityScores } from "@/lib/evaluation/scorers";
import { logSecurityEvent } from "@/lib/security-log";
import { mastra } from "@/lib/mastra";

export interface ProposalInput {
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
}

export interface DimensionResult {
  dimension: JudgeDimension;
  evaluation: JudgeEvaluation;
  qualityScores: QualityScores | null;
  attempts: number;
}

export interface EvaluationResult {
  proposalId: string;
  aggregateScoreBps: number;
  dimensions: DimensionResult[];
  anomalyFlags: string[];
  evaluatedAt: string;
}

async function runJudgeWithRetry(
  dim: JudgeDimension,
  proposalContext: string
): Promise<{ output: JudgeEvaluation; attempts: number }> {
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

async function evaluateDimension(
  dim: JudgeDimension,
  proposalContext: string
): Promise<DimensionResult> {
  const promptText = getJudgePrompt(dim);

  // Log injection attempts before sending to LLM
  const detectedPatterns = detectInjectionPatterns(proposalContext);
  if (detectedPatterns.length > 0) {
    logSecurityEvent({
      type: "injection_attempt",
      dimension: dim,
      patterns: detectedPatterns,
    });
  }

  const { output, attempts } = await runJudgeWithRetry(dim, proposalContext);

  // Run quality scorers (non-blocking failure)
  let qualityScores: QualityScores | null = null;
  try {
    qualityScores = await runQualityScorers({
      proposalContext,
      justification: output.justification,
      promptText,
    });
  } catch {
    console.warn(`Quality scoring failed for dimension: ${dim}`);
  }

  return {
    dimension: dim,
    evaluation: output,
    qualityScores,
    attempts,
  };
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

export async function runEvaluationWorkflow(
  proposal: ProposalInput
): Promise<EvaluationResult> {
  const proposalContext = buildProposalContext(proposal);

  // Run all 4 judges in parallel (wave-based execution)
  const judgeResults = await Promise.allSettled(
    JUDGE_DIMENSIONS.map((dim) => evaluateDimension(dim, proposalContext))
  );

  // Collect results, track failures
  const dimensionResults: DimensionResult[] = [];
  const failures: Array<{ dimension: JudgeDimension; reason: string }> = [];

  judgeResults.forEach((result, i) => {
    const dim = JUDGE_DIMENSIONS[i];
    if (!dim) return;
    if (result.status === "fulfilled") {
      dimensionResults.push(result.value);
    } else {
      failures.push({
        dimension: dim,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  if (failures.length > 0) {
    throw new Error(
      `Evaluation failed for dimensions: ${failures.map((f) => `${f.dimension} (${f.reason})`).join(", ")}`
    );
  }

  // Compute weighted aggregate score
  const scores: Record<JudgeDimension, number> = {
    tech: 0,
    impact: 0,
    cost: 0,
    team: 0,
  };
  for (const r of dimensionResults) {
    scores[r.dimension] = r.evaluation.score;
  }

  const aggregateScoreBps = computeAggregateScore(scores);

  // Anomaly detection
  const scoreValues = dimensionResults.map((r) => r.evaluation.score);
  const anomalyFlags = detectAnomalies(scoreValues);
  if (anomalyFlags.length > 0) {
    logSecurityEvent({
      type: "score_anomaly",
      proposalId: proposal.id,
      flags: anomalyFlags,
    });
  }

  return {
    proposalId: proposal.id,
    aggregateScoreBps,
    dimensions: dimensionResults,
    anomalyFlags,
    evaluatedAt: new Date().toISOString(),
  };
}
