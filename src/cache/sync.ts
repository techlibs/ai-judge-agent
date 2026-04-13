import { getDb } from "./client";
import {
  proposals,
  dimensionScores,
  fundReleases,
  agents,
  fundingRoundStats,
  disputes,
} from "./schema";
import {
  fetchEvaluations,
  fetchAgents,
  fetchFundReleases,
  fetchDisputes,
} from "@/graph/queries";
import { fetchJsonFromIpfs } from "@/ipfs/pin";
import {
  ProposalContentSchema,
  EvaluationContentSchema,
  AgentRegistrationSchema,
} from "@/ipfs/schemas";
import type { ProposalContent, EvaluationContent } from "@/ipfs/schemas";
import { eq, sql } from "drizzle-orm";

const BATCH_SIZE = 100;
const SCORE_PRECISION = 100;

interface SyncResult {
  readonly eventsProcessed: number;
  readonly ipfsFetched: number;
}

export async function syncCache(): Promise<SyncResult> {
  let eventsProcessed = 0;
  let ipfsFetched = 0;

  const evaluationResult = await syncEvaluations();
  eventsProcessed += evaluationResult.eventsProcessed;
  ipfsFetched += evaluationResult.ipfsFetched;

  const agentResult = await syncAgents();
  eventsProcessed += agentResult.eventsProcessed;
  ipfsFetched += agentResult.ipfsFetched;

  const fundResult = await syncFundReleases();
  eventsProcessed += fundResult.eventsProcessed;

  const disputeResult = await syncDisputes();
  eventsProcessed += disputeResult.eventsProcessed;

  await recomputeFundingRoundStats();

  return { eventsProcessed, ipfsFetched };
}

async function syncEvaluations(): Promise<SyncResult> {
  let eventsProcessed = 0;
  let ipfsFetched = 0;
  let skip = 0;

  while (true) {
    const evaluations = await fetchEvaluations(BATCH_SIZE, skip);
    if (evaluations.length === 0) break;

    for (const evaluation of evaluations) {
      eventsProcessed++;

      let proposalContent: ProposalContent | null = null;
      let evaluationContent: EvaluationContent | null = null;

      try {
        proposalContent = await fetchJsonFromIpfs(
          evaluation.proposalContentCid,
          ProposalContentSchema
        );
        ipfsFetched++;
      } catch {
        continue;
      }

      try {
        evaluationContent = await fetchJsonFromIpfs(
          evaluation.evaluationContentCid,
          EvaluationContentSchema
        );
        ipfsFetched++;
      } catch {
        continue;
      }

      const db = getDb();
      const proposalId = evaluation.id;

      const status = evaluation.fundRelease ? "funded" : "evaluated";

      await db
        .insert(proposals)
        .values({
          id: proposalId,
          fundingRoundId: evaluation.fundingRoundId,
          externalId: proposalContent.externalId,
          platformSource: proposalContent.platformSource,
          title: proposalContent.title,
          description: proposalContent.description,
          budgetAmount: proposalContent.budgetAmount,
          budgetCurrency: proposalContent.budgetCurrency,
          technicalDescription: proposalContent.technicalDescription,
          teamProfileHash: proposalContent.teamProfileHash,
          teamSize: proposalContent.teamSize,
          category: proposalContent.category,
          proposalContentCid: evaluation.proposalContentCid,
          evaluationContentCid: evaluation.evaluationContentCid,
          finalScore: evaluation.finalScore / SCORE_PRECISION,
          adjustedScore: evaluation.adjustedScore / SCORE_PRECISION,
          reputationMultiplier:
            evaluationContent.reputationMultiplier,
          status,
          submittedAt: proposalContent.submittedAt,
          evaluatedAt: evaluationContent.evaluatedAt,
          chainTimestamp: Number(evaluation.timestamp),
        })
        .onConflictDoUpdate({
          target: proposals.id,
          set: {
            finalScore: evaluation.finalScore / SCORE_PRECISION,
            adjustedScore: evaluation.adjustedScore / SCORE_PRECISION,
            evaluationContentCid: evaluation.evaluationContentCid,
            status,
            evaluatedAt: evaluationContent.evaluatedAt,
            chainTimestamp: Number(evaluation.timestamp),
          },
        });

      for (const dim of evaluationContent.dimensions) {
        const dimId = `${proposalId}_${dim.dimension}`;
        await db
          .insert(dimensionScores)
          .values({
            id: dimId,
            proposalId,
            dimension: dim.dimension,
            weight: dim.weight,
            score: dim.score,
            reasoningChain: dim.reasoningChain,
            inputDataConsidered: JSON.stringify(dim.inputDataConsidered),
            rubricApplied: JSON.stringify(dim.rubricApplied),
            modelId: dim.modelId,
            promptVersion: dim.promptVersion,
          })
          .onConflictDoUpdate({
            target: dimensionScores.id,
            set: {
              score: dim.score,
              reasoningChain: dim.reasoningChain,
            },
          });
      }
    }

    skip += BATCH_SIZE;
    if (evaluations.length < BATCH_SIZE) break;
  }

  return { eventsProcessed, ipfsFetched };
}

