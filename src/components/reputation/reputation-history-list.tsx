import { History, Unlink } from "lucide-react";
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
  if (!agentId) {
    return <EmptyNoRegistration />;
  }

  if (history.length === 0) {
    return <EmptyNoHistory />;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold leading-[1.2]">
        Reputation History
      </h2>

      {/* Desktop: table layout */}
      <div className="mt-4 hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Tx Hash</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry, index) => (
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
        {history.map((entry, index) => (
          <ReputationHistoryEntryCard
            key={`${entry.blockNumber}-${index}`}
            entry={entry}
          />
        ))}
      </div>
    </div>
  );
}
