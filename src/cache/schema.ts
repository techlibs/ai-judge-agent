import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  fundingRoundId: text("funding_round_id").notNull(),
  externalId: text("external_id").notNull(),
  platformSource: text("platform_source").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budgetAmount: real("budget_amount").notNull(),
  budgetCurrency: text("budget_currency").notNull(),
  technicalDescription: text("technical_description").notNull(),
  teamProfileHash: text("team_profile_hash").notNull(),
  teamSize: integer("team_size").notNull(),
  category: text("category").notNull(),
  proposalContentCid: text("proposal_content_cid"),
  evaluationContentCid: text("evaluation_content_cid"),
  finalScore: real("final_score"),
  adjustedScore: real("adjusted_score"),
  reputationMultiplier: real("reputation_multiplier"),
  status: text("status").notNull().default("pending"),
  submittedAt: text("submitted_at").notNull(),
  evaluatedAt: text("evaluated_at"),
  chainTimestamp: integer("chain_timestamp"),
}, (table) => [
  index("idx_proposals_funding_round").on(table.fundingRoundId),
  index("idx_proposals_status").on(table.status),
  index("idx_proposals_chain_timestamp").on(table.chainTimestamp),
  index("idx_proposals_category").on(table.category),
]);

export const dimensionScores = sqliteTable("dimension_scores", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id")
    .notNull()
    .references(() => proposals.id),
  dimension: text("dimension").notNull(),
  weight: real("weight").notNull(),
  score: real("score").notNull(),
  reasoningChain: text("reasoning_chain").notNull(),
  inputDataConsidered: text("input_data_considered").notNull(),
  rubricApplied: text("rubric_applied").notNull(),
  modelId: text("model_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
}, (table) => [
  index("idx_dimension_scores_proposal").on(table.proposalId),
]);

export const fundReleases = sqliteTable("fund_releases", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  milestoneIndex: integer("milestone_index").notNull(),
  score: real("score").notNull(),
  releasePercentage: real("release_percentage").notNull(),
  amount: text("amount").notNull(),
  txHash: text("tx_hash").notNull(),
  releasedAt: integer("released_at").notNull(),
});

export const agents = sqliteTable("agents", {
  agentId: integer("agent_id").primaryKey(),
  owner: text("owner").notNull(),
  agentURI: text("agent_uri").notNull(),
  name: text("name"),
  description: text("description"),
  scoringDimension: text("scoring_dimension"),
  promptVersion: text("prompt_version"),
  feedbackCount: integer("feedback_count").default(0),
  feedbackSummaryValue: real("feedback_summary_value"),
  validationScore: integer("validation_score"),
  registeredAt: integer("registered_at").notNull(),
});

export const agentFeedback = sqliteTable("agent_feedback", {
  id: text("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientAddress: text("client_address").notNull(),
  feedbackIndex: integer("feedback_index").notNull(),
  value: real("value").notNull(),
  tag1: text("tag1"),
  tag2: text("tag2"),
  feedbackCid: text("feedback_cid"),
  isRevoked: integer("is_revoked").default(0),
  timestamp: integer("timestamp").notNull(),
});

export const disputes = sqliteTable("disputes", {
  id: integer("id").primaryKey(),
  proposalId: text("proposal_id").notNull(),
  initiatorAddress: text("initiator_address").notNull(),
  stakeAmount: text("stake_amount").notNull(),
  evidenceCid: text("evidence_cid").notNull(),
  status: text("status").notNull(),
  newScore: real("new_score"),
  deadline: integer("deadline").notNull(),
  resolvedAt: integer("resolved_at"),
  voteCount: integer("vote_count").default(0),
  upholdVotes: integer("uphold_votes").default(0),
  overturnVotes: integer("overturn_votes").default(0),
}, (table) => [
  index("idx_disputes_proposal").on(table.proposalId),
  index("idx_disputes_status").on(table.status),
]);

export const fundingRoundStats = sqliteTable("funding_round_stats", {
  fundingRoundId: text("funding_round_id").primaryKey(),
  proposalCount: integer("proposal_count").default(0),
  evaluatedCount: integer("evaluated_count").default(0),
  averageScore: real("average_score"),
  totalFundsReleased: text("total_funds_released").default("0"),
  disputeCount: integer("dispute_count").default(0),
});

export const platformIntegrations = sqliteTable("platform_integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  apiKeyHash: text("api_key_hash").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const marketResearch = sqliteTable("market_research", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id")
    .notNull()
    .references(() => proposals.id),
  domainHash: text("domain_hash").notNull(),
  gapType: text("gap_type").notNull(),
  competitorCount: integer("competitor_count").notNull().default(0),
  marketMaturity: text("market_maturity").notNull(),
  rawResponse: text("raw_response").notNull(),
  ipfsCid: text("ipfs_cid"),
  researchedAt: text("researched_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => [
  index("idx_market_research_domain").on(table.domainHash),
  index("idx_market_research_expires").on(table.expiresAt),
  index("idx_market_research_proposal").on(table.proposalId),
]);

export const evaluationJobs = sqliteTable("evaluation_jobs", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id").notNull(),
  status: text("status").notNull().default("pending"),
  retryCount: integer("retry_count").default(0),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  error: text("error"),
});
