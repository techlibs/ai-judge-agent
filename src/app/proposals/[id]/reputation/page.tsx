import { AlertTriangle } from "lucide-react";
import { ReputationSummaryCard } from "@/components/reputation/reputation-summary-card";
import { ReputationHistoryList } from "@/components/reputation/reputation-history-list";
import type { ReputationResponse } from "@/lib/chain/reputation-schemas";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reputation History",
};

async function fetchReputation(
  tokenId: string,
): Promise<ReputationResponse | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/reputation/${tokenId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return data as ReputationResponse;
  } catch {
    return null;
  }
}

export default async function ReputationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchReputation(id);

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">
            Could not load reputation data
          </h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            The reputation data for this project could not be loaded.
            This may be a temporary issue with the blockchain network.
          </p>
          <a
            href={`/proposals/${id}/reputation`}
            className="mt-4 text-sm underline underline-offset-4"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <ReputationSummaryCard summary={data.summary} agentId={id} />
      <div className="mt-6 md:mt-8">
        <ReputationHistoryList history={data.history} agentId={id} />
      </div>
    </div>
  );
}
