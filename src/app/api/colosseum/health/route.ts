import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { checkColosseumHealth } = await import("@/lib/colosseum/client");
    const health = await checkColosseumHealth();
    const statusCode = health.status === "healthy" ? 200 : 503;
    return NextResponse.json(
      {
        service: "colosseum-copilot",
        status: health.status,
        details: health.details,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode },
    );
  } catch {
    return NextResponse.json(
      {
        service: "colosseum-copilot",
        status: "unavailable",
        details: null,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
