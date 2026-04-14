import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { getDb } from "./client";
import {
  evaluationJobs,
  proposals,
  dimensionScores,
  fundReleases,
  fundingRoundStats,
  disputes,
  marketResearch,
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

  const [proposalResults, dimensionResults, fundReleaseResults, disputeResults] = await Promise.all([
    db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposalId))
      .limit(1),
    db
      .select()
      .from(dimensionScores)
      .where(eq(dimensionScores.proposalId, proposalId)),
    db
      .select()
      .from(fundReleases)
      .where(eq(fundReleases.projectId, proposalId))
      .limit(1),
    db
      .select()
      .from(disputes)
      .where(eq(disputes.proposalId, proposalId)),
  ]);

  const proposal = proposalResults[0];
  if (!proposal) {
    return null;
  }

  return {
    ...proposal,
    dimensions: dimensionResults,
    fundRelease: fundReleaseResults[0] ?? null,
    disputes: disputeResults,
  };
}

interface InsertPendingProposalParams {
  readonly proposalId: string;
  readonly externalId: string;
  readonly platformSource: string;
  readonly fundingRoundId: string;
  readonly title: string;
  readonly description: string;
  readonly budgetAmount: number;
  readonly budgetCurrency: string;
  readonly technicalDescription: string;
  readonly teamMembers: ReadonlyArray<{
    readonly role: string;
    readonly experience: string;
  }>;
  readonly category: string;
  readonly submittedAt: string;
}

export async function insertPendingProposal(
  params: InsertPendingProposalParams
): Promise<void> {
  const db = getDb();
  const teamProfileHash = `team-${params.teamMembers.length}`;
  await db
    .insert(proposals)
    .values({
      id: params.proposalId,
      externalId: params.externalId,
      platformSource: params.platformSource,
      fundingRoundId: params.fundingRoundId,
      title: params.title,
      description: params.description,
      budgetAmount: params.budgetAmount,
      budgetCurrency: params.budgetCurrency,
      technicalDescription: params.technicalDescription,
      teamProfileHash,
      teamSize: params.teamMembers.length,
      category: params.category,
      submittedAt: params.submittedAt,
      status: "pending",
      chainTimestamp: Math.floor(Date.now() / 1000),
    })
    .onConflictDoNothing();
}

interface SaveEvaluationParams {
  readonly proposalId: string;
  readonly externalId: string;
  readonly platformSource: string;
  readonly fundingRoundId: string;
  readonly title: string;
  readonly description: string;
  readonly budgetAmount: number;
  readonly budgetCurrency: string;
  readonly technicalDescription: string;
  readonly teamProfileHash: string;
  readonly teamSize: number;
  readonly category: string;
  readonly submittedAt: string;
  readonly proposalContentCid: string;
  readonly evaluationContentCid: string;
  readonly finalScore: number;
  readonly adjustedScore: number;
  readonly reputationMultiplier: number;
  readonly dimensions: ReadonlyArray<{
    readonly dimension: string;
    readonly weight: number;
    readonly score: number;
    readonly reasoningChain: string;
    readonly inputDataConsidered: ReadonlyArray<string>;
    readonly rubricApplied: { readonly criteria: ReadonlyArray<string> };
    readonly modelId: string;
    readonly promptVersion: string;
  }>;
}

export async function saveEvaluationToCache(
  params: SaveEvaluationParams
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .insert(proposals)
    .values({
      id: params.proposalId,
      externalId: params.externalId,
      platformSource: params.platformSource,
      fundingRoundId: params.fundingRoundId,
      title: params.title,
      description: params.description,
      budgetAmount: params.budgetAmount,
      budgetCurrency: params.budgetCurrency,
      technicalDescription: params.technicalDescription,
      teamProfileHash: params.teamProfileHash,
      teamSize: params.teamSize,
      category: params.category,
      submittedAt: params.submittedAt,
      proposalContentCid: params.proposalContentCid,
      evaluationContentCid: params.evaluationContentCid,
      finalScore: params.finalScore,
      adjustedScore: params.adjustedScore,
      reputationMultiplier: params.reputationMultiplier,
      status: "evaluated",
      evaluatedAt: now,
      chainTimestamp: Math.floor(Date.now() / 1000),
    })
    .onConflictDoUpdate({
      target: proposals.id,
      set: {
        title: params.title,
        description: params.description,
        budgetAmount: params.budgetAmount,
        budgetCurrency: params.budgetCurrency,
        technicalDescription: params.technicalDescription,
        teamProfileHash: params.teamProfileHash,
        teamSize: params.teamSize,
        proposalContentCid: params.proposalContentCid,
        evaluationContentCid: params.evaluationContentCid,
        finalScore: params.finalScore,
        adjustedScore: params.adjustedScore,
        reputationMultiplier: params.reputationMultiplier,
        status: "evaluated",
        evaluatedAt: now,
        chainTimestamp: Math.floor(Date.now() / 1000),
      },
    });

  for (const dim of params.dimensions) {
    await db
      .insert(dimensionScores)
      .values({
        id: `${params.proposalId}-${dim.dimension}`,
        proposalId: params.proposalId,
        dimension: dim.dimension,
        weight: dim.weight,
        score: dim.score,
        reasoningChain: dim.reasoningChain,
        inputDataConsidered: JSON.stringify(dim.inputDataConsidered),
        rubricApplied: JSON.stringify(dim.rubricApplied),
        modelId: dim.modelId,
        promptVersion: dim.promptVersion,
      })
      .onConflictDoNothing();
  }
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

const RESEARCH_TTL_HOURS = 24;

interface SaveMarketResearchParams {
  readonly id: string;
  readonly proposalId: string;
  readonly domainHash: string;
  readonly gapType: string;
  readonly competitorCount: number;
  readonly marketMaturity: string;
  readonly rawResponse: string;
  readonly ipfsCid: string | null;
}

export async function saveMarketResearch(
  params: SaveMarketResearchParams
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + RESEARCH_TTL_HOURS * 60 * 60 * 1000
  );

  await db
    .insert(marketResearch)
    .values({
      id: params.id,
      proposalId: params.proposalId,
      domainHash: params.domainHash,
      gapType: params.gapType,
      competitorCount: params.competitorCount,
      marketMaturity: params.marketMaturity,
      rawResponse: params.rawResponse,
      ipfsCid: params.ipfsCid,
      researchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    .onConflictDoNothing();
}

export async function getMarketResearchByProposalId(proposalId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(marketResearch)
    .where(eq(marketResearch.proposalId, proposalId))
    .limit(1);

  return results[0] ?? null;
}

export async function getCachedResearchByDomain(domainHash: string) {
  const db = getDb();
  const now = new Date().toISOString();
  const results = await db
    .select()
    .from(marketResearch)
    .where(
      and(
        eq(marketResearch.domainHash, domainHash),
        sql`${marketResearch.expiresAt} > ${now}`
      )
    )
    .orderBy(desc(marketResearch.researchedAt))
    .limit(1);

  return results[0] ?? null;
}
