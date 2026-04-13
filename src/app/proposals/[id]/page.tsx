"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/proposals/proposal-status-badge";
import { ProposalDetailSkeleton } from "@/components/proposals/proposal-detail-skeleton";
import { z } from "zod";

const proposalDetailSchema = z.object({
  tokenId: z.string(),
  owner: z.string(),
  ipfsCID: z.string(),
  status: z.enum(["submitted", "evaluating", "evaluated"]),
  feedbackCount: z.number(),
  averageScore: z.number(),
  content: z.object({
    title: z.string(),
    description: z.string(),
    teamInfo: z.string(),
    budget: z.number(),
    externalLinks: z.array(z.string()),
    submittedAt: z.string(),
  }),
});

type ProposalDetail = z.infer<typeof proposalDetailSchema>;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 12)}...${hash.slice(-4)}`;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ProposalDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchProposal() {
      try {
        const response = await fetch(`/api/proposals/${id}`);
        if (response.status === 404) {
          setError("not_found");
          return;
        }
        if (response.status === 502) {
          setError("ipfs_unavailable");
          return;
        }
        if (!response.ok) {
          setError("unknown");
          return;
        }
        const data: unknown = await response.json();
        const parsed = proposalDetailSchema.safeParse(data);
        if (parsed.success) {
          setProposal(parsed.data);
        }
      } catch {
        setError("unknown");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchProposal();
  }, [id]);

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return <ProposalDetailSkeleton />;
  }

  if (error === "not_found") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-semibold">Proposal not found</h2>
        <p className="mt-2 text-muted-foreground">
          It may have been removed or the link is incorrect.
        </p>
        <Link
          href="/proposals"
          className="mt-4 text-sm underline underline-offset-4"
        >
          Back to all proposals
        </Link>
      </div>
    );
  }

  if (error === "ipfs_unavailable") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-semibold">Content unavailable</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Unable to load proposal content. The IPFS gateway may be temporarily
          unavailable. Try refreshing.
        </p>
        <Link
          href="/proposals"
          className="mt-4 text-sm underline underline-offset-4"
        >
          Back to all proposals
        </Link>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          Failed to load proposal. Try refreshing the page.
        </p>
        <Link
          href="/proposals"
          className="text-sm underline underline-offset-4"
        >
          Back to all proposals
        </Link>
      </div>
    );
  }

  const submittedDate = proposal.content.submittedAt
    ? dateFormatter.format(new Date(proposal.content.submittedAt))
    : "Unknown date";

  const validLinks = proposal.content.externalLinks.filter(isValidUrl);

  return (
    <div className="space-y-6">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to proposals
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold break-words md:text-3xl">{proposal.content.title}</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <StatusBadge status={proposal.status} />
          <span className="text-sm text-muted-foreground">{submittedDate}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Description
            </p>
            <p className="whitespace-pre-wrap break-words">{proposal.content.description}</p>
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Team
            </p>
            <p className="whitespace-pre-wrap">{proposal.content.teamInfo}</p>
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Budget
            </p>
            <p className="text-lg font-semibold">
              {currencyFormatter.format(proposal.content.budget)}
            </p>
          </div>
        </CardContent>
      </Card>

      {validLinks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            External Links
          </p>
          <ul className="space-y-1">
            {validLinks.map((link, i) => (
              <li key={i}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline underline-offset-4"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">IPFS CID</span>
          <code className="font-mono text-xs">
            {truncateHash(proposal.ipfsCID)}
          </code>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => copyToClipboard(proposal.ipfsCID)}
            aria-label="Copy IPFS CID to clipboard"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Owner Address</span>
          <a
            href={`https://sepolia.basescan.org/address/${proposal.owner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-primary underline underline-offset-4"
          >
            {truncateHash(proposal.owner)}
          </a>
        </div>
      </div>
    </div>
  );
}
