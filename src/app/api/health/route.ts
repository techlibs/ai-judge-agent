import { NextResponse } from "next/server";

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

interface CheckResult {
  readonly status: "ok" | "error" | "unconfigured";
  readonly latencyMs: number;
  readonly error?: string;
}

async function checkChain(): Promise<CheckResult> {
  const start = performance.now();
  try {
    const { getPublicClient } = await import("@/lib/chain/client");
    const client = getPublicClient();
    await client.getBlockNumber();
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
  const [chain, ipfs] = await Promise.all([checkChain(), checkIpfs()]);
  const allOk = chain.status === "ok" && (ipfs.status === "ok" || ipfs.status === "unconfigured");
  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", timestamp: new Date().toISOString(), checks: { chain, ipfs } },
    { status: 200 },
  );
}
