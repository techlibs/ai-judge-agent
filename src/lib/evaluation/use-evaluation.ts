"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import type {
  EvaluationOutput,
  EvaluationDimension,
  ProposalEvaluation,
} from "./schemas";

const evaluationOutputEventSchema = z.object({
  score: z.number(),
  justification: z.string(),
  recommendation: z.enum([
    "strong_approve",
    "approve",
    "needs_revision",
    "reject",
  ]),
  keyFindings: z.array(z.string()),
});

const dimensionSchema = z.enum(["technical", "impact", "cost", "team"]);

const progressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("started"),
    proposalId: z.string(),
    totalDimensions: z.number(),
  }),
  z.object({
    type: z.literal("dimension_complete"),
    dimension: dimensionSchema,
    output: evaluationOutputEventSchema,
    completedCount: z.number(),
  }),
  z.object({
    type: z.literal("dimension_failed"),
    dimension: dimensionSchema,
    error: z.string(),
    completedCount: z.number(),
  }),
  z.object({
    type: z.literal("aggregate_computed"),
    weightedScore: z.number(),
    completedDimensions: z.number(),
  }),
  z.object({
    type: z.literal("stored"),
    ipfsCid: z.string(),
    txHash: z.string(),
  }),
  z.object({
    type: z.literal("complete"),
    evaluation: z.object({
      proposalId: z.string(),
      dimensions: z.array(z.unknown()),
      aggregate: z.object({
        weightedScore: z.number(),
        completedDimensions: z.number(),
        computedAt: z.number(),
      }),
      status: z.enum(["evaluating", "evaluated", "failed"]),
    }),
  }),
  z.object({
    type: z.literal("failed"),
    error: z.string(),
  }),
]);

type EvaluationStatus = "idle" | "evaluating" | "evaluated" | "failed";

interface UseEvaluationReturn {
  startEvaluation: (
    proposalId: string,
    proposalText: string,
  ) => Promise<void>;
  status: EvaluationStatus;
  completedDimensions: Map<EvaluationDimension, EvaluationOutput>;
  failedDimensions: Set<EvaluationDimension>;
  aggregate: {
    weightedScore: number;
    completedDimensions: number;
  } | null;
  evaluation: ProposalEvaluation | null;
  ipfsCid: string | null;
  txHash: string | null;
  error: string | null;
  isLoading: boolean;
}

export function useEvaluation(): UseEvaluationReturn {
  const [status, setStatus] = useState<EvaluationStatus>("idle");
  const [completedDimensions, setCompletedDimensions] = useState<
    Map<EvaluationDimension, EvaluationOutput>
  >(new Map());
  const [failedDimensions, setFailedDimensions] = useState<
    Set<EvaluationDimension>
  >(new Set());
  const [aggregate, setAggregate] = useState<{
    weightedScore: number;
    completedDimensions: number;
  } | null>(null);
  const [evaluation, setEvaluation] = useState<ProposalEvaluation | null>(
    null,
  );
  const [ipfsCid, setIpfsCid] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEvaluation = useCallback(
    async (proposalId: string, proposalText: string) => {
      setStatus("evaluating");
      setCompletedDimensions(new Map());
      setFailedDimensions(new Set());
      setAggregate(null);
      setEvaluation(null);
      setIpfsCid(null);
      setTxHash(null);
      setError(null);

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, proposalText }),
      });

      if (!response.ok) {
        const errorJson: unknown = await response.json().catch(() => null);
        const errorMsg =
          errorJson &&
          typeof errorJson === "object" &&
          "error" in errorJson &&
          typeof (errorJson as Record<string, unknown>).error === "string"
            ? (errorJson as Record<string, string>).error
            : `Request failed (${response.status})`;
        setError(errorMsg);
        setStatus("failed");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response stream available");
        setStatus("failed");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);

          let parsed: unknown;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            console.warn("Failed to parse SSE event:", jsonStr);
            continue;
          }

          const result = progressEventSchema.safeParse(parsed);
          if (!result.success) {
            console.warn("Invalid SSE event shape:", result.error);
            continue;
          }

          const event = result.data;

          switch (event.type) {
            case "started":
              break;

            case "dimension_complete":
              setCompletedDimensions((prev) => {
                const next = new Map(prev);
                next.set(
                  event.dimension,
                  event.output as EvaluationOutput,
                );
                return next;
              });
              break;

            case "dimension_failed":
              setFailedDimensions((prev) => {
                const next = new Set(prev);
                next.add(event.dimension);
                return next;
              });
              break;

            case "aggregate_computed":
              setAggregate({
                weightedScore: event.weightedScore,
                completedDimensions: event.completedDimensions,
              });
              break;

            case "stored":
              setIpfsCid(event.ipfsCid);
              setTxHash(event.txHash);
              break;

            case "complete":
              setEvaluation(event.evaluation as ProposalEvaluation);
              setStatus("evaluated");
              break;

            case "failed":
              setError(event.error);
              setStatus("failed");
              break;
          }
        }
      }
    },
    [],
  );

  return {
    startEvaluation,
    status,
    completedDimensions,
    failedDimensions,
    aggregate,
    evaluation,
    ipfsCid,
    txHash,
    error,
    isLoading: status === "evaluating",
  };
}
