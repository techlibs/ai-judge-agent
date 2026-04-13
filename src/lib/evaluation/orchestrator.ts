import {
  type DimensionEvaluation,
  type ProposalEvaluation,
  type EvaluationDimension,
  type EvaluationOutput,
  DIMENSIONS,
} from "./schemas";
import { evaluateDimension } from "./agents";
import { DIMENSION_WEIGHTS } from "./constants";
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

  let completedCount = 0;
  const dimensionPromises = DIMENSIONS.map(async (dim) => {
    try {
      const result = await evaluateDimension(dim, proposalText);
      completedCount++;
      onProgress({
        type: "dimension_complete",
        dimension: dim,
        output: result.output,
        completedCount,
      });
      return result;
    } catch (err) {
      completedCount++;
      onProgress({
        type: "dimension_failed",
        dimension: dim,
        error: err instanceof Error ? err.message : "Unknown error",
        completedCount,
      });
      return null;
    }
  });

  const results = await Promise.all(dimensionPromises);
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
