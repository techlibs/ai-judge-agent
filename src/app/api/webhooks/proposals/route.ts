import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateApiKey, verifyWebhookSignature } from "@/lib/api-key";
import { proposalSubmitLimiter, checkRateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/request-id";
import { orchestrateEvaluation, DuplicateEvaluationError } from "@/evaluation/orchestrate";
import { findExistingEvaluationJob } from "@/cache/queries";
import { computeProposalId } from "@/chain/evaluation-registry";

export const maxDuration = 60;

const MAX_BODY_SIZE = 256 * 1024;

const ProposalWebhookSchema = z.object({
  externalId: z.string().min(1).max(200),
  fundingRoundId: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  budgetAmount: z.number().min(0).max(100_000_000),
  budgetCurrency: z.string().max(10),
  budgetBreakdown: z
    .array(
      z.object({
        category: z.string().min(1).max(100),
        amount: z.number().min(0).max(100_000_000),
        description: z.string().min(1).max(500),
      })
    )
    .max(20),
  technicalDescription: z.string().min(1).max(10000),
  teamMembers: z
    .array(
      z.object({
        role: z.string().min(1).max(100),
        experience: z.string().min(1).max(500),
      })
    )
    .max(20),
  category: z.string().min(1).max(100),
  submittedAt: z.string(),
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

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rateLimitResult = await checkRateLimit(proposalSubmitLimiter, ip);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfter: rateLimitResult.retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfter),
          "x-request-id": requestId,
        },
      }
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

  const validation = ProposalWebhookSchema.safeParse(parsedBody);
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

  const proposalData = validation.data;
  const platformSource = keyValidation.platformId ?? "unknown";

  const proposalId = computeProposalId(platformSource, proposalData.externalId);
  const existingJob = await findExistingEvaluationJob(proposalId);
  if (existingJob) {
    return NextResponse.json(
      {
        error: "DUPLICATE_PROPOSAL",
        message: `Proposal with externalId '${proposalData.externalId}' already exists for this platform`,
      },
      { status: 409, headers: { "x-request-id": requestId } }
    );
  }

  try {
    const result = await orchestrateEvaluation({
      ...proposalData,
      platformSource,
    });

    return NextResponse.json(
      {
        proposalId: result.proposalId,
        proposalContentCid: result.proposalContentCid,
        status: "pending",
        message: "Proposal pinned to IPFS and queued for evaluation",
      },
      { status: 201, headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof DuplicateEvaluationError) {
      return NextResponse.json(
        {
          error: "DUPLICATE_PROPOSAL",
          message: `Proposal with externalId '${proposalData.externalId}' already exists for this platform`,
        },
        { status: 409, headers: { "x-request-id": requestId } }
      );
    }

    throw error;
  }
}
