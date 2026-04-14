import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reputation",
};

export default function ReputationIndexPage() {
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Reputation
      </h1>
      <p className="mt-4 max-w-lg text-muted-foreground">
        Select a proposal to view its on-chain reputation history. Each
        evaluation is recorded transparently on Base.
      </p>
      <Link
        href="/proposals"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Browse proposals
      </Link>
    </div>
  );
}
