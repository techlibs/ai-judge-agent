"use client";

import { SCORING_BANDS } from "@/lib/constants";

interface ScoreGaugeProps {
  score: number | null; // basis points 0-10000
  size?: "sm" | "md" | "lg";
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= SCORING_BANDS.exceptional.min) return "stroke-emerald-400";
  if (score >= SCORING_BANDS.strong.min) return "stroke-blue-400";
  if (score >= SCORING_BANDS.adequate.min) return "stroke-yellow-400";
  if (score >= SCORING_BANDS.weak.min) return "stroke-orange-400";
  return "stroke-red-400";
}

const SIZES = {
  sm: { dimension: 64, strokeWidth: 4, fontSize: "text-sm" },
  md: { dimension: 96, strokeWidth: 6, fontSize: "text-xl" },
  lg: { dimension: 128, strokeWidth: 8, fontSize: "text-3xl" },
} as const;

export function ScoreGauge({ score, size = "md", label }: ScoreGaugeProps) {
  const { dimension, strokeWidth, fontSize } = SIZES[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = score !== null ? score / 10000 : 0;
  const dashOffset = circumference * (1 - percentage);
  const displayScore = score !== null ? (score / 100).toFixed(1) : "\u2014";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="-rotate-90">
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {score !== null && (
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
            />
          )}
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold tabular-nums ${fontSize}`}>
          {displayScore}
        </span>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
