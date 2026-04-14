import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { proposals } from "@/lib/db/schema";
import { desc, count } from "drizzle-orm";
import { ProposalInputSchema } from "@/types";
import { uploadJson, ipfsUri } from "@/lib/ipfs/client";
import { proposalSubmitLimiter } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security-log";

const MAX_BODY_SIZE = 256 * 1024; // 256 KB

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { success, reset } = await proposalSubmitLimiter.limit(ip);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    logSecurityEvent({ type: "rate_limited", ip, endpoint: "/api/proposals", limit: "5/h" });
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!origin || origin !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = ProposalInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid proposal", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const proposal = parsed.data;
  const id = crypto.randomUUID();
  const now = new Date();

  const PII_PATTERNS = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i,
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
  ];
  const textToScan = [proposal.title, proposal.description, proposal.problemStatement, proposal.proposedSolution].join(" ");
  const piiFound = PII_PATTERNS.filter(p => p.test(textToScan)).map(p => p.source);
  if (piiFound.length > 0) {
    logSecurityEvent({ type: "pii_detected", proposalId: id, patterns: piiFound });
    return NextResponse.json({ error: "PII_DETECTED", message: "Remove personal information before submitting" }, { status: 422 });
  }

  const ipfsResult = await uploadJson(
    {
      type: "https://ipe.city/schemas/proposal-v1",
      ...proposal,
      submittedAt: now.toISOString(),
    },
    `proposal-${id}.json`
  );

  const db = getDb();
  await db.insert(proposals).values({
    id,
    ...proposal,
    status: "pending",
    ipfsCid: ipfsResult.cid,
    createdAt: now,
  });

  return NextResponse.json({
    id,
    ipfsCid: ipfsResult.cid,
    ipfsUri: ipfsUri(ipfsResult.cid),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "20")));

  const db = getDb();

  const [proposalRows, countResult] = await Promise.all([
    db
      .select()
      .from(proposals)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(proposals.createdAt)),
    db
      .select({ total: count() })
      .from(proposals),
  ]);

  const total = countResult[0]?.total ?? 0;

  return NextResponse.json({
    data: proposalRows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
