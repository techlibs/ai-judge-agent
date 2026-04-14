import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GrantsPage() {
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
          <h3 className="mt-4 text-lg font-semibold">No proposals yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Evaluated proposals will appear here once on-chain indexing is
            connected. Submit a proposal to start the evaluation process.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/grants/submit">Submit Your First Proposal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
