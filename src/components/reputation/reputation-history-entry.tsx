"use client";

import { type ReputationFeedbackEntry } from "@/lib/chain/reputation-schemas";
import { TransactionLink } from "./transaction-link";
import { OnChainStatusBadge } from "./on-chain-status-badge";
import { TableCell, TableRow } from "@/components/ui/table";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const MS_PER_SECOND = 1000;

function formatRelativeTime(timestampSeconds: number): string {
  if (timestampSeconds === 0) return "Unknown";

  const now = Date.now();
  const diffSeconds = Math.floor(
    (now - timestampSeconds * MS_PER_SECOND) / MS_PER_SECOND,
  );

  if (diffSeconds < SECONDS_PER_MINUTE) return "just now";
  if (diffSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(diffSeconds / SECONDS_PER_MINUTE);
    return `${minutes}m ago`;
  }
  if (diffSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(diffSeconds / SECONDS_PER_HOUR);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffSeconds / SECONDS_PER_DAY);
  return `${days}d ago`;
}

function deriveOnChainStatus(
  txHash: string | null,
): "confirmed" | "pending" {
  // TODO: derive "failed" status once we have transaction receipt checking
  if (!txHash) return "pending";
  return "confirmed";
}

interface ReputationHistoryEntryProps {
  readonly entry: ReputationFeedbackEntry;
}

export function ReputationHistoryEntryRow({
  entry,
}: ReputationHistoryEntryProps) {
  const isoDate = new Date(entry.timestamp * MS_PER_SECOND).toISOString();

  return (
    <TableRow>
      <TableCell>
        <time dateTime={isoDate} title={isoDate}>
          {formatRelativeTime(entry.timestamp)}
        </time>
      </TableCell>
      <TableCell>
        <span
          className="text-base font-semibold"
          aria-label={`Score: ${entry.value} out of 100`}
        >
          {entry.value.toFixed(0)}/100
        </span>
      </TableCell>
      <TableCell>
        <TransactionLink txHash={entry.txHash} />
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm">#{entry.blockNumber}</span>
      </TableCell>
      <TableCell>
        <OnChainStatusBadge status={deriveOnChainStatus(entry.txHash)} />
      </TableCell>
    </TableRow>
  );
}

export function ReputationHistoryEntryCard({
  entry,
}: ReputationHistoryEntryProps) {
  const isoDate = new Date(entry.timestamp * MS_PER_SECOND).toISOString();

  return (
    <div
      role="listitem"
      className="rounded-lg border p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-base font-semibold"
          aria-label={`Score: ${entry.value} out of 100`}
        >
          {entry.value.toFixed(0)}/100
        </span>
        <OnChainStatusBadge status={deriveOnChainStatus(entry.txHash)} />
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <time dateTime={isoDate} title={isoDate}>
          {formatRelativeTime(entry.timestamp)}
        </time>
        <span className="font-mono">#{entry.blockNumber}</span>
      </div>

      <div>
        <TransactionLink txHash={entry.txHash} />
      </div>
    </div>
  );
}
