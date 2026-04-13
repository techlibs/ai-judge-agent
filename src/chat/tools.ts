import { tool } from "ai";
import { z } from "zod";
import { getProposalById, listProposals } from "@/cache/queries";

const getProposalData = tool({
  description:
    "Retrieve full proposal data including title, description, budget, team size, category, and verification links. Use this when the user asks about a specific proposal's content.",
  parameters: z.object({
    proposalId: z
      .string()
      .describe("The proposal ID to retrieve data for"),
  }),
  execute: async ({ proposalId }) => {
    const proposal = await getProposalById(proposalId);
    if (!proposal) {
      return { error: "Proposal not found", proposalId };
    }

    return {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      category: proposal.category,
      budgetAmount: proposal.budgetAmount,
      budgetCurrency: proposal.budgetCurrency,
      technicalDescription: proposal.technicalDescription,
      teamSize: proposal.teamSize,
      status: proposal.status,
      submittedAt: proposal.submittedAt,
      evaluatedAt: proposal.evaluatedAt,
      proposalContentCid: proposal.proposalContentCid,
      evaluationContentCid: proposal.evaluationContentCid,
    };
  },
});

const getEvaluationScores = tool({
  description:
    "Retrieve evaluation scores and judge reasoning for a proposal. Returns the final score, adjusted score, reputation multiplier, and all dimension scores with full reasoning chains. Use this when the user asks about scores, evaluations, or why a judge scored something a certain way.",
  parameters: z.object({
    proposalId: z
      .string()
      .describe("The proposal ID to retrieve evaluation scores for"),
  }),
  execute: async ({ proposalId }) => {
    const proposal = await getProposalById(proposalId);
    if (!proposal) {
      return { error: "Proposal not found", proposalId };
    }

    if (proposal.finalScore === null) {
      return {
        error: "Proposal has not been evaluated yet",
        proposalId,
      };
    }

    return {
      proposalId: proposal.id,
      title: proposal.title,
      finalScore: proposal.finalScore,
      adjustedScore: proposal.adjustedScore,
      reputationMultiplier: proposal.reputationMultiplier,
      dimensions: proposal.dimensions.map((dim) => ({
        dimension: dim.dimension,
        weight: dim.weight,
        score: dim.score,
        reasoningChain: dim.reasoningChain,
        rubricApplied: dim.rubricApplied,
        inputDataConsidered: dim.inputDataConsidered,
        modelId: dim.modelId,
        promptVersion: dim.promptVersion,
      })),
      disputes: proposal.disputes.map((d) => ({
        id: d.id,
        status: d.status,
        newScore: d.newScore,
      })),
    };
  },
});

const searchProposals = tool({
  description:
    "Search across all evaluated proposals. Use this when the user wants to compare proposals, find proposals by category, or explore the broader set of evaluated grants.",
  parameters: z.object({
    search: z
      .string()
      .optional()
      .describe("Search term to filter proposals by title or description"),
    category: z
      .string()
      .optional()
      .describe("Filter by proposal category"),
    status: z
      .string()
      .optional()
      .describe("Filter by status (e.g., pending, evaluated)"),
    page: z
      .number()
      .optional()
      .describe("Page number for pagination (default 1)"),
  }),
  execute: async ({ search, status, page }) => {
    const result = await listProposals({
      search,
      status,
      page: page ?? 1,
      pageSize: 10,
    });

    return {
      proposals: result.data.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        budgetAmount: p.budgetAmount,
        budgetCurrency: p.budgetCurrency,
        finalScore: p.finalScore,
        adjustedScore: p.adjustedScore,
        status: p.status,
      })),
      pagination: result.pagination,
    };
  },
});

export { getProposalData, getEvaluationScores, searchProposals };
