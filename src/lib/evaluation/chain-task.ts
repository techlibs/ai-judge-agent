import {
  computeProposalId,
  submitEvaluationOnChain,
  awaitEvaluationConfirmation,
} from "@/chain/evaluation-registry";
import { updateChainStatus } from "@/lib/evaluation-store";
import { getPinataClient } from "@/ipfs/client";
import type { EvaluationResult } from "@/lib/evaluation/workflow";
import type { ProposalInput } from "@/lib/evaluation/workflow";

async function pinJson(data: unknown): Promise<string> {
  const pinata = getPinataClient();
  const result = await pinata.upload.json(data as Record<string, unknown>);
  return result.cid;
}

export async function runChainSubmissionTask(args: {
  proposal: ProposalInput;
  evaluation: EvaluationResult;
}): Promise<void> {
  const { proposal, evaluation } = args;
  const proposalIdHex = computeProposalId("web-form", proposal.id);

  try {
    const [proposalCid, evaluationCid] = await Promise.all([
      pinJson({
        version: 1,
        externalId: proposal.id,
        platformSource: "web-form",
        title: proposal.title,
        description: proposal.description,
        problemStatement: proposal.problemStatement,
        proposedSolution: proposal.proposedSolution,
        budgetAmount: proposal.budgetAmount,
        category: proposal.category,
        submittedAt: evaluation.evaluatedAt,
      }),
      pinJson({
        version: 1,
        proposalId: proposal.id,
        aggregateScoreBps: evaluation.aggregateScoreBps,
        dimensions: evaluation.dimensions.map((d) => ({
          dimension: d.dimension,
          score: d.evaluation.score,
          confidence: d.evaluation.confidence,
          justification: d.evaluation.justification,
        })),
        anomalyFlags: evaluation.anomalyFlags,
        evaluatedAt: evaluation.evaluatedAt,
      }),
    ]);

    await updateChainStatus(proposal.id, {
      proposalContentCid: proposalCid,
      evaluationContentCid: evaluationCid,
    });

    // Contract takes per-mille (0-1000). aggregateScoreBps is 0-10000 → divide by 10.
    const finalScoreMille = evaluation.aggregateScoreBps / 10;

    const { txHash } = await submitEvaluationOnChain({
      proposalIdHex,
      finalScoreMille,
      proposalContentCid: proposalCid,
      evaluationContentCid: evaluationCid,
    });

    await updateChainStatus(proposal.id, {
      status: "pending",
      txHash,
    });

    const { blockNumber } = await awaitEvaluationConfirmation(txHash);
    await updateChainStatus(proposal.id, {
      status: "confirmed",
      blockNumber,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateChainStatus(proposal.id, {
      status: "failed",
      error: message,
    });
  }
}

// Keep references to in-flight promises so serverless runtimes don't
// reap the worker before chain writes complete.
const inflight = new Set<Promise<unknown>>();

export function dispatchChainSubmission(
  args: Parameters<typeof runChainSubmissionTask>[0],
): void {
  const p = runChainSubmissionTask(args).finally(() => inflight.delete(p));
  inflight.add(p);
}

export function getInflightCount(): number {
  return inflight.size;
}
