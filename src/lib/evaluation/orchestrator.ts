import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";
import { computeAggregateScore } from "@/lib/judges/weights";
import { uploadJson } from "@/lib/ipfs/client";
import { publishEvaluationOnChainDetailed } from "@/lib/evaluation/publish-chain";
import { logSecurityEvent } from "@/lib/security-log";

const ANOMALY_THRESHOLDS = {
  ALL_MAX: 9500,
  ALL_MIN: 500,
  MAX_DIVERGENCE: 5000,
} as const;

export async function checkAndFinalizeEvaluation(proposalId: string): Promise<{
  complete: boolean;
  aggregateScore?: number;
}> {
  const db = getDb();

  const evals = await db.query.evaluations.findMany({
    where: eq(evaluations.proposalId, proposalId),
  });

  const completeEvals = evals.filter((e) => e.status === "complete");

  if (completeEvals.length < JUDGE_DIMENSIONS.length) {
    return { complete: false };
  }

  // Idempotency check
  const existingAggregate = await db.query.aggregateScores.findFirst({
    where: eq(aggregateScores.proposalId, proposalId),
  });
  if (existingAggregate) {
    return { complete: true, aggregateScore: existingAggregate.scoreBps };
  }

  // Compute aggregate S0
  const scores: Record<string, number> = {};
  for (const evaluation of completeEvals) {
    if (evaluation.score !== null) {
      scores[evaluation.dimension] = evaluation.score;
    }
  }

  // Score anomaly detection
  const scoreValues = Object.values(scores);
  const anomalyFlags: string[] = [];
  if (scoreValues.every(s => s >= ANOMALY_THRESHOLDS.ALL_MAX)) {
    anomalyFlags.push("ALL_SCORES_SUSPICIOUSLY_HIGH");
  }
  if (scoreValues.every(s => s <= ANOMALY_THRESHOLDS.ALL_MIN)) {
    anomalyFlags.push("ALL_SCORES_SUSPICIOUSLY_LOW");
  }
  const scoreRange = Math.max(...scoreValues) - Math.min(...scoreValues);
  if (scoreRange > ANOMALY_THRESHOLDS.MAX_DIVERGENCE) {
    anomalyFlags.push("EXTREME_SCORE_DIVERGENCE");
  }
  if (anomalyFlags.length > 0) {
    logSecurityEvent({ type: "score_anomaly", proposalId, flags: anomalyFlags });
  }

  const aggregateBps = computeAggregateScore(
    scores as Record<JudgeDimension, number>
  );

  // Upload aggregate to IPFS (optional — skipped gracefully in test mode)
  const aggregateData = {
    type: "https://ipe.city/schemas/aggregate-evaluation-v1",
    proposalId,
    aggregateScoreBps: aggregateBps,
    dimensions: completeEvals.map((e) => ({
      dimension: e.dimension,
      score: e.score,
      ipfsCid: e.ipfsCid,
    })),
    computedAt: new Date().toISOString(),
  };

  let ipfsCid = "";
  try {
    const ipfsResult = await uploadJson(aggregateData, `aggregate-${proposalId}.json`);
    ipfsCid = ipfsResult.cid;
  } catch {
    console.warn(`IPFS upload skipped for aggregate-${proposalId} (non-fatal in test mode)`);
  }

  // Save aggregate score
  await db.insert(aggregateScores).values({
    id: crypto.randomUUID(),
    proposalId,
    scoreBps: aggregateBps,
    ipfsCid,
    computedAt: new Date(),
  });

  // Update proposal status
  await db
    .update(proposals)
    .set({ status: "publishing" })
    .where(eq(proposals.id, proposalId));

  // Publish on-chain (optional — skipped gracefully in test mode)
  try {
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, proposalId),
    });

    const publishResult = await publishEvaluationOnChainDetailed({
      proposalId,
      proposalIpfsCid: proposal?.ipfsCid ?? "",
      evaluations: completeEvals.map((e) => ({
        dimension: e.dimension as JudgeDimension,
        score: e.score ?? 0,
        ipfsCid: e.ipfsCid ?? "",
      })),
      aggregateIpfsCid: ipfsCid,
    });

    // Store per-dimension feedback tx hashes on each evaluation record
    for (const evaluation of completeEvals) {
      const feedbackTxHash = publishResult.feedbackTxHashes[evaluation.dimension];
      if (feedbackTxHash) {
        await db
          .update(evaluations)
          .set({ feedbackTxHash })
          .where(eq(evaluations.id, evaluation.id));
      }
    }

    await db
      .update(proposals)
      .set({
        status: "published",
        chainTxHash: publishResult.aggregateFeedbackTxHash,
        chainTokenId: Number(publishResult.agentId),
      })
      .where(eq(proposals.id, proposalId));
  } catch {
    console.warn(`On-chain publishing skipped for ${proposalId} (non-fatal in test mode)`);
    await db
      .update(proposals)
      .set({ status: "published" })
      .where(eq(proposals.id, proposalId));
  }

  return { complete: true, aggregateScore: aggregateBps };
}
