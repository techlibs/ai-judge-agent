import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listEvaluations, type StoredEvaluation } from "@/lib/evaluation-store";

export const dynamic = "force-dynamic";

function formatScore(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function ChainStatusBadge({ chain }: { chain: StoredEvaluation["chain"] }) {
  if (chain.status === "confirmed") {
    const badge = (
      <Badge className="border-transparent bg-green-600 text-white hover:bg-green-600/80">
        confirmed
      </Badge>
    );
    if (chain.txHash) {
      return (
        <a
          href={`https://sepolia.basescan.org/tx/${chain.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex"
        >
          {badge}
        </a>
      );
    }
    return badge;
  }
  if (chain.status === "failed") {
    return <Badge variant="destructive">failed</Badge>;
  }
  return <Badge variant="secondary">pending</Badge>;
}

export default async function GrantsPage() {
  const evaluations = await listEvaluations();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Grant Proposals
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-evaluated grant proposals with transparent scoring
          </p>
        </div>
        <Button asChild>
          <Link href="/grants/submit">Submit Proposal</Link>
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold">
              No proposals yet. Submit your first.
            </h3>
            <div className="mt-6">
              <Button asChild>
                <Link href="/grants/submit">Submit Your First Proposal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evaluations.map((evalRec) => (
            <Link
              key={evalRec.proposalId}
              href={`/grants/${evalRec.proposalId}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                    {evalRec.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{formatScore(evalRec.aggregateScoreBps)}</Badge>
                    <ChainStatusBadge chain={evalRec.chain} />
                  </div>
                  <p className="mt-auto text-xs text-muted-foreground">
                    {formatDate(evalRec.evaluatedAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
