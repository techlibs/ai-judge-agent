import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-4">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          IPE City Grants
        </h1>
        <p className="mx-auto max-w-md text-lg text-muted-foreground">
          AI-powered grant evaluation with transparent, on-chain scoring
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/grants/submit"
          className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Submit Proposal
        </Link>
        <Link
          href="/grants"
          className="rounded-lg border border-input px-6 py-3 font-medium transition-colors hover:bg-accent"
        >
          View Grants
        </Link>
      </div>
    </main>
  );
}
