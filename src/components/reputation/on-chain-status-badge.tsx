import { Badge } from "@/components/ui/badge";

type OnChainStatus = "confirmed" | "pending" | "failed";

interface StatusEntry {
  readonly label: string;
  readonly variant: "default" | "secondary" | "destructive";
  readonly className: string;
}

const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmed",
    variant: "default",
    className: "bg-emerald-600 text-white",
  },
  pending: {
    label: "Pending",
    variant: "secondary",
    className: "text-muted-foreground",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    className: "",
  },
} as const satisfies Record<OnChainStatus, StatusEntry>;

export function OnChainStatusBadge({ status }: { status: OnChainStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant={config.variant}
      className={config.className}
      aria-label={`On-chain status: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
}
