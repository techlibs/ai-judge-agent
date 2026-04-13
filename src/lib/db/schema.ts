import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  problemStatement: text("problem_statement").notNull(),
  proposedSolution: text("proposed_solution").notNull(),
  teamMembers: text("team_members", { mode: "json" }).notNull().$type<
    Array<{ name: string; role: string }>
  >(),
  budgetAmount: integer("budget_amount").notNull(),
  budgetBreakdown: text("budget_breakdown").notNull(),
  timeline: text("timeline").notNull(),
  category: text("category").notNull(),
  residencyDuration: text("residency_duration").notNull(),
  demoDayDeliverable: text("demo_day_deliverable").notNull(),
  communityContribution: text("community_contribution").notNull(),
  priorIpeParticipation: integer("prior_ipe_participation", { mode: "boolean" }).notNull(),
  links: text("links", { mode: "json" }).notNull().$type<string[]>(),
  status: text("status", {
    enum: ["pending", "evaluating", "evaluated", "publishing", "published", "failed"],
  }).notNull().default("pending"),
  ipfsCid: text("ipfs_cid"),
  chainTokenId: integer("chain_token_id"),
  chainTxHash: text("chain_tx_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const evaluations = sqliteTable("evaluations", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id").notNull().references(() => proposals.id),
  dimension: text("dimension", {
    enum: ["tech", "impact", "cost", "team"],
  }).notNull(),
  score: integer("score"),
  scoreDecimals: integer("score_decimals").default(2),
  confidence: text("confidence", {
    enum: ["high", "medium", "low"],
  }),
  recommendation: text("recommendation", {
    enum: ["strong_fund", "fund", "conditional", "reject"],
  }),
  justification: text("justification"),
  keyFindings: text("key_findings", { mode: "json" }).$type<string[]>(),
  risks: text("risks", { mode: "json" }).$type<string[]>(),
  ipeAlignmentTech: integer("ipe_alignment_tech"),
  ipeAlignmentFreedom: integer("ipe_alignment_freedom"),
  ipeAlignmentProgress: integer("ipe_alignment_progress"),
  status: text("status", {
    enum: ["pending", "streaming", "complete", "failed"],
  }).notNull().default("pending"),
  ipfsCid: text("ipfs_cid"),
  feedbackTxHash: text("feedback_tx_hash"),
  model: text("model"),
  promptVersion: text("prompt_version"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const aggregateScores = sqliteTable("aggregate_scores", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id").notNull().references(() => proposals.id),
  scoreBps: integer("score_bps").notNull(),
  ipfsCid: text("ipfs_cid"),
  chainTxHash: text("chain_tx_hash"),
  computedAt: integer("computed_at", { mode: "timestamp" }).notNull(),
});
