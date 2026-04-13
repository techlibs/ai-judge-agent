import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JudgeCard } from "@/components/judge-card";
import { ScoreGauge } from "@/components/score-gauge";
import { ScoreRadar } from "@/components/score-radar";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations, aggregateScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal) notFound();

  const evals = await db.query.evaluations.findMany({
    where: eq(evaluations.proposalId, id),
  });

  const aggregate = await db.query.aggregateScores.findFirst({
    where: eq(aggregateScores.proposalId, id),
  });

  const evalMap = new Map(evals.map((e) => [e.dimension, e]));

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{proposal.title}</h1>
            <div className="flex gap-2">
              <Badge variant="outline" className="capitalize">{proposal.category}</Badge>
              <Badge className="capitalize">{proposal.status}</Badge>
            </div>
          </div>
          {aggregate && (
            <ScoreGauge score={aggregate.scoreBps} size="lg" label="Aggregate" />
          )}
        </div>
      </div>

      {/* Proposal Content */}
      <Card>
        <CardHeader><CardTitle>Proposal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p>{proposal.description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Problem</p>
            <p>{proposal.problemStatement}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Solution</p>
            <p>{proposal.proposedSolution}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Budget</p>
            <p>${proposal.budgetAmount.toLocaleString()} USDC</p>
            <p className="text-sm mt-1">{proposal.budgetBreakdown}</p>
          </div>
        </CardContent>
      </Card>

      {/* Score Radar Chart */}
      {evals.length > 0 && (
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4">Dimensional Breakdown</h2>
          <ScoreRadar
            scores={Object.fromEntries(
              evals
                .filter((e) => e.status === "complete" && e.score !== null)
                .map((e) => [e.dimension, e.score])
            )}
          />
        </div>
      )}

      {/* Judge Results */}
      {evals.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Judge Evaluations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {JUDGE_DIMENSIONS.map((dim) => {
              const evaluation = evalMap.get(dim);
              return (
                <JudgeCard
                  key={dim}
                  dimension={dim}
                  evaluation={evaluation ? {
                    score: evaluation.score ?? undefined,
                    scoreDecimals: 2,
                    confidence: evaluation.confidence ?? undefined,
                    recommendation: evaluation.recommendation ?? undefined,
                    justification: evaluation.justification ?? undefined,
                    keyFindings: evaluation.keyFindings ?? undefined,
                    risks: evaluation.risks ?? undefined,
                    ipeAlignment: {
                      proTechnology: evaluation.ipeAlignmentTech ?? 0,
                      proFreedom: evaluation.ipeAlignmentFreedom ?? 0,
                      proHumanProgress: evaluation.ipeAlignmentProgress ?? 0,
                    },
                  } : undefined}
                  status={evaluation?.status === "complete" ? "complete" : "pending"}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        {proposal.status === "pending" && (
          <Link href={`/grants/${id}/evaluate`}>
            <Button size="lg">Start Evaluation</Button>
          </Link>
        )}
        {proposal.status === "published" && (
          <Link href={`/grants/${id}/verify`}>
            <Button variant="outline">Verify On-Chain</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
