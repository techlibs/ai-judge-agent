import { z } from "zod";
import { researchProposal } from "@/lib/colosseum/client";

export const runtime = "nodejs";
export const maxDuration = 45;

const querySchema = z.object({
  domain: z.string().min(1).default("crypto"),
  description: z.string().min(1).max(50000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
): Promise<Response> {
  const { proposalId } = await params;

  if (!proposalId || proposalId.trim().length === 0) {
    return Response.json(
      { error: "proposalId is required" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const domain = url.searchParams.get("domain") ?? "crypto";
  const description = url.searchParams.get("description");

  if (!description) {
    return Response.json(
      { error: "description query parameter is required" },
      { status: 400 },
    );
  }

  const parsed = querySchema.safeParse({ domain, description });
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await researchProposal(parsed.data.domain, parsed.data.description);

  if (result.status === "skipped") {
    return Response.json(
      {
        proposalId,
        research: null,
        reason: result.reason,
        message: result.message,
      },
      { status: 200 },
    );
  }

  return Response.json(
    {
      proposalId,
      research: result.data,
      researchedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
