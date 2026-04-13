#!/usr/bin/env bun
/**
 * cache:sync — Incrementally sync the local SQLite cache from Graph + IPFS.
 * Usage: bun run scripts/cache-sync.ts
 */

import { syncCache } from "@/cache/sync";

async function main() {
  console.log("[cache:sync] Starting incremental cache sync...");
  const start = performance.now();

  const result = await syncCache();

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(
    `[cache:sync] Done in ${elapsed}s — ${result.eventsProcessed} events processed, ${result.ipfsFetched} IPFS documents fetched`
  );
}

main().catch((error) => {
  console.error("[cache:sync] Fatal error:", error);
  process.exit(1);
});
