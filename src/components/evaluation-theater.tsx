"use client";

import { useEffect, useState, useCallback } from "react";
import { type JudgeEvaluation } from "@/lib/judges/schemas";
import { JudgeCard } from "@/components/judge-card";
import { ScoreGauge } from "@/components/score-gauge";
import { JUDGE_DIMENSIONS, DIMENSION_WEIGHTS, type JudgeDimension } from "@/lib/constants";

interface EvaluationTheaterProps {
  proposalId: string;
  streams: Record<JudgeDimension, string>;
}

type JudgeStatus = "pending" | "streaming" | "complete" | "failed";

function computeLiveAggregate(
  results: Partial<Record<JudgeDimension, JudgeEvaluation>>
): number | null {
  let total = 0;
  let weightSum = 0;

  for (const dim of JUDGE_DIMENSIONS) {
    const score = results[dim]?.score;
    if (score !== undefined) {
      total += score * DIMENSION_WEIGHTS[dim];
      weightSum += DIMENSION_WEIGHTS[dim];
    }
  }

  if (weightSum === 0) return null;
  return Math.round(total / weightSum);
}

export function EvaluationTheater({ proposalId, streams }: EvaluationTheaterProps) {
  const [results, setResults] = useState<Partial<Record<JudgeDimension, JudgeEvaluation>>>({});
  const [statuses, setStatuses] = useState<Record<JudgeDimension, JudgeStatus>>({
    tech: "pending",
    impact: "pending",
    cost: "pending",
    team: "pending",
  });
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const fetchJudge = useCallback(async (dim: JudgeDimension) => {
    setStatuses((prev) => ({ ...prev, [dim]: "streaming" }));
    try {
      const res = await fetch(streams[dim]);
      if (!res.ok) {
        setStatuses((prev) => ({ ...prev, [dim]: "failed" }));
        return;
      }
      const data = await res.json();
      setResults((prev) => ({ ...prev, [dim]: data }));
      setStatuses((prev) => ({ ...prev, [dim]: "complete" }));
    } catch {
      setStatuses((prev) => ({ ...prev, [dim]: "failed" }));
    }
  }, [streams]);

  // Fire all 4 judges in parallel on mount
  useEffect(() => {
    for (const dim of JUDGE_DIMENSIONS) {
      fetchJudge(dim);
    }
  }, [fetchJudge]);

  const completedCount = Object.values(statuses).filter((s) => s === "complete").length;

  // Trigger finalization when all 4 complete
  useEffect(() => {
    if (completedCount < 4 || publishing || published) return;

    setPublishing(true);

    const finalize = async () => {
      const res = await fetch(`/api/evaluate/${proposalId}/finalize`, { method: "POST" });
      const data = await res.json();
      if (data.status === "published") {
        setPublished(true);
        setPublishing(false);
        setTimeout(() => {
          window.location.href = `/grants/${proposalId}`;
        }, 3000);
      }
    };

    finalize();
  }, [completedCount, proposalId, publishing, published]);

  const aggregate = computeLiveAggregate(results);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        {JUDGE_DIMENSIONS.map((dim) => (
          <JudgeCard
            key={dim}
            dimension={dim}
            evaluation={results[dim]}
            status={statuses[dim]}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <ScoreGauge score={aggregate} size="lg" label="Aggregate Score (S0)" />

        {publishing && !published && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Publishing to Base Sepolia...
          </p>
        )}

        {published && (
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-emerald-400">
              Published on-chain
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting to results...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
