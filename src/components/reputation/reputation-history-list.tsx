"use client";

import { useState, useMemo } from "react";
import { History, Unlink, ArrowUpDown } from "lucide-react";
import type { ReputationFeedbackEntry } from "@/lib/chain/reputation-schemas";
import {
  ReputationHistoryEntryRow,
  ReputationHistoryEntryCard,
} from "./reputation-history-entry";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

type SortField = "date" | "score";
type SortDirection = "asc" | "desc";

interface ReputationHistoryListProps {
  readonly history: ReadonlyArray<ReputationFeedbackEntry>;
  readonly agentId: string | undefined;
}

function EmptyNoRegistration() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Unlink className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-xl font-semibold">Not yet on-chain</h3>
      <p className="mt-2 max-w-md text-muted-foreground">
        This project has not been registered on the blockchain yet.
        On-chain identity is created when a proposal is first submitted.
      </p>
    </div>
  );
}

function EmptyNoHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <History className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-xl font-semibold">No reputation history</h3>
      <p className="mt-2 max-w-md text-muted-foreground">
        This project has not been evaluated yet. Reputation data will
        appear here after the first evaluation is published on-chain.
      </p>
    </div>
  );
}

export function ReputationHistoryList({
  history,
  agentId,
}: ReputationHistoryListProps) {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedHistory = useMemo(() => {
    const sorted = [...history];
    sorted.sort((a, b) => {
      if (sortField === "date") {
        return sortDirection === "desc"
          ? b.blockNumber - a.blockNumber
          : a.blockNumber - b.blockNumber;
      }
      return sortDirection === "desc"
        ? b.value - a.value
        : a.value - b.value;
    });
    return sorted;
  }, [history, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedHistory.length / PAGE_SIZE));
  const paginatedHistory = sortedHistory.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(0);
  }

  if (!agentId) {
    return <EmptyNoRegistration />;
  }

  if (history.length === 0) {
    return <EmptyNoHistory />;
  }

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDirection === "desc" ? " \u2193" : " \u2191") : "";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold leading-[1.2]">
          Reputation History
        </h2>
        <span className="text-sm text-muted-foreground">
          {history.length} evaluation{history.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Desktop: table layout */}
      <div className="mt-4 hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Date{sortIndicator("date")}
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("score")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Score{sortIndicator("score")}
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Tx Hash</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHistory.map((entry, index) => (
              <ReputationHistoryEntryRow
                key={`${entry.blockNumber}-${index}`}
                entry={entry}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: card layout */}
      <div className="mt-4 space-y-3 md:hidden" role="list">
        <div className="flex gap-2">
          <Button
            variant={sortField === "date" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSort("date")}
          >
            Date{sortIndicator("date")}
          </Button>
          <Button
            variant={sortField === "score" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSort("score")}
          >
            Score{sortIndicator("score")}
          </Button>
        </div>
        {paginatedHistory.map((entry, index) => (
          <ReputationHistoryEntryCard
            key={`${entry.blockNumber}-${index}`}
            entry={entry}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
