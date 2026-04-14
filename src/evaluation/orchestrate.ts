import { type Hex, keccak256, toHex } from "viem";
import { sanitizeProposal } from "./sanitization";
import { runAllDimensions } from "./agents/runner";
import { computeWeightedScore, computeMarketCoherenceScore } from "./scoring";
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
  saveEvaluationToCache,
  insertPendingProposal,
} from "@/cache/queries";
import { DIMENSION_WEIGHTS, type ScoringDimension } from "./schemas";
import { PROMPT_VERSION, MODEL_ID } from "./agents/prompts";
import type { AnomalyFlag } from "./anomaly";
import { performMarketResearch } from "./agents/market-intelligence";
import type { MarketContext } from "@/lib/colosseum/schemas";
import type { ColosseumResponse } from "@/lib/colosseum/schemas";

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

interface OrchestrationOptions {
  readonly skipResearch?: boolean;
}

interface MarketResearchResult {
  readonly marketContext: MarketContext | null;
  readonly rawResponse: ColosseumResponse | null;
  readonly researchFailureReason: string | null;
  readonly marketCoherenceScore: number | null;
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
  readonly marketResearch: MarketResearchResult;
}

export async function orchestrateEvaluation(
  rawProposal: RawProposalInput,
  options: OrchestrationOptions = {}
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

  // Insert a preliminary proposal record so it appears in listings immediately
  await insertPendingProposal({
    proposalId,
    externalId: rawProposal.externalId,
    platformSource: rawProposal.platformSource,
    fundingRoundId: rawProposal.fundingRoundId,
    title: rawProposal.title,
    description: rawProposal.description,
    budgetAmount: rawProposal.budgetAmount,
    budgetCurrency: rawProposal.budgetCurrency,
    technicalDescription: rawProposal.technicalDescription,
    teamMembers: rawProposal.teamMembers,
    category: rawProposal.category,
    submittedAt: rawProposal.submittedAt,
  });

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

    // Step: Market research (before judges)
    let marketContext: MarketContext | null = null;
    let rawResearchResponse: ColosseumResponse | null = null;
    let researchFailureReason: string | null = null;

    if (!options.skipResearch) {
      const researchOutcome = await performMarketResearch(sanitizedProposal);
      if (researchOutcome.status === "success") {
        marketContext = researchOutcome.marketContext;
        rawResearchResponse = researchOutcome.rawResponse;
      } else {
        researchFailureReason = researchOutcome.reason;
      }
    }

    const evaluationResult = await runAllDimensions(sanitizedProposal, marketContext);

    // Look up reputation from on-chain ReputationRegistry (agent 0 as default judge)
    const reputationIndex = await lookupReputationIndex(0n);
    const { finalScore, reputationMultiplier, adjustedScore } =
      computeWeightedScore(evaluationResult.scores, reputationIndex);

    const anomalyFlags = detectAnomalies(evaluationResult.scores, marketContext);

    const marketCoherenceScore = marketContext
      ? computeMarketCoherenceScore(evaluationResult.scores, marketContext)
      : null;

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

    await saveEvaluationToCache({
      proposalId,
      externalId: rawProposal.externalId,
      platformSource: rawProposal.platformSource,
      fundingRoundId: rawProposal.fundingRoundId,
      title: sanitizedProposal.title,
      description: sanitizedProposal.description,
      budgetAmount: sanitizedProposal.budgetAmount,
      budgetCurrency: rawProposal.budgetCurrency,
      technicalDescription: sanitizedProposal.technicalDescription,
      teamProfileHash: sanitizedProposal.teamProfileHash,
      teamSize: sanitizedProposal.teamSize,
      category: sanitizedProposal.category,
      submittedAt: rawProposal.submittedAt,
      proposalContentCid,
      evaluationContentCid,
      finalScore,
      adjustedScore,
      reputationMultiplier,
      dimensions: evaluationResult.scores.map((score) => ({
        dimension: score.dimension,
        weight: DIMENSION_WEIGHTS[score.dimension as ScoringDimension],
        score: score.score,
        reasoningChain: score.reasoningChain,
        inputDataConsidered: [...score.inputDataConsidered],
        rubricApplied: { criteria: [...score.rubricApplied.criteria] },
        modelId: MODEL_ID,
        promptVersion: PROMPT_VERSION,
      })),
    });

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
      marketResearch: {
        marketContext,
        rawResponse: rawResearchResponse,
        researchFailureReason,
        marketCoherenceScore,
      },
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
export type { OrchestrationResult, OrchestrationOptions, MarketResearchResult };
