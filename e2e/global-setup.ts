import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { cleanupTestData } from "./helpers/db-fixtures";

export default async function globalSetup() {
  const dbUrl = process.env.TURSO_DATABASE_URL ?? "file:local.db";
  const client = createClient({ url: dbUrl });
  const db = drizzle(client);

  await db.run(sql`CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    proposed_solution TEXT NOT NULL,
    team_members TEXT NOT NULL,
    budget_amount INTEGER NOT NULL,
    budget_breakdown TEXT NOT NULL,
    timeline TEXT NOT NULL,
    category TEXT NOT NULL,
    residency_duration TEXT NOT NULL,
    demo_day_deliverable TEXT NOT NULL,
    community_contribution TEXT NOT NULL,
    prior_ipe_participation INTEGER NOT NULL,
    links TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ipfs_cid TEXT,
    chain_token_id INTEGER,
    chain_tx_hash TEXT,
    created_at INTEGER NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL REFERENCES proposals(id),
    dimension TEXT NOT NULL,
    score INTEGER,
    score_decimals INTEGER DEFAULT 2,
    confidence TEXT,
    recommendation TEXT,
    justification TEXT,
    key_findings TEXT,
    risks TEXT,
    ipe_alignment_tech INTEGER,
    ipe_alignment_freedom INTEGER,
    ipe_alignment_progress INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    ipfs_cid TEXT,
    feedback_tx_hash TEXT,
    model TEXT,
    prompt_version TEXT,
    started_at INTEGER,
    completed_at INTEGER
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS aggregate_scores (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL REFERENCES proposals(id),
    score_bps INTEGER NOT NULL,
    ipfs_cid TEXT,
    chain_tx_hash TEXT,
    computed_at INTEGER NOT NULL
  )`);

  client.close();
  await cleanupTestData();
}
