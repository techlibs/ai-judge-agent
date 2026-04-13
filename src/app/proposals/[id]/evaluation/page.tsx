"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, AlertTriangle } from "lucide-react";
import { useEvaluation } from "@/lib/evaluation/use-evaluation";
import { EvaluationProgress } from "@/components/evaluation/evaluation-progress";
import { DimensionCard } from "@/components/evaluation/dimension-card";
import { AggregateScore } from "@/components/evaluation/aggregate-score";
import { PromptComparison } from "@/components/evaluation/prompt-comparison";
import { ScoreSummaryCard } from "@/components/evaluation/score-summary-card";
import { DIMENSIONS } from "@/lib/evaluation/constants";

export default function EvaluationPage() {
  const params = useParams();
  const rawId = params.id;
  const id =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId) && rawId.length > 0
        ? rawId[0]
        : undefined;

  const [proposalText, setProposalText] = useState<string | null>(null);
  const [proposalLoading, setProposalLoading] = useState(true);
  const [proposalError, setProposalError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setProposalLoading(true);
    fetch(`/api/proposals/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch proposal");
        return res.json();
      })
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "content" in data &&
          typeof (data as Record<string, unknown>).content === "object"
        ) {
          const content = (data as Record<string, unknown>).content;
          if (content && typeof content === "object" && "description" in content) {
            const desc = (content as Record<string, unknown>).description;
            setProposalText(typeof desc === "string" ? desc : JSON.stringify(content));
          } else {
            setProposalText(JSON.stringify(content));
          }
        } else {
          setProposalError("Proposal content not available");
        }
      })
      .catch(() => setProposalError("Failed to load proposal"))
      .finally(() => setProposalLoading(false));
  }, [id]);

  const {
    startEvaluation,
    status,
    completedDimensions,
    failedDimensions,
    aggregate,
    evaluation,
    naiveOutput,
    error,
  } = useEvaluation();

  const handleStartEvaluation = useCallback(() => {
    if (id && proposalText) {
      startEvaluation(id, proposalText);
    }
  }, [id, proposalText, startEvaluation]);

  if (!id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Proposal not found
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <Link
        href={`/proposals/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Proposal
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Proposal Evaluation</h1>
      </div>

      {/* Idle state */}
      {status === "idle" && (
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <Brain className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Ready for evaluation</h2>
          <p className="max-w-md text-muted-foreground">
            Click Start Evaluation to have four AI judges assess this
            proposal across Technical Feasibility, Impact, Cost
            Efficiency, and Team Capability.
          </p>
          {proposalLoading && (
            <Skeleton className="h-10 w-40" />
          )}
          {proposalError && (
            <p className="text-sm text-destructive">{proposalError}</p>
          )}
          {!proposalLoading && !proposalError && (
            <Button
              onClick={handleStartEvaluation}
              disabled={!proposalText}
            >
              Start Evaluation
            </Button>
          )}
        </div>
      )}

      {/* Evaluating state */}
      {status === "evaluating" && (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            {aggregate ? (
              <AggregateScore
                score={aggregate.weightedScore}
                completedDimensions={aggregate.completedDimensions}
              />
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            )}
            <EvaluationProgress
              completedDimensions={completedDimensions}
              failedDimensions={failedDimensions}
              isEvaluating={true}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {DIMENSIONS.map((dim) => {
              const output = completedDimensions.get(dim.key);
              if (output) {
                return (
                  <DimensionCard
                    key={dim.key}
                    dimension={dim.key}
                    output={output}
                  />
                );
              }
              return (
                <Skeleton
                  key={dim.key}
                  className="h-48 rounded-lg"
                />
              );
            })}
          </div>
        </>
      )}

      {/* Evaluated state */}
      {status === "evaluated" && evaluation && (
        <>
          <div className="mt-6">
            <ScoreSummaryCard
              scores={evaluation.dimensions.map((dimEval) => ({
                dimension: dimEval.dimension,
                score: dimEval.output.score,
              }))}
              aggregateScore={evaluation.aggregate.weightedScore}
              loading={false}
            />
          </div>

          {evaluation.dimensions.length > 0 && (
            <table className="sr-only">
              <caption>Evaluation scores across four dimensions</caption>
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Score</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.dimensions.map((dimEval) => {
                  const dimConfig = DIMENSIONS.find(
                    (d) => d.key === dimEval.dimension,
                  );
                  return (
                    <tr key={dimEval.dimension}>
                      <td>{dimConfig?.label ?? dimEval.dimension}</td>
                      <td>{dimEval.output.score}/100</td>
                      <td>{dimConfig ? `${Math.round(dimConfig.weight * 100)}%` : "N/A"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <AggregateScore
              score={evaluation.aggregate.weightedScore}
              completedDimensions={
                evaluation.aggregate.completedDimensions
              }
            />
            <EvaluationProgress
              completedDimensions={completedDimensions}
              failedDimensions={failedDimensions}
              isEvaluating={false}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIMENSIONS.map((dim) => {
              const dimResult = evaluation.dimensions.find(
                (d) => d.dimension === dim.key,
              );
              if (!dimResult) return null;
              return (
                <DimensionCard
                  key={dim.key}
                  dimension={dim.key}
                  output={dimResult.output}
                />
              );
            })}
          </div>

          <div className="mt-8">
            <PromptComparison
              naiveOutput={naiveOutput ?? undefined}
              structuredOutput={
                evaluation.dimensions.length > 0
                  ? evaluation.dimensions
                      .map((dimEval) => {
                        const dimConfig = DIMENSIONS.find(
                          (d) => d.key === dimEval.dimension,
                        );
                        const label = dimConfig?.label ?? dimEval.dimension;
                        return `${label}: ${dimEval.output.score}/100 (${dimEval.output.recommendation})\n${dimEval.output.justification}\n\nKey Findings:\n${dimEval.output.keyFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;
                      })
                      .join("\n\n---\n\n")
                  : undefined
              }
            />
          </div>
        </>
      )}

      {/* Failed state */}
      {status === "failed" && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Evaluation failed</h2>
          <p className="max-w-md text-muted-foreground">
            {error ??
              "The evaluation could not be completed. This may be due to a temporary issue with the AI service. Try again in a few moments."}
          </p>
          <Button
            onClick={handleStartEvaluation}
            disabled={!proposalText}
          >
            Retry Evaluation
          </Button>
        </div>
      )}
    </div>
  );
}
