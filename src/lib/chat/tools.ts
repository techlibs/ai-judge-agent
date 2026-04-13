import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DIMENSION_LABELS, type JudgeDimension } from "@/lib/constants";

export const getProposalData = createTool({
  id: "get-proposal-data",
  description:
    "Retrieves the full proposal details for a given proposal ID, including title, description, problem statement, solution, team, budget, and timeline.",
  inputSchema: z.object({
    proposalId: z.string().describe("The unique ID of the proposal to retrieve"),
  }),
  execute: async (inputData) => {
    const db = getDb();
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, inputData.proposalId),
    });

    if (!proposal) {
      return { found: false, message: `No proposal found with ID ${inputData.proposalId}` };
    }

    return {
      found: true,
      proposal: {
        id: proposal.id,
        title: proposal.title,
        description: proposal.description,
        problemStatement: proposal.problemStatement,
        proposedSolution: proposal.proposedSolution,
        teamMembers: proposal.teamMembers,
        budgetAmount: proposal.budgetAmount,
        budgetBreakdown: proposal.budgetBreakdown,
        timeline: proposal.timeline,
        category: proposal.category,
        residencyDuration: proposal.residencyDuration,
        demoDayDeliverable: proposal.demoDayDeliverable,
        communityContribution: proposal.communityContribution,
        priorIpeParticipation: proposal.priorIpeParticipation,
        links: proposal.links,
        status: proposal.status,
      },
    };
  },
});

export const getEvaluationScores = createTool({
  id: "get-evaluation-scores",
  description:
    "Retrieves all judge evaluation scores and justifications for a given proposal, including per-dimension scores, confidence, recommendations, key findings, risks, and IPE alignment scores.",
  inputSchema: z.object({
    proposalId: z.string().describe("The unique ID of the proposal to get evaluations for"),
  }),
  execute: async (inputData) => {
    const db = getDb();
    const evals = await db.query.evaluations.findMany({
      where: eq(evaluations.proposalId, inputData.proposalId),
    });

    const aggregate = await db.query.aggregateScores.findFirst({
      where: eq(aggregateScores.proposalId, inputData.proposalId),
    });

    if (evals.length === 0) {
      return {
        found: false,
        message: `No evaluations found for proposal ${inputData.proposalId}. The proposal may not have been evaluated yet.`,
      };
    }

    const dimensionResults = evals.map((evaluation) => ({
      dimension: evaluation.dimension,
      dimensionLabel: DIMENSION_LABELS[evaluation.dimension as JudgeDimension] ?? evaluation.dimension,
      score: evaluation.score,
      confidence: evaluation.confidence,
      recommendation: evaluation.recommendation,
      justification: evaluation.justification,
      keyFindings: evaluation.keyFindings,
      risks: evaluation.risks,
      ipeAlignment: {
        proTechnology: evaluation.ipeAlignmentTech,
        proFreedom: evaluation.ipeAlignmentFreedom,
        proHumanProgress: evaluation.ipeAlignmentProgress,
      },
      status: evaluation.status,
      qualityFlag: evaluation.qualityFlag,
      qualityScores: evaluation.qualityScores,
    }));

    return {
      found: true,
      aggregateScore: aggregate ? aggregate.scoreBps : null,
      dimensions: dimensionResults,
    };
  },
});

export const searchProposals = createTool({
  id: "search-proposals",
  description:
    "Lists all proposals in the system with their status and aggregate scores. Useful for comparing proposals or finding projects by name.",
  inputSchema: z.object({
    status: z
      .enum(["pending", "evaluating", "evaluated", "publishing", "published", "failed"])
      .optional()
      .describe("Filter by proposal status. Omit to return all proposals."),
  }),
  execute: async (inputData) => {
    const db = getDb();

    const allProposals = inputData.status
      ? await db.query.proposals.findMany({
          where: eq(proposals.status, inputData.status),
        })
      : await db.query.proposals.findMany();

    if (allProposals.length === 0) {
      return { found: false, message: "No proposals found matching the criteria." };
    }

    const allAggregates = await db.query.aggregateScores.findMany();
    const aggregateMap = new Map(allAggregates.map((a) => [a.proposalId, a.scoreBps]));

    const results = allProposals.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      status: p.status,
      budgetAmount: p.budgetAmount,
      aggregateScore: aggregateMap.get(p.id) ?? null,
    }));

    return { found: true, proposals: results, count: results.length };
  },
});

export const chatTools = {
  getProposalData,
  getEvaluationScores,
  searchProposals,
};
