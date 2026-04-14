import type { EvaluationReport } from "@ipe-city/common";
import { toOnchainScore } from "@ipe-city/common";
import { computeCriterionId, generateSalt, computeCommitHash } from "./hash.js";

/**
 * Structured attestation data ready for on-chain publishing.
 * This is the bridge between the AI agent output and the smart contract input.
 */
export interface OnchainAttestation {
  proposalId: `0x${string}`;
  judges: JudgeAttestation[];
  consensusScores: number[];
}

export interface JudgeAttestation {
  judgeId: bigint;
  criterionIds: `0x${string}`[];
  scores: number[]; // on-chain scale (0-1000)
  overallScore: number; // on-chain scale (0-1000)
  reasoning: string;
  salt: `0x${string}`;
  commitHash: `0x${string}`;
}

/**
 * Convert an EvaluationReport to structured attestation data
 * ready for on-chain publishing on both Base and Solana.
 */
export function prepareAttestation(report: EvaluationReport): OnchainAttestation {
  const proposalId = report.proposalId as `0x${string}`;

  const judges: JudgeAttestation[] = report.verdicts.map((verdict, idx) => {
    const criterionIds = verdict.dimensions.map((d) => computeCriterionId(d.criterionName));
    const scores = verdict.dimensions.map((d) => toOnchainScore(d.score));
    const overallScore = toOnchainScore(verdict.overallScore);
    const salt = generateSalt();

    // Full reasoning: combine all dimension reasonings
    const reasoning = verdict.dimensions
      .map((d) => `[${d.criterionName}] ${d.reasoning}`)
      .join("\n\n");

    const commitHash = computeCommitHash({
      judgeId: BigInt(idx + 1),
      proposalId,
      criterionIds,
      scores: verdict.dimensions.map((d) => d.score),
      overallScore: verdict.overallScore,
      reasoning,
      salt,
    });

    return {
      judgeId: BigInt(idx + 1),
      criterionIds,
      scores,
      overallScore,
      reasoning,
      salt,
      commitHash,
    };
  });

  const consensusScores = report.verdicts.map((v) => toOnchainScore(v.overallScore));

  return { proposalId, judges, consensusScores };
}
