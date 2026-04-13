import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import * as schema from "../src/cache/schema";
import { readFileSync } from "fs";
import { resolve } from "path";
import { seedTestData } from "./fixtures/seed-data";

/**
 * Playwright global setup: loads .env.test and creates SQLite tables
 * so the Next.js dev server can start without errors.
 */
export default async function globalSetup() {
  // Load .env.test into process.env for the dev server
  const envPath = resolve(__dirname, "../.env.test");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    process.env[key] = value;
  }

  // Create DB and tables using raw SQL (drizzle push equivalent)
  const dbUrl = process.env.TURSO_DATABASE_URL ?? "file:./test.db";
  const client = createClient({ url: dbUrl });
  const db = drizzle(client, { schema });

  await db.run(sql`CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    funding_round_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    platform_source TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget_amount REAL NOT NULL,
    budget_currency TEXT NOT NULL,
    technical_description TEXT NOT NULL,
    team_profile_hash TEXT NOT NULL,
    team_size INTEGER NOT NULL,
    category TEXT NOT NULL,
    proposal_content_cid TEXT,
    evaluation_content_cid TEXT,
    final_score REAL,
    adjusted_score REAL,
    reputation_multiplier REAL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TEXT NOT NULL,
    evaluated_at TEXT,
    chain_timestamp INTEGER
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS dimension_scores (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL REFERENCES proposals(id),
    dimension TEXT NOT NULL,
    weight REAL NOT NULL,
    score REAL NOT NULL,
    reasoning_chain TEXT NOT NULL,
    input_data_considered TEXT NOT NULL,
    rubric_applied TEXT NOT NULL,
    model_id TEXT NOT NULL,
    prompt_version TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS fund_releases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    milestone_index INTEGER NOT NULL,
    score REAL NOT NULL,
    release_percentage REAL NOT NULL,
    amount TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    released_at INTEGER NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS agents (
    agent_id INTEGER PRIMARY KEY,
    owner TEXT NOT NULL,
    agent_uri TEXT NOT NULL,
    name TEXT,
    description TEXT,
    scoring_dimension TEXT,
    prompt_version TEXT,
    feedback_count INTEGER DEFAULT 0,
    feedback_summary_value REAL,
    validation_score INTEGER,
    registered_at INTEGER NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS agent_feedback (
    id TEXT PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    client_address TEXT NOT NULL,
    feedback_index INTEGER NOT NULL,
    value REAL NOT NULL,
    tag1 TEXT,
    tag2 TEXT,
    feedback_cid TEXT,
    is_revoked INTEGER DEFAULT 0,
    timestamp INTEGER NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY,
    proposal_id TEXT NOT NULL,
    initiator_address TEXT NOT NULL,
    stake_amount TEXT NOT NULL,
    evidence_cid TEXT NOT NULL,
    status TEXT NOT NULL,
    new_score REAL,
    deadline INTEGER NOT NULL,
    resolved_at INTEGER,
    vote_count INTEGER DEFAULT 0,
    uphold_votes INTEGER DEFAULT 0,
    overturn_votes INTEGER DEFAULT 0
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS funding_round_stats (
    funding_round_id TEXT PRIMARY KEY,
    proposal_count INTEGER DEFAULT 0,
    evaluated_count INTEGER DEFAULT 0,
    average_score REAL,
    total_funds_released TEXT DEFAULT '0',
    dispute_count INTEGER DEFAULT 0
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS platform_integrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    webhook_secret TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS evaluation_jobs (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    error TEXT
  )`);

  // Create indexes
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_proposals_funding_round ON proposals(funding_round_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_proposals_chain_timestamp ON proposals(chain_timestamp)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_proposals_category ON proposals(category)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dimension_scores_proposal ON dimension_scores(proposal_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_disputes_proposal ON disputes(proposal_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)`);

  client.close();

  // Seed test data into the database
  await seedTestData(dbUrl);
}
