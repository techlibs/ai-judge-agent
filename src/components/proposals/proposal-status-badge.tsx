"use client";

import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  type ProposalStatus,
} from "@/lib/constants/proposal";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  submitted: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  evaluating: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  evaluated: "bg-blue-600 text-white hover:bg-blue-600",
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <Badge variant="secondary" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
