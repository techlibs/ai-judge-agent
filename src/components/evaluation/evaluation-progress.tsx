"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { DIMENSIONS } from "@/lib/evaluation/constants";
import type {
  EvaluationDimension,
  EvaluationOutput,
} from "@/lib/evaluation/schemas";

interface EvaluationProgressProps {
  completedDimensions: Map<EvaluationDimension, EvaluationOutput>;
  failedDimensions: Set<EvaluationDimension>;
  isEvaluating: boolean;
}

type AgentStatus = "complete" | "failed" | "running" | "pending";

function getAgentStatus(
  dimension: EvaluationDimension,
  completedDimensions: Map<EvaluationDimension, EvaluationOutput>,
  failedDimensions: Set<EvaluationDimension>,
  isEvaluating: boolean,
  isFirstPending: boolean,
): AgentStatus {
  if (completedDimensions.has(dimension)) return "complete";
  if (failedDimensions.has(dimension)) return "failed";
  if (isEvaluating && isFirstPending) return "running";
  return "pending";
}

const STATUS_INDICATOR_CLASSES: Record<AgentStatus, string> = {
  complete: "bg-primary",
  failed: "bg-destructive",
  running: "bg-primary motion-safe:animate-pulse",
  pending: "bg-muted",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  complete: "Complete",
  failed: "Failed",
  running: "Analyzing...",
  pending: "Pending",
};

export function EvaluationProgress({
  completedDimensions,
  failedDimensions,
  isEvaluating,
}: EvaluationProgressProps) {
  const completedCount =
    completedDimensions.size + failedDimensions.size;
  let foundFirstPending = false;

  return (
    <Card aria-live="polite">
      <CardHeader>
        <CardTitle>
          {isEvaluating
            ? "Evaluating Proposal..."
            : `${completedDimensions.size} of 4 judges complete`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {DIMENSIONS.map((dim) => {
          const isComplete = completedDimensions.has(dim.key);
          const isFailed = failedDimensions.has(dim.key);
          const isFirstPending =
            !isComplete && !isFailed && !foundFirstPending;
          if (isFirstPending) foundFirstPending = true;

          const agentStatus = getAgentStatus(
            dim.key,
            completedDimensions,
            failedDimensions,
            isEvaluating,
            isFirstPending,
          );

          const score = completedDimensions.get(dim.key)?.score;

          return (
            <div
              key={dim.key}
              className="flex min-h-[44px] items-center gap-3"
            >
              <div
                className={`h-3 w-3 shrink-0 rounded-full ${STATUS_INDICATOR_CLASSES[agentStatus]}`}
              />
              <span className="text-sm font-semibold">
                {dim.label} ({Math.round(dim.weight * 100)}%)
              </span>
              <span className="ml-auto text-sm text-muted-foreground">
                {STATUS_LABELS[agentStatus]}
                {agentStatus === "complete" && score !== undefined
                  ? ` — ${score}/100`
                  : ""}
              </span>
            </div>
          );
        })}
        <p className="pt-2 text-sm text-muted-foreground">
          {completedDimensions.size} of 4 judges complete
        </p>
      </CardContent>
    </Card>
  );
}
