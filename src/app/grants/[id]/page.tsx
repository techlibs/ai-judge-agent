import Link from "next/link";
import { DIMENSION_LABELS, type JudgeDimension } from "@/lib/constants";
import { getEvaluation } from "@/lib/evaluation-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 5;

interface GrantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: GrantDetailPageProps) {
  const { id } = await params;

  const evaluation = await getEvaluation(id).catch(() => null);

  if (!evaluation) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="link" className="px-0" asChild>
            <Link href="/grants">&larr; Back to Proposals</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Proposal not found</CardTitle>
            <CardDescription className="font-mono text-xs">
              ID: {id}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No evaluation record exists for this proposal.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/grants">Back to Proposals</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const aggregatePercent = (evaluation.aggregateScoreBps / 100).toFixed(1);
  const { chain } = evaluation;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="link" className="px-0" asChild>
          <Link href="/grants">&larr; Back to Proposals</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{evaluation.title}</CardTitle>
              <CardDescription className="font-mono text-xs text-muted-foreground">
                <span>ID: {evaluation.proposalId}</span>
                <span className="ml-3">hex: {evaluation.proposalIdHex}</span>
              </CardDescription>
            </div>
            <Badge className="text-sm">{aggregatePercent}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold">Scoring Dimensions</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {evaluation.dimensions.map((dim) => {
                const label =
                  DIMENSION_LABELS[dim.dimension as JudgeDimension] ??
                  dim.dimension;
                const scoreOutOfTen = (dim.evaluation.score / 1000).toFixed(1);
                return (
                  <Card key={dim.dimension}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{label}</CardTitle>
                        <Badge variant="secondary">
                          {dim.evaluation.confidence}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        Score: <span className="font-semibold">{scoreOutOfTen}</span> / 10
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {dim.evaluation.justification}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">On-Chain Status</h3>
            <Card className="mt-4">
              <CardContent className="pt-4 space-y-3">
                {chain.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                    <Badge variant="secondary">
                      On-chain submission pending
                    </Badge>
                  </div>
                )}
                {chain.status === "confirmed" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-transparent bg-green-600 text-white hover:bg-green-600/80">
                      Confirmed on Base Sepolia
                      {chain.blockNumber !== undefined
                        ? ` · block ${chain.blockNumber}`
                        : ""}
                    </Badge>
                    {chain.txHash && (
                      <Button variant="link" className="h-auto px-0" asChild>
                        <a
                          href={`https://sepolia.basescan.org/tx/${chain.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View transaction &rarr;
                        </a>
                      </Button>
                    )}
                  </div>
                )}
                {chain.status === "failed" && (
                  <div className="space-y-2">
                    <Badge variant="destructive">
                      On-chain submission failed
                    </Badge>
                    {chain.error && (
                      <p className="text-sm text-destructive">{chain.error}</p>
                    )}
                  </div>
                )}

                {chain.proposalContentCid && chain.evaluationContentCid && (
                  <div className="flex flex-wrap gap-4 pt-2">
                    <Button variant="link" className="h-auto px-0" asChild>
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${chain.proposalContentCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Proposal JSON &rarr;
                      </a>
                    </Button>
                    <Button variant="link" className="h-auto px-0" asChild>
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${chain.evaluationContentCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Evaluation JSON &rarr;
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {evaluation.anomalyFlags.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="text-base text-yellow-900 dark:text-yellow-200">
                  Anomaly Flags
                </CardTitle>
                <CardDescription className="text-yellow-800/80 dark:text-yellow-200/80">
                  The following anomalies were detected during evaluation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-900 dark:text-yellow-200">
                  {evaluation.anomalyFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
