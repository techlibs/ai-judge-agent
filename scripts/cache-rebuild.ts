#!/usr/bin/env bun
/**
 * cache:rebuild — Drop and rebuild the local SQLite cache from scratch.
 * Usage: bun run scripts/cache-rebuild.ts
 */

import { getDb } from "@/cache/client";
import {
  proposals,
  dimensionScores,
  fundReleases,
  agents,
  agentFeedback,
  disputes,
  fundingRoundStats,
  evaluationJobs,
} from "@/cache/schema";
import { syncCache } from "@/cache/sync";
import { sql } from "drizzle-orm";

const TABLES = [
  evaluationJobs,
  fundingRoundStats,
  disputes,
  agentFeedback,
  agents,
  fundReleases,
  dimensionScores,
  proposals,
];

async function main() {
  console.log("[cache:rebuild] Clearing all cache tables...");
  const db = getDb();

  for (const table of TABLES) {
    await db.delete(table).where(sql`1=1`);
  }

  console.log("[cache:rebuild] Tables cleared. Starting full sync...");
  const start = performance.now();

  const result = await syncCache();

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(
    `[cache:rebuild] Done in ${elapsed}s — ${result.eventsProcessed} events processed, ${result.ipfsFetched} IPFS documents fetched`
  );
}

main().catch((error) => {
  console.error("[cache:rebuild] Fatal error:", error);
  process.exit(1);
});
