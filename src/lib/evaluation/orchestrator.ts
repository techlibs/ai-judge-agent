import {
  type DimensionEvaluation,
  type ProposalEvaluation,
  type EvaluationDimension,
  type EvaluationOutput,
} from "./schemas";
import { evaluateDimension, evaluateNaive } from "./agents";
import { DIMENSION_WEIGHTS, DIMENSIONS } from "./constants";
import { pinEvaluationToIPFS, publishScoreOnChain } from "./storage";

export type EvaluationProgressEvent =
  | { type: "started"; proposalId: string; totalDimensions: number }
  | {
      type: "dimension_complete";
      dimension: EvaluationDimension;
      output: EvaluationOutput;
      completedCount: number;
    }
  | {
      type: "dimension_failed";
      dimension: EvaluationDimension;
      error: string;
      completedCount: number;
    }
  | {
      type: "aggregate_computed";
      weightedScore: number;
      completedDimensions: number;
    }
  | { type: "naive_complete"; naiveOutput: string }
  | { type: "stored"; ipfsCid: string; txHash: string }
  | { type: "complete"; evaluation: ProposalEvaluation }
  | { type: "failed"; error: string };

export function computeAggregateScore(
  dimensions: DimensionEvaluation[],
): number {
  const weightedSum = dimensions.reduce(
    (sum, dim) => sum + dim.output.score * DIMENSION_WEIGHTS[dim.dimension],
    0,
  );
  const totalWeight = dimensions.reduce(
    (sum, dim) => sum + DIMENSION_WEIGHTS[dim.dimension],
    0,
  );
  if (totalWeight === 0) return 0;
  const result = weightedSum / totalWeight;
  return Math.round(result * 10) / 10;
}

export async function orchestrateEvaluation(
  proposalId: string,
  proposalText: string,
  onProgress: (event: EvaluationProgressEvent) => void,
): Promise<ProposalEvaluation> {
  onProgress({ type: "started", proposalId, totalDimensions: 4 });

  const results: Array<DimensionEvaluation | null> = [];
  const dimensionPromises = DIMENSIONS.map(async (dim) => {
    try {
      const result = await evaluateDimension(dim.key, proposalText);
      results.push(result);
      onProgress({
        type: "dimension_complete",
        dimension: dim.key,
        output: result.output,
        completedCount: results.length,
      });
      return result;
    } catch (err) {
      results.push(null);
      onProgress({
        type: "dimension_failed",
        dimension: dim.key,
        error: err instanceof Error ? err.message : "Unknown error",
        completedCount: results.length,
      });
      return null;
    }
  });

  const naivePromise = evaluateNaive(proposalText)
    .then((output) => {
      onProgress({ type: "naive_complete", naiveOutput: output });
      return output;
    })
    .catch(() => null);

  await Promise.all([...dimensionPromises, naivePromise]);
  const successfulDimensions = results.filter(
    (v): v is DimensionEvaluation => v !== null,
  );

  if (successfulDimensions.length === 0) {
    const errorMsg = "All dimension evaluations failed";
    onProgress({ type: "failed", error: errorMsg });
    throw new Error(errorMsg);
  }

  const weightedScore = computeAggregateScore(successfulDimensions);
  onProgress({
    type: "aggregate_computed",
    weightedScore,
    completedDimensions: successfulDimensions.length,
  });

  const evaluation: ProposalEvaluation = {
    proposalId,
    dimensions: successfulDimensions,
    aggregate: {
      weightedScore,
      completedDimensions: successfulDimensions.length,
      computedAt: Date.now(),
    },
    status: "evaluated",
  };

  const ipfsCid = await pinEvaluationToIPFS(evaluation);
  const txHash = await publishScoreOnChain(
    proposalId,
    weightedScore,
    ipfsCid,
  );
  onProgress({ type: "stored", ipfsCid, txHash });
  onProgress({ type: "complete", evaluation });

  return evaluation;
}