async function syncAgents(): Promise<SyncResult> {
  let eventsProcessed = 0;
  let ipfsFetched = 0;
  let skip = 0;

  while (true) {
    const agentList = await fetchAgents(BATCH_SIZE, skip);
    if (agentList.length === 0) break;

    for (const agent of agentList) {
      eventsProcessed++;

      let name: string | null = null;
      let description: string | null = null;

      if (agent.agentURI) {
        try {
          const registration = await fetchJsonFromIpfs(
            agent.agentURI,
            AgentRegistrationSchema
          );
          name = registration.name;
          description = registration.description;
          ipfsFetched++;
        } catch {
          // continue without IPFS data
        }
      }

      let scoringDimension: string | null = null;
      let promptVersion: string | null = null;
      for (const meta of agent.metadata) {
        if (meta.metadataKey === "scoringDimension") {
          scoringDimension = meta.metadataValue;
        }
        if (meta.metadataKey === "promptVersion") {
          promptVersion = meta.metadataValue;
        }
      }

      const feedbackCount = agent.feedback.filter((f) => !f.isRevoked).length;
      let feedbackSummaryValue: number | null = null;
      if (feedbackCount > 0) {
        const total = agent.feedback
          .filter((f) => !f.isRevoked)
          .reduce((sum, f) => sum + Number(f.value), 0);
        feedbackSummaryValue = total / feedbackCount;
      }

      const db = getDb();
      await db
        .insert(agents)
        .values({
          agentId: Number(agent.id),
          owner: agent.owner,
          agentURI: agent.agentURI,
          name,
          description,
          scoringDimension,
          promptVersion,
          feedbackCount,
          feedbackSummaryValue,
          registeredAt: Number(agent.registeredAt),
        })
        .onConflictDoUpdate({
          target: agents.agentId,
          set: {
            agentURI: agent.agentURI,
            name,
            description,
            scoringDimension,
            promptVersion,
            feedbackCount,
            feedbackSummaryValue,
          },
        });
    }

    skip += BATCH_SIZE;
    if (agentList.length < BATCH_SIZE) break;
  }

  return { eventsProcessed, ipfsFetched };
}

async function syncFundReleases(): Promise<SyncResult> {
  let eventsProcessed = 0;
  let skip = 0;

  while (true) {
    const releases = await fetchFundReleases(BATCH_SIZE, skip);
    if (releases.length === 0) break;

    for (const release of releases) {
      eventsProcessed++;

      const db = getDb();
      const releaseId = `${release.projectId}_${release.milestoneIndex}`;

      await db
        .insert(fundReleases)
        .values({
          id: releaseId,
          projectId: release.projectId,
          milestoneIndex: release.milestoneIndex,
          score: release.releasePercentage / 10,
          releasePercentage: release.releasePercentage / 10,
          amount: release.amount,
          txHash: release.id,
          releasedAt: Number(release.timestamp),
        })
        .onConflictDoUpdate({
          target: fundReleases.id,
          set: {
            amount: release.amount,
            releasedAt: Number(release.timestamp),
          },
        });
    }

    skip += BATCH_SIZE;
    if (releases.length < BATCH_SIZE) break;
  }

  return { eventsProcessed, ipfsFetched: 0 };
}

async function syncDisputes(): Promise<SyncResult> {
  let eventsProcessed = 0;
  let skip = 0;

  while (true) {
    const disputeList = await fetchDisputes(BATCH_SIZE, skip);
    if (disputeList.length === 0) break;

    for (const dispute of disputeList) {
      eventsProcessed++;

      const db = getDb();
      const disputeId = Number(dispute.id);

      const voteCount = dispute.votes.length;
      let upholdVotes = 0;
      let overturnVotes = 0;
      for (const vote of dispute.votes) {
        if (vote.voteUphold) {
          upholdVotes++;
        } else {
          overturnVotes++;
        }
      }

      const statusMap: Record<number, string> = {
        0: "open",
        1: "upheld",
        2: "overturned",
      };

      await db
        .insert(disputes)
        .values({
          id: disputeId,
          proposalId: dispute.proposal?.id ?? "",
          initiatorAddress: dispute.initiator,
          stakeAmount: dispute.stakeAmount,
          evidenceCid: dispute.evidenceCid,
          status: statusMap[dispute.status] ?? "open",
          newScore: dispute.newScore ? dispute.newScore / SCORE_PRECISION : null,
          deadline: Number(dispute.deadline),
          voteCount,
          upholdVotes,
          overturnVotes,
        })
        .onConflictDoUpdate({
          target: disputes.id,
          set: {
            status: statusMap[dispute.status] ?? "open",
            newScore: dispute.newScore ? dispute.newScore / SCORE_PRECISION : null,
            voteCount,
            upholdVotes,
            overturnVotes,
          },
        });
    }

    skip += BATCH_SIZE;
    if (disputeList.length < BATCH_SIZE) break;
  }

  return { eventsProcessed, ipfsFetched: 0 };
}

async function recomputeFundingRoundStats(): Promise<void> {
  const db = getDb();

  const rounds = await db
    .selectDistinct({ fundingRoundId: proposals.fundingRoundId })
    .from(proposals);

  for (const round of rounds) {
    const stats = await db
      .select({
        proposalCount: sql<number>`count(*)`,
        evaluatedCount: sql<number>`count(${proposals.evaluatedAt})`,
        averageScore: sql<number>`avg(${proposals.finalScore})`,
      })
      .from(proposals)
      .where(eq(proposals.fundingRoundId, round.fundingRoundId));

    const stat = stats[0];
    if (!stat) continue;

    await db
      .insert(fundingRoundStats)
      .values({
        fundingRoundId: round.fundingRoundId,
        proposalCount: stat.proposalCount,
        evaluatedCount: stat.evaluatedCount,
        averageScore: stat.averageScore,
      })
      .onConflictDoUpdate({
        target: fundingRoundStats.fundingRoundId,
        set: {
          proposalCount: stat.proposalCount,
          evaluatedCount: stat.evaluatedCount,
          averageScore: stat.averageScore,
        },
      });
  }
}
