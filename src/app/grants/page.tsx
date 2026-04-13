import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProposalCard } from "@/components/proposal-card";
import { getDb } from "@/lib/db/client";
import { proposals, aggregateScores } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function GrantsPage() {
  const db = getDb();

  const allProposals = await db
    .select()
    .from(proposals)
    .orderBy(desc(proposals.createdAt));

  const scores = await db.select().from(aggregateScores);
  const scoreMap = new Map(scores.map((s) => [s.proposalId, s.scoreBps]));

  const totalProposals = allProposals.length;
  const totalEvaluated = allProposals.filter((p) => p.status === "published").length;
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.scoreBps, 0) / scores.length)
    : null;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">IPE City Grants</h1>
        <p className="text-lg text-muted-foreground mb-8">
          AI-Evaluated, On-Chain Verified
        </p>
        <div className="flex justify-center gap-8 mb-8">
          <div>
            <p className="text-3xl font-bold">{totalProposals}</p>
            <p className="text-sm text-muted-foreground">Proposals</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{totalEvaluated}</p>
            <p className="text-sm text-muted-foreground">Evaluated</p>
          </div>
          {avgScore !== null && (
            <div>
              <p className="text-3xl font-bold">{(avgScore / 100).toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
          )}
        </div>
        <Link href="/grants/submit">
          <Button size="lg">Submit a Proposal</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {allProposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            id={proposal.id}
            title={proposal.title}
            category={proposal.category}
            status={proposal.status}
            aggregateScore={scoreMap.get(proposal.id) ?? null}
            createdAt={proposal.createdAt}
          />
        ))}

        {allProposals.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No proposals yet. Be the first to submit.
          </p>
        )}
      </div>
    </div>
  );
}
