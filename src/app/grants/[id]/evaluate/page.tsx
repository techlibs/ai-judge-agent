"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EvaluationTheater } from "@/components/evaluation-theater";
import type { JudgeDimension } from "@/lib/constants";

export default function EvaluatePage() {
  const params = useParams<{ id: string }>();
  const [streams, setStreams] = useState<Record<JudgeDimension, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function triggerEvaluation() {
      const res = await fetch(`/api/evaluate/${params.id}`, { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to start evaluation");
        return;
      }

      const data = await res.json();
      setStreams(data.streams);
    }

    triggerEvaluation();
  }, [params.id]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4 text-destructive">Error</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!streams) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Starting Evaluation...</h1>
        <p className="text-muted-foreground animate-pulse">Preparing AI judges</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Live Evaluation</h1>
        <p className="text-muted-foreground">4 AI judges evaluating in parallel</p>
      </div>
      <EvaluationTheater proposalId={params.id} streams={streams} />
    </div>
  );
}
