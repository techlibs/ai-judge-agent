import { NextResponse } from "next/server";
import { getDb } from "@/cache/client";
import { sql } from "drizzle-orm";
import { publicClient } from "@/chain/contracts";

interface HealthCheck {
  readonly status: "ok" | "error";
  readonly latencyMs?: number;
  readonly error?: string;
}

interface HealthResponse {
  readonly healthy: boolean;
  readonly checks: {
    readonly db: HealthCheck;
    readonly ipfs: HealthCheck;
    readonly chain: HealthCheck;
  };
}

async function checkDb(): Promise<HealthCheck> {
  const start = performance.now();
  try {
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

async function checkIpfs(): Promise<HealthCheck> {
  const start = performance.now();
  const gateway = process.env.PINATA_GATEWAY;
  if (!gateway) {
    return { status: "ok", latencyMs: 0, error: "PINATA_GATEWAY not configured (non-critical)" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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

async function checkChain(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    await publicClient.getBlockNumber();
    return { status: "ok", latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [db, ipfs, chain] = await Promise.all([
    checkDb(),
    checkIpfs(),
    checkChain(),
  ]);

  const allCriticalOk = db.status === "ok" && chain.status === "ok";

  const response: HealthResponse = {
    healthy: allCriticalOk,
    checks: { db, ipfs, chain },
  };

  return NextResponse.json(response, { status: 200 });
}
