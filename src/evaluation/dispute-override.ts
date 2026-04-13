import { eq } from "drizzle-orm";
import { getDb } from "@/cache/client";
import { proposals, disputes } from "@/cache/schema";

const SCORE_PRECISION = 100;

interface DisputeOverrideParams {
  readonly disputeId: number;
  readonly proposalId: string;
  readonly newChainScore: number;
}

interface DisputeOverrideResult {
  readonly oldScore: number | null;
  readonly newScore: number;
  readonly proposalId: string;
}

export async function applyDisputeScoreOverride(
  params: DisputeOverrideParams
): Promise<DisputeOverrideResult> {
  const db = getDb();

  const proposalResults = await db
    .select()
    .from(proposals)
    .where(eq(proposals.id, params.proposalId))
    .limit(1);

  const proposal = proposalResults[0];
  const oldScore = proposal?.finalScore ?? null;
  const newScore = params.newChainScore / SCORE_PRECISION;

  if (proposal) {
    await db
      .update(proposals)
      .set({
        finalScore: newScore,
        adjustedScore: newScore,
        status: "disputed_overturned",
      })
      .where(eq(proposals.id, params.proposalId));
  }

  await db
    .update(disputes)
    .set({
      status: "overturned",
      newScore,
      resolvedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(disputes.id, params.disputeId));

  return {
    oldScore,
    newScore,
    proposalId: params.proposalId,
  };
}

export async function applyDisputeUpheld(
  disputeId: number
): Promise<void> {
  const db = getDb();

  await db
    .update(disputes)
    .set({
      status: "upheld",
      resolvedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(disputes.id, disputeId));
}
