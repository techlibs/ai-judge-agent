import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { getDb } from "./client";
import {
  evaluationJobs,
  proposals,
  dimensionScores,
  fundingRoundStats,
} from "./schema";

const MAX_RETRY_COUNT = 3;

type EvaluationJobStatus = "pending" | "in_progress" | "complete" | "failed";

interface CreateEvaluationJobParams {
  readonly id: string;
  readonly proposalId: string;
}

export async function createEvaluationJob(
  params: CreateEvaluationJobParams
): Promise<void> {
  const db = getDb();
  await db.insert(evaluationJobs).values({
    id: params.id,
    proposalId: params.proposalId,
    status: "pending",
    retryCount: 0,
  });
}

export async function updateEvaluationJobStatus(
  jobId: string,
  status: EvaluationJobStatus,
  error?: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const updateValues: Record<string, unknown> = { status };

  if (status === "in_progress") {
    updateValues.startedAt = now;
  }

  if (status === "complete" || status === "failed") {
    updateValues.completedAt = now;
  }

  if (error !== undefined) {
    updateValues.error = error;
  }

  if (status === "failed") {
    await db
      .update(evaluationJobs)
      .set({
        ...updateValues,
        retryCount: sql`${evaluationJobs.retryCount} + 1`,
      })
      .where(eq(evaluationJobs.id, jobId));
  } else {
    await db
      .update(evaluationJobs)
      .set(updateValues)
      .where(eq(evaluationJobs.id, jobId));
  }
}

export async function getEvaluationJob(jobId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(evaluationJobs)
    .where(eq(evaluationJobs.id, jobId))
    .limit(1);

  return results[0] ?? null;
}

export async function getRetryableJobs() {
  const db = getDb();
  return db
    .select()
    .from(evaluationJobs)
    .where(
      and(
        eq(evaluationJobs.status, "failed"),
        sql`${evaluationJobs.retryCount} < ${MAX_RETRY_COUNT}`
      )
    );
}

export async function findExistingEvaluationJob(
  proposalId: string
) {
  const db = getDb();
  const results = await db
    .select()
    .from(evaluationJobs)
    .where(eq(evaluationJobs.proposalId, proposalId))
    .limit(1);

  return results[0] ?? null;
}

interface ListProposalsParams {
  readonly fundingRoundId?: string;
  readonly status?: string;
  readonly search?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: string;
  readonly order?: "asc" | "desc";
}

export async function listProposals(params: ListProposalsParams) {
  const db = getDb();
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (params.fundingRoundId) {
    conditions.push(eq(proposals.fundingRoundId, params.fundingRoundId));
  }
  if (params.status) {
    conditions.push(eq(proposals.status, params.status));
  }
  if (params.search) {
    const searchTerm = `%${params.search}%`;
    conditions.push(
      or(
        like(proposals.title, searchTerm),
        like(proposals.description, searchTerm)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(proposals)
      .where(where)
      .orderBy(desc(proposals.chainTimestamp))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(proposals)
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getProposalById(proposalId: string) {
  const db = getDb();

  const [proposalResults, dimensionResults] = await Promise.all([
    db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposalId))
      .limit(1),
    db
      .select()
      .from(dimensionScores)
      .where(eq(dimensionScores.proposalId, proposalId)),
  ]);

  const proposal = proposalResults[0];
  if (!proposal) {
    return null;
  }

  return {
    ...proposal,
    dimensions: dimensionResults,
  };
}

export async function getFundingRoundStats(fundingRoundId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(fundingRoundStats)
    .where(eq(fundingRoundStats.fundingRoundId, fundingRoundId))
    .limit(1);

  return results[0] ?? null;
}
