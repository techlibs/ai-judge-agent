import { NextResponse } from "next/server";
import { checkColosseumHealth } from "@/lib/colosseum/client";

export async function GET() {
  const health = await checkColosseumHealth();

  const statusCode = health.status === "healthy" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
