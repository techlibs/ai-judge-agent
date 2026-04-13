"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "./proposal-status-badge";
import {
  DESCRIPTION_TRUNCATE_LENGTH,
  type ProposalStatus,
} from "@/lib/constants/proposal";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface ProposalCardProps {
  tokenId: string;
  title: string;
  description: string;
  status: ProposalStatus;
  budget: number;
}

export function ProposalCard({
  tokenId,
  title,
  description,
  status,
  budget,
}: ProposalCardProps) {
  const truncated =
    description.length > DESCRIPTION_TRUNCATE_LENGTH
      ? `${description.slice(0, DESCRIPTION_TRUNCATE_LENGTH)}...`
      : description;

  return (
    <Link href={`/proposals/${tokenId}`}>
      <article>
        <Card className="transition-shadow hover:shadow-md hover:border-gray-300">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg font-semibold leading-tight">
                {title}
              </CardTitle>
              <StatusBadge status={status} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">{truncated}</p>
            <p className="text-sm font-medium">
              {currencyFormatter.format(budget)}
            </p>
          </CardContent>
        </Card>
      </article>
    </Link>
  );
}
