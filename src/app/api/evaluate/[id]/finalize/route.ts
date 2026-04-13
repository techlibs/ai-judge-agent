import { NextResponse, type NextRequest } from "next/server";
import { getRequestId } from "@/lib/request-id";
import { getEvaluationJob } from "@/cache/queries";
import { getProposalById } from "@/cache/queries";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);
  const { id } = await params;

  const proposal = await getProposalById(id);
  if (!proposal) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Proposal not found" },
      { status: 404, headers: { "x-request-id": requestId } }
    );
  }

  if (proposal.evaluationContentCid) {
    return NextResponse.json(
      {
        error: "ALREADY_FINALIZED",
        message: "Evaluation already published for this proposal",
      },
      { status: 409, headers: { "x-request-id": requestId } }
    );
  }

  const job = await getEvaluationJob(id);
  if (!job || job.status !== "complete") {
    return NextResponse.json(
      {
        error: "NOT_READY",
        message: "Evaluation is not yet complete",
      },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  return NextResponse.json(
    {
      proposalId: id,
      evaluationContentCid: proposal.evaluationContentCid,
      status: "published",
    },
    { status: 200, headers: { "x-request-id": requestId } }
  );
}
