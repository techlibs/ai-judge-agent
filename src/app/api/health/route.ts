import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

interface CheckResult {
  readonly status: "ok" | "error" | "unconfigured";
  readonly latencyMs: number;
  readonly error?: string;
}

async function checkDb(): Promise<CheckResult> {
  const start = performance.now();
  try {
    const { getDb } = await import("@/lib/db/client");
    const db = getDb();
    await db.run(sql`SELECT 1`);
    return { status: "ok", latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkIpfs(): Promise<CheckResult> {
  const start = performance.now();
  const gateway = process.env.PINATA_GATEWAY;
  if (!gateway) {
    return { status: "unconfigured", latencyMs: 0 };
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    const response = await fetch(`https://${gateway}`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return {
      status: response.ok || response.status === 405 ? "ok" : "error",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [db, ipfs] = await Promise.all([checkDb(), checkIpfs()]);
  const allOk = db.status === "ok" && (ipfs.status === "ok" || ipfs.status === "unconfigured");
  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", timestamp: new Date().toISOString(), checks: { db, ipfs } },
    { status: 200 },
  );
}
