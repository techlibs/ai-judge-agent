"use client";

import { FileBarChart } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScoreRadarChart,
  type DimensionScore,
} from "./score-radar-chart";

const DIMENSION_WEIGHT_LABELS = [
  "Technical (25%)",
  "Impact (30%)",
  "Cost (20%)",
  "Team (25%)",
] as const;

interface ScoreSummaryCardProps {
  readonly scores?: ReadonlyArray<DimensionScore> | undefined;
  readonly aggregateScore?: number | undefined;
  readonly loading?: boolean | undefined;
}

export function ScoreSummaryCard({
  scores,
  aggregateScore,
  loading,
}: ScoreSummaryCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="min-h-[250px] w-full" />
          <p className="mt-2 text-sm text-muted-foreground">
            Evaluating...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileBarChart className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No evaluation yet</h3>
          <p className="mt-2 max-w-md text-muted-foreground">
            This proposal is awaiting evaluation. Results will appear
            here once all four judges complete their assessment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allZero = scores.every((s) => s.score === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <div className="flex flex-col items-center gap-1 md:w-1/2">
            <span className="text-sm text-muted-foreground">
              Overall Score
            </span>
            <span className="text-[28px] font-semibold text-[var(--chart-1)]">
              {aggregateScore !== undefined
                ? `${Math.round(aggregateScore)}/100`
                : "N/A"}
            </span>
          </div>
          <div className="md:w-1/2">
            <ScoreRadarChart scores={scores} />
          </div>
        </div>

        {allZero && (
          <p className="mt-2 text-sm text-muted-foreground">
            All dimensions scored 0
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {DIMENSION_WEIGHT_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
