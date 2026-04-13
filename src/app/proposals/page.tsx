"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProposalCard } from "@/components/proposals/proposal-card";
import { ProposalListSkeleton } from "@/components/proposals/proposal-list-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { z } from "zod";
import type { ProposalStatus } from "@/lib/constants/proposal";

const proposalsResponseSchema = z.object({
  proposals: z.array(
    z.object({
      tokenId: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.enum(["submitted", "evaluating", "evaluated"]),
      budget: z.number(),
    })
  ),
});

interface ProposalListItem {
  tokenId: string;
  title: string;
  description: string;
  status: ProposalStatus;
  budget: number;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProposals() {
      try {
        const response = await fetch("/api/proposals");
        if (!response.ok) {
          setError("Failed to load proposals. Try refreshing the page.");
          return;
        }
        const data: unknown = await response.json();
        const parsed = proposalsResponseSchema.safeParse(data);
        if (parsed.success) {
          setProposals(parsed.data.proposals);
        }
      } catch {
        setError("Failed to load proposals. Try refreshing the page.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProposals();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            All Proposals
          </h1>
        </div>
        <ProposalListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          All Proposals
        </h1>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-semibold">No proposals yet</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Be the first to submit a grant proposal for evaluation. Your proposal
          will be stored on IPFS and registered on-chain.
        </p>
        <Link
          href="/proposals/new"
          className={buttonVariants({ size: "lg", className: "mt-6" })}
        >
          Submit the first proposal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          All Proposals
        </h1>
        <Link
          href="/proposals/new"
          className={buttonVariants({ size: "sm" })}
        >
          Submit Proposal
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.tokenId}
            tokenId={proposal.tokenId}
            title={proposal.title}
            description={proposal.description}
            status={proposal.status}
            budget={proposal.budget}
          />
        ))}
      </div>
    </div>
  );
}
