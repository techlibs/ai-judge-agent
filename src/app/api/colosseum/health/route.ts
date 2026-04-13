import { NextResponse } from "next/server";
import { checkColosseumHealth } from "@/lib/colosseum/client";

export async function GET() {
  const health = await checkColosseumHealth();

  const statusCode = health.status === "healthy" ? 200 : 503;

  return NextResponse.json(
    {
      service: "colosseum-copilot",
      status: health.status,
      details: health.details,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
