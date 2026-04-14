export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const { checkHealth } = await import("@/lib/colosseum/client");
    const result = await checkHealth();
    return Response.json(
      {
        service: "colosseum-copilot",
        healthy: result.healthy,
        message: result.message,
        checkedAt: new Date().toISOString(),
      },
      { status: result.healthy ? 200 : 503 },
    );
  } catch {
    return Response.json(
      {
        service: "colosseum-copilot",
        healthy: false,
        message: "Colosseum client unavailable",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
