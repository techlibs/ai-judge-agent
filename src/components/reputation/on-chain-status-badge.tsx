import { Badge } from "@/components/ui/badge";

type OnChainStatus = "confirmed" | "pending" | "failed";

const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmed",
    variant: "default" as const,
    className: "bg-emerald-600 text-white",
  },
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    className: "text-muted-foreground",
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    className: "",
  },
} as const;

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
