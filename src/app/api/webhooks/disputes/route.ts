import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateApiKey, verifyWebhookSignature } from "@/lib/api-key";
import { getRequestId } from "@/lib/request-id";
import { pinJsonToIpfs } from "@/ipfs/pin";
import { DisputeEvidenceSchema } from "@/ipfs/schemas";
import { computeProposalId } from "@/chain/evaluation-registry";
import { prepareOpenDispute } from "@/chain/dispute-registry";

const MAX_BODY_SIZE = 256 * 1024;

const DisputeWebhookSchema = z.object({
  externalId: z.string().min(1).max(200),
  platformSource: z.string().min(1).max(100),
  proposalExternalId: z.string().min(1).max(200),
  disputeReason: z.string().min(100).max(10000),
  evidence: z
    .array(
      z.object({
        type: z.enum(["text", "link", "document"]),
        content: z.string().min(1).max(5000),
        description: z.string().min(1).max(500),
      })
    )
    .min(1)
    .max(20),
  stakeAmount: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid or missing API key" },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  const keyValidation = await validateApiKey(apiKey);
  if (!keyValidation.valid) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid or missing API key" },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: "PAYLOAD_TOO_LARGE" },
      { status: 413, headers: { "x-request-id": requestId } }
    );
  }

  const rawBody = await request.text();

  if (rawBody.length > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: "PAYLOAD_TOO_LARGE" },
      { status: 413, headers: { "x-request-id": requestId } }
    );
  }

  const signature = request.headers.get("X-Signature-256");
  if (signature && keyValidation.webhookSecret) {
    const signatureValid = await verifyWebhookSignature(
      rawBody,
      signature,
      keyValidation.webhookSecret
    );
    if (!signatureValid) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid webhook signature" },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: [{ path: [], message: "Invalid JSON" }] },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  const validation = DisputeWebhookSchema.safeParse(parsedBody);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        details: validation.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  const disputeData = validation.data;
  const proposalId = computeProposalId(
    disputeData.platformSource,
    disputeData.proposalExternalId
  );

  const evidenceContent = {
    version: 1 as const,
    proposalId,
    disputeReason: disputeData.disputeReason,
    evidence: disputeData.evidence,
    submittedAt: new Date().toISOString(),
  };

  const evidenceCid = await pinJsonToIpfs(
    DisputeEvidenceSchema,
    evidenceContent
  );

  const encodedData = prepareOpenDispute(proposalId, evidenceCid);

  return NextResponse.json(
    {
      proposalId,
      evidenceCid,
      encodedTransaction: encodedData,
      stakeAmount: disputeData.stakeAmount,
      message: "Dispute evidence pinned to IPFS. Submit the encoded transaction on-chain with the specified stake.",
    },
    { status: 201, headers: { "x-request-id": requestId } }
  );
}
