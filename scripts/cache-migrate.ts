#!/usr/bin/env bun
/**
 * cache:migrate — Push Drizzle schema to Turso/LibSQL.
 * Usage: bun run scripts/cache-migrate.ts
 */

import { migrate } from "drizzle-orm/libsql/migrator";
import { getDb } from "@/cache/client";

async function main() {
  console.log("[cache:migrate] Pushing schema to database...");
  const start = performance.now();

  const db = getDb();

  await migrate(db, {
    migrationsFolder: "./drizzle",
  });

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`[cache:migrate] Schema push complete in ${elapsed}s`);
}

main().catch((error) => {
  console.error("[cache:migrate] Fatal error:", error);
  process.exit(1);
});
