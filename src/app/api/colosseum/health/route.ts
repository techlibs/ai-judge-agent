import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { checkColosseumHealth } = await import("@/lib/colosseum/client");
    const health = await checkColosseumHealth();
    const statusCode = health.status === "healthy" ? 200 : 503;
    return NextResponse.json(health, { status: statusCode });
  } catch {
    return NextResponse.json(
      { status: "unavailable", message: "Colosseum client failed to load" },
      { status: 503 },
    );
  }
}
