"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface DimensionScore {
  readonly dimension: string;
  readonly score: number;
}

const CHART_DIMENSION_LABELS: Record<string, string> = {
  technical: "Technical",
  impact: "Impact",
  cost: "Cost",
  team: "Team",
};

const chartConfig = {
  score: {
    label: "Score",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    setPrefersReducedMotion(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

export function ScoreRadarChart({
  scores,
}: {
  scores: ReadonlyArray<DimensionScore>;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const chartData = scores.map((s) => ({
    dimension:
      CHART_DIMENSION_LABELS[s.dimension] ?? s.dimension,
    score: s.score,
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="min-h-[250px] w-full"
      aria-label="Radar chart showing evaluation scores across four dimensions"
    >
      <RadarChart data={chartData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dimension" />
        <Radar
          dataKey="score"
          fill="var(--chart-1)"
          fillOpacity={0.5}
          stroke="var(--chart-1)"
          strokeWidth={2}
          isAnimationActive={!prefersReducedMotion}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
      </RadarChart>
    </ChartContainer>
  );
}
