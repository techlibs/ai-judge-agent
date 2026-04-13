import { Badge } from "@/components/ui/badge";

const RECOMMENDATION_DISPLAY: Record<
  string,
  { label: string; className: string }
> = {
  strong_approve: {
    label: "Strong Approve",
    className: "bg-primary text-primary-foreground",
  },
  approve: {
    label: "Approve",
    className: "bg-secondary text-foreground",
  },
  needs_revision: {
    label: "Needs Revision",
    className: "bg-amber-500 text-white",
  },
  reject: {
    label: "Reject",
    className: "bg-destructive text-destructive-foreground",
  },
};

interface RecommendationBadgeProps {
  recommendation:
    | "strong_approve"
    | "approve"
    | "needs_revision"
    | "reject";
}

export function RecommendationBadge({
  recommendation,
}: RecommendationBadgeProps) {
  const display = RECOMMENDATION_DISPLAY[recommendation];
  if (!display) return null;

  return (
    <Badge
      className={display.className}
      aria-label={`Recommendation: ${display.label}`}
    >
      {display.label}
    </Badge>
  );
}
