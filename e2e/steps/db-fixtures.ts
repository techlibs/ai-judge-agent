import { createBdd } from "playwright-bdd";
import type { DataTable } from "@cucumber/cucumber";
import {
  seedProposal,
  seedEvaluation,
  seedAggregate,
  seedPublishedProposal,
  cleanupTestData,
} from "../helpers/db-fixtures";
import { setLastProposalId } from "../helpers/test-state";

const { Given: given } = createBdd();

let lastProposalId: string | undefined;

function track(id: string) {
  lastProposalId = id;
  setLastProposalId(id);
}

async function freshStart() {
  await cleanupTestData();
  lastProposalId = undefined;
  setLastProposalId(undefined);
}

// --- No data ---

given("no proposals exist", async () => {
  await freshStart();
});

// --- Single proposal fixtures ---

given("a pending proposal exists", async () => {
  await freshStart();
  track(await seedProposal({ status: "pending", title: "Test Pending Proposal" }));
});

given("a pending proposal {string} in category {string}", async ({}, title: string, category: string) => {
  await freshStart();
  track(await seedProposal({ title, category, status: "pending" }));
});

given("a pending proposal exists with:", async ({}, dataTable: DataTable) => {
  await freshStart();
  const data = Object.fromEntries(dataTable.rows());
  track(await seedProposal({
    title: data.title ?? "Test Proposal",
    description: data.description,
    problemStatement: data.problemStatement,
    proposedSolution: data.proposedSolution,
    budgetAmount: data.budgetAmount ? Number(data.budgetAmount) : undefined,
    budgetBreakdown: data.budgetBreakdown,
    timeline: data.timeline,
    category: data.category ?? "research",
    status: "pending",
  }));
});

given("a published proposal {string} exists", async ({}, title: string) => {
  await freshStart();
  track(await seedPublishedProposal({ title }));
});

given(
  "a published proposal {string} in category {string} with score {int}",
  async ({}, title: string, category: string, score: number) => {
    await freshStart();
    track(await seedPublishedProposal({ title, category, scores: { tech: score, impact: score, cost: score, team: score } }));
  },
);

given("a published proposal {string} with on-chain data exists", async ({}, title: string) => {
  await freshStart();
  track(await seedPublishedProposal({ title }));
});

given("a proposal with status {string}", async ({}, status: string) => {
  await freshStart();
  track(await seedProposal({ title: `Test ${status} Proposal`, status: status as "pending" | "evaluating" | "evaluated" | "publishing" | "published" | "failed" }));
});

given("a proposal with status {string} exists", async ({}, status: string) => {
  await freshStart();
  track(await seedProposal({ title: `Test ${status} Proposal`, status: status as "pending" | "evaluating" | "evaluated" | "publishing" | "published" | "failed" }));
});

given("a proposal in {string} status exists", async ({}, status: string) => {
  await freshStart();
  track(await seedProposal({ title: `Test ${status} Proposal`, status: status as "pending" | "evaluating" | "evaluated" | "publishing" | "published" | "failed" }));
});

given("a published proposal exists", async () => {
  await freshStart();
  track(await seedPublishedProposal());
});

// --- Proposals with evaluations ---

given("a published proposal exists with 4 completed evaluations:", async ({}, dataTable: DataTable) => {
  await freshStart();
  const id = await seedProposal({ title: "Evaluated Proposal", status: "published" });
  const rows = dataTable.rows();
  for (const [dimension, score, recommendation, confidence] of rows) {
    await seedEvaluation({
      proposalId: id,
      dimension: dimension as "tech" | "impact" | "cost" | "team",
      score: Number(score),
      recommendation: recommendation as "strong_fund" | "fund" | "conditional" | "reject",
      confidence: confidence as "high" | "medium" | "low",
      justification: `Assessment for ${dimension}`,
      keyFindings: [`Finding for ${dimension}`],
      risks: [`Risk for ${dimension}`],
      status: "complete",
    });
  }
  const scores = Object.fromEntries(rows.map(([d, s]: string[]) => [d, Number(s)]));
  const weighted = Math.round((scores.tech ?? 0) * 0.25 + (scores.impact ?? 0) * 0.30 + (scores.cost ?? 0) * 0.20 + (scores.team ?? 0) * 0.25);
  await seedAggregate({ proposalId: id, scoreBps: weighted });
  track(id);
});

