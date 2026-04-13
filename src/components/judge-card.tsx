"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/score-gauge";
import { DIMENSION_LABELS, type JudgeDimension } from "@/lib/constants";
import type { JudgeEvaluation } from "@/lib/judges/schemas";

interface JudgeCardProps {
  dimension: JudgeDimension;
  evaluation: Partial<JudgeEvaluation> | undefined;
  status: "pending" | "streaming" | "complete" | "failed";
}

function getRecommendationBadge(rec: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (rec) {
    case "strong_fund": return { label: "Strong Fund", variant: "default" };
    case "fund": return { label: "Fund", variant: "secondary" };
    case "conditional": return { label: "Conditional", variant: "outline" };
    case "reject": return { label: "Reject", variant: "destructive" };
    default: return { label: rec, variant: "outline" };
  }
}

export function JudgeCard({ dimension, evaluation, status }: JudgeCardProps) {
  const label = DIMENSION_LABELS[dimension];

  if (status === "pending") {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Waiting...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "failed") {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Evaluation failed</p>
        </CardContent>
      </Card>
    );
  }

  const rec = evaluation?.recommendation
    ? getRecommendationBadge(evaluation.recommendation)
    : null;

  return (
    <Card className={status === "streaming" ? "border-primary/50 animate-pulse" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          {rec && <Badge variant={rec.variant}>{rec.label}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <ScoreGauge score={evaluation?.score ?? null} size="sm" />
          {evaluation?.confidence && (
            <span className="text-xs text-muted-foreground capitalize">
              {evaluation.confidence} confidence
            </span>
          )}
        </div>

        {evaluation?.justification && (
          <p className="text-sm leading-relaxed">{evaluation.justification}</p>
        )}

        {evaluation?.keyFindings && evaluation.keyFindings.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Key Findings</p>
            <ul className="text-sm space-y-1">
              {evaluation.keyFindings.map((finding, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">+</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {evaluation?.risks && evaluation.risks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Risks</p>
            <ul className="text-sm space-y-1">
              {evaluation.risks.map((risk, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-destructive">!</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
