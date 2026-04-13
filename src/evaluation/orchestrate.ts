import { type Hex, keccak256, toHex } from "viem";
import { sanitizeProposal } from "./sanitization";
import { runAllDimensions } from "./agents/runner";
import { computeWeightedScore } from "./scoring";
import { detectAnomalies } from "./anomaly";
import { pinJsonToIpfs } from "@/ipfs/pin";
import { ProposalContentSchema } from "@/ipfs/schemas";
import type { EvaluationContent, ProposalContent } from "@/ipfs/schemas";
import {
  computeProposalId,
  prepareSubmitScore,
  scaleScoreToChain,
} from "@/chain/evaluation-registry";
import { prepareReleaseMilestone } from "@/chain/milestone-manager";
import { lookupReputationIndex } from "@/reputation/multiplier";
import {
  createEvaluationJob,
  updateEvaluationJobStatus,
  findExistingEvaluationJob,
  getProposalById,
} from "@/cache/queries";
import { DIMENSION_WEIGHTS, type ScoringDimension } from "./schemas";
import { PROMPT_VERSION, MODEL_ID } from "./agents/prompts";
import type { AnomalyFlag } from "./anomaly";

interface RawProposalInput {
  readonly externalId: string;
  readonly fundingRoundId: string;
  readonly title: string;
  readonly description: string;
  readonly budgetAmount: number;
  readonly budgetCurrency: string;
  readonly budgetBreakdown: ReadonlyArray<{
    readonly category: string;
    readonly amount: number;
    readonly description: string;
  }>;
  readonly technicalDescription: string;
  readonly teamMembers: ReadonlyArray<{
    readonly role: string;
    readonly experience: string;
  }>;
  readonly category: string;
  readonly submittedAt: string;
  readonly platformSource: string;
}

interface OrchestrationResult {
  readonly proposalId: Hex;
  readonly proposalContentCid: string;
  readonly evaluationContentCid: string;
  readonly finalScore: number;
  readonly adjustedScore: number;
  readonly reputationMultiplier: number;
  readonly anomalyFlags: ReadonlyArray<AnomalyFlag>;
  readonly encodedChainData: Hex;
  readonly encodedFundReleaseData: Hex | null;
}

export async function orchestrateEvaluation(
  rawProposal: RawProposalInput
): Promise<OrchestrationResult> {
  const proposalId = computeProposalId(
    rawProposal.platformSource,
    rawProposal.externalId
  );
  const fundingRoundId = keccak256(
    toHex(rawProposal.fundingRoundId)
  );

  const existingJob = await findExistingEvaluationJob(proposalId);
  if (existingJob && existingJob.status === "complete") {
    throw new DuplicateEvaluationError(proposalId);
  }

  const jobId = crypto.randomUUID();
  await createEvaluationJob({ id: jobId, proposalId });
  await updateEvaluationJobStatus(jobId, "in_progress");

  try {
    const sanitizedProposal = sanitizeProposal({
      title: rawProposal.title,
      description: rawProposal.description,
      budgetAmount: rawProposal.budgetAmount,
      budgetCurrency: rawProposal.budgetCurrency,
      budgetBreakdown: rawProposal.budgetBreakdown,
      technicalDescription: rawProposal.technicalDescription,
      teamMembers: rawProposal.teamMembers,
      category: rawProposal.category,
    });

    const proposalContent: ProposalContent = {
      version: 1,
      externalId: rawProposal.externalId,
      platformSource: rawProposal.platformSource,
      title: sanitizedProposal.title,
      description: sanitizedProposal.description,
      budgetAmount: sanitizedProposal.budgetAmount,
      budgetCurrency: sanitizedProposal.budgetCurrency,
      budgetBreakdown: [...sanitizedProposal.budgetBreakdown],
      technicalDescription: sanitizedProposal.technicalDescription,
      teamProfileHash: sanitizedProposal.teamProfileHash,
      teamSize: sanitizedProposal.teamSize,
      category: sanitizedProposal.category,
      submittedAt: rawProposal.submittedAt,
    };

    const proposalContentCid = await pinJsonToIpfs(
      ProposalContentSchema,
      proposalContent
    );

    const evaluationResult = await runAllDimensions(sanitizedProposal);

    // Look up reputation from on-chain ReputationRegistry (agent 0 as default judge)
    const reputationIndex = await lookupReputationIndex(0n);
    const { finalScore, reputationMultiplier, adjustedScore } =
      computeWeightedScore(evaluationResult.scores, reputationIndex);

    const anomalyFlags = detectAnomalies(evaluationResult.scores);

    const evaluationContent: EvaluationContent = {
      version: 1,
      proposalId,
      dimensions: evaluationResult.scores.map((score) => ({
        dimension: score.dimension,
        weight: DIMENSION_WEIGHTS[score.dimension as ScoringDimension],
        score: score.score,
        inputDataConsidered: [...score.inputDataConsidered],
        rubricApplied: {
          criteria: [...score.rubricApplied.criteria],
        },
        reasoningChain: score.reasoningChain,
        modelId: MODEL_ID,
        promptVersion: PROMPT_VERSION,
      })),
      finalScore,
      reputationMultiplier,
      adjustedScore,
      evaluatedAt: new Date().toISOString(),
    };

    const existingProposal = await getProposalById(proposalId);
    if (existingProposal?.evaluationContentCid) {
      throw new AlreadyPublishedError(proposalId);
    }

    const { evaluationContentCid, encodedData } =
      await prepareSubmitScore({
        proposalId,
        fundingRoundId,
        finalScore,
        reputationMultiplier,
        proposalContentCid,
        evaluationContent,
      });

    const chainScore = scaleScoreToChain(adjustedScore);
    const milestoneIndex = 0;
    const recipientPlaceholder = "0x0000000000000000000000000000000000000000" as Hex;

    const encodedFundReleaseData = prepareReleaseMilestone(
      proposalId,
      milestoneIndex,
      chainScore,
      recipientPlaceholder
    );

    await updateEvaluationJobStatus(jobId, "complete");

    return {
      proposalId,
      proposalContentCid,
      evaluationContentCid,
      finalScore,
      adjustedScore,
      reputationMultiplier,
      anomalyFlags,
      encodedChainData: encodedData,
      encodedFundReleaseData,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await updateEvaluationJobStatus(jobId, "failed", errorMessage);
    throw error;
  }
}

class DuplicateEvaluationError extends Error {
  constructor(proposalId: string) {
    super(`Evaluation already exists for proposal: ${proposalId}`);
    this.name = "DuplicateEvaluationError";
  }
}

class AlreadyPublishedError extends Error {
  constructor(proposalId: string) {
    super(`Evaluation already published for proposal: ${proposalId}`);
    this.name = "AlreadyPublishedError";
  }
}

export { DuplicateEvaluationError, AlreadyPublishedError };
