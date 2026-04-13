import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCORING_BANDS } from "@/lib/constants";

interface ProposalCardProps {
  id: string;
  title: string;
  category: string;
  status: string;
  aggregateScore: number | null;
  createdAt: Date;
}

function getScoreBand(score: number): { label: string; color: string } {
  if (score >= SCORING_BANDS.exceptional.min) return { label: "Exceptional", color: "text-emerald-400" };
  if (score >= SCORING_BANDS.strong.min) return { label: "Strong", color: "text-blue-400" };
  if (score >= SCORING_BANDS.adequate.min) return { label: "Adequate", color: "text-yellow-400" };
  if (score >= SCORING_BANDS.weak.min) return { label: "Weak", color: "text-orange-400" };
  return { label: "Insufficient", color: "text-red-400" };
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "published": return "default";
    case "evaluating": return "secondary";
    case "failed": return "destructive";
    default: return "outline";
  }
}

export function ProposalCard({ id, title, category, status, aggregateScore, createdAt }: ProposalCardProps) {
  const band = aggregateScore !== null ? getScoreBand(aggregateScore) : null;

  return (
    <Link href={`/grants/${id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
            {aggregateScore !== null && (
              <span className={`text-2xl font-bold tabular-nums ${band?.color}`}>
                {(aggregateScore / 100).toFixed(1)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{category}</Badge>
            <Badge variant={getStatusBadgeVariant(status)} className="capitalize">{status}</Badge>
            {band && (
              <span className={`text-xs font-medium ${band.color}`}>{band.label}</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {createdAt.toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