given("a published proposal with a completed {string} evaluation:", async ({}, dimension: string, dataTable: DataTable) => {
  await freshStart();
  const data = Object.fromEntries(dataTable.rows());
  const id = await seedProposal({ title: "Proposal with eval", status: "published" });
  await seedEvaluation({
    proposalId: id,
    dimension: dimension as "tech" | "impact" | "cost" | "team",
    score: Number(data.score),
    recommendation: data.recommendation as "strong_fund" | "fund" | "conditional" | "reject",
    confidence: data.confidence as "high" | "medium" | "low",
    justification: data.justification ?? `Test justification for ${dimension}`,
    keyFindings: data.keyFindings ? [data.keyFindings] : [`Finding for ${dimension}`],
    risks: data.risks ? [data.risks] : [`Risk for ${dimension}`],
    status: "complete",
  });
  track(id);
});

given("a published proposal with a completed {string} evaluation with IPE alignment:", async ({}, dimension: string, dataTable: DataTable) => {
  await freshStart();
  const data = Object.fromEntries(dataTable.rows());
  const id = await seedProposal({ title: "Proposal with IPE alignment", status: "published" });
  await seedEvaluation({
    proposalId: id,
    dimension: dimension as "tech" | "impact" | "cost" | "team",
    score: 7500,
    recommendation: "fund",
    confidence: "high",
    justification: "Good evaluation",
    status: "complete",
    ipeAlignmentTech: Number(data.proTechnology ?? 0),
    ipeAlignmentFreedom: Number(data.proFreedom ?? 0),
    ipeAlignmentProgress: Number(data.proHumanProgress ?? 0),
  });
  track(id);
});

given("a published proposal with evaluations:", async ({}, dataTable: DataTable) => {
  await freshStart();
  const id = await seedProposal({ title: "Proposal with weighted evals", status: "published" });
  const rows = dataTable.rows();
  for (const [dimension, score] of rows) {
    await seedEvaluation({ proposalId: id, dimension: dimension as "tech" | "impact" | "cost" | "team", score: Number(score), status: "complete", recommendation: "fund", confidence: "high" });
  }
  track(id);
});

given("the aggregate score is {int}", async ({}, scoreBps: number) => {
  if (lastProposalId) {
    await seedAggregate({ proposalId: lastProposalId, scoreBps });
  }
});

given("a published proposal with all 4 evaluations completed", async () => {
  await freshStart();
  track(await seedPublishedProposal());
});

// --- On-chain verification fixtures ---

given("a published proposal with chain data:", async ({}, dataTable: DataTable) => {
  await freshStart();
  const data = Object.fromEntries(dataTable.rows());
  track(await seedProposal({
    title: "Chain Data Proposal",
    status: "published",
    chainTokenId: Number(data.chainTokenId ?? 42),
    chainTxHash: data.chainTxHash ?? "0xabc123",
    ipfsCid: data.ipfsCid ?? "QmTest123",
  }));
});

given("a published proposal with 4 on-chain evaluations:", async ({}, dataTable: DataTable) => {
  await freshStart();
  const id = await seedProposal({ title: "On-chain Eval Proposal", status: "published", chainTokenId: 42, chainTxHash: "0xregistration123", ipfsCid: "QmProposal123" });
  const rows = dataTable.rows();
  for (const [dimension, feedbackTxHash, ipfsCid, model, promptVersion] of rows) {
    await seedEvaluation({ proposalId: id, dimension: dimension as "tech" | "impact" | "cost" | "team", score: 7500, status: "complete", feedbackTxHash, ipfsCid, model, promptVersion, recommendation: "fund", confidence: "high" });
  }
  track(id);
});

given("a published proposal with feedback transactions", async () => {
  await freshStart();
  track(await seedPublishedProposal());
});

given("a published proposal with IPFS-pinned evaluations", async () => {
  await freshStart();
  track(await seedPublishedProposal());
});

given("a published proposal with evaluation IPFS data", async () => {
  await freshStart();
  track(await seedPublishedProposal());
});

// --- Multiple proposals ---

given("the following proposals exist:", async ({}, dataTable: DataTable) => {
  await freshStart();
  const rows = dataTable.rows();
  for (const row of rows) {
    const [title, category, status, aggregateScore] = row;
    const id = await seedProposal({ title, category, status: status as "pending" | "published" });
    if (aggregateScore) {
      await seedAggregate({ proposalId: id, scoreBps: Number(aggregateScore) });
    }
  }
});

given("the following proposals exist in order:", async ({}, dataTable: DataTable) => {
  await freshStart();
  const rows = dataTable.rows();
  for (const [title, createdAt] of rows) {
    await seedProposal({ title, createdAt: new Date(createdAt) });
  }
});
