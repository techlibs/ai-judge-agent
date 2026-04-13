"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RecommendationBadge } from "./recommendation-badge";
import { ScoreBandLabel } from "./score-band-label";
import type {
  EvaluationOutput,
  EvaluationDimension,
} from "@/lib/evaluation/schemas";
import { DIMENSIONS } from "@/lib/evaluation/constants";

interface DimensionCardProps {
  dimension: EvaluationDimension;
  output: EvaluationOutput;
}

export function DimensionCard({ dimension, output }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const dimensionMeta = DIMENSIONS.find((d) => d.key === dimension);
  const label = dimensionMeta ? dimensionMeta.label : dimension;
  const weightPercent = dimensionMeta
    ? Math.round(dimensionMeta.weight * 100)
    : 0;

  return (
    <Card
      aria-expanded={expanded}
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => setExpanded((prev) => !prev)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[20px] font-semibold">
            {label}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            ({weightPercent}%)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[20px] font-semibold">
            {output.score}/100
          </span>
          <ScoreBandLabel
            score={output.score}
            className="text-sm text-muted-foreground"
          />
        </div>
        <RecommendationBadge recommendation={output.recommendation} />
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Justification</p>
            <p
              className={`text-base ${expanded ? "" : "line-clamp-2"}`}
            >
              {output.justification}
            </p>
          </div>

          {expanded && (
            <div>
              <p className="text-sm font-semibold">Key Findings</p>
              <ul className="list-disc pl-5 text-base">
                {output.keyFindings.map((finding, i) => (
                  <li key={i}>{finding}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          className="mt-2 text-xs text-muted-foreground underline underline-offset-2"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          aria-label={`Show full evaluation for ${label}`}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      </CardContent>
    </Card>
  );
}
