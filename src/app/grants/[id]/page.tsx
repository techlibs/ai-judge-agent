import Link from "next/link";
import { DIMENSION_LABELS, type JudgeDimension } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GrantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: GrantDetailPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="link" className="px-0" asChild>
          <Link href="/grants">&larr; Back to Proposals</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Proposal Evaluation</CardTitle>
          <CardDescription className="font-mono text-xs">
            ID: {id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="rounded-md bg-blue-50 p-6">
            <h2 className="text-lg font-semibold text-blue-900">
              Evaluation Submitted
            </h2>
            <p className="mt-2 text-sm text-blue-700">
              This proposal has been evaluated by our AI judges across four
              dimensions. Results will be available on-chain once the evaluation
              transaction is confirmed.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Scoring Dimensions</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                Object.entries(DIMENSION_LABELS) as Array<
                  [JudgeDimension, string]
                >
              ).map(([dim, label]) => (
                <Card key={dim}>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {label}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      Awaiting on-chain confirmation
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                Evaluation scores are published to the EvaluationRegistry
                contract on Base. Once confirmed, scores and justifications will
                appear here automatically.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
