import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifyBadge } from "@/components/verify-badge";
import { getDb } from "@/lib/db/client";
import { proposals, evaluations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DIMENSION_LABELS, type JudgeDimension } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });

  if (!proposal || proposal.status !== "published") notFound();

  const evals = await db.query.evaluations.findMany({
    where: eq(evaluations.proposalId, id),
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">On-Chain Verification</h1>
        <p className="text-muted-foreground">
          Every evaluation is cryptographically verifiable
        </p>
      </div>

      {/* Proposal Identity */}
      <Card>
        <CardHeader><CardTitle>Project Identity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Chain Token ID</span>
            <code className="text-sm font-mono">{proposal.chainTokenId ?? "\u2014"}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Registration Tx</span>
            <a
              href={`https://sepolia.basescan.org/tx/${proposal.chainTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-primary hover:underline truncate max-w-64"
            >
              {proposal.chainTxHash}
            </a>
          </div>
          {proposal.ipfsCid && (
            <VerifyBadge
              ipfsCid={proposal.ipfsCid}
              expectedHash=""
              label="Proposal Content"
            />
          )}
        </CardContent>
      </Card>

      {/* Judge Evaluations */}
      <Card>
        <CardHeader><CardTitle>Judge Evaluations</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {evals.map((evaluation) => (
            <div key={evaluation.id} className="space-y-2 pb-4 border-b last:border-0">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {DIMENSION_LABELS[evaluation.dimension as JudgeDimension]}
                </span>
                <span className="text-sm text-muted-foreground">
                  Score: {evaluation.score !== null ? (evaluation.score / 100).toFixed(1) : "\u2014"}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Model: {evaluation.model}</span>
                <span>Prompt: {evaluation.promptVersion}</span>
              </div>
              {evaluation.feedbackTxHash && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Feedback Tx</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${evaluation.feedbackTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-primary hover:underline"
                  >
                    {evaluation.feedbackTxHash?.slice(0, 18)}...
                  </a>
                </div>
              )}
              {evaluation.ipfsCid && (
                <VerifyBadge
                  ipfsCid={evaluation.ipfsCid}
                  expectedHash=""
                  label="Evaluation"
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        All data verifiable via Base Sepolia + IPFS. No trust required.
      </p>
    </div>
  );
}
