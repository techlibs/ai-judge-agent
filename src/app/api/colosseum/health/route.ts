import { checkHealth } from "@/lib/colosseum/client";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const result = await checkHealth();

  const status = result.healthy ? 200 : 503;

  return Response.json(
    {
      service: "colosseum-copilot",
      healthy: result.healthy,
      message: result.message,
      checkedAt: new Date().toISOString(),
    },
    { status },
  );
}
