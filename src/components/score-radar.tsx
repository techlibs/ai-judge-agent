"use client";

import { DIMENSION_LABELS, SCORING_BANDS, type JudgeDimension } from "@/lib/constants";

interface ScoreRadarProps {
  scores: Partial<Record<JudgeDimension, number | null>>;
  size?: number;
}

const DIMENSIONS: JudgeDimension[] = ["tech", "impact", "cost", "team"];
const ANGLE_OFFSET = -Math.PI / 2; // Start from top

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  totalPoints: number
): { x: number; y: number } {
  const angle = ANGLE_OFFSET + (2 * Math.PI * angleIndex) / totalPoints;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function getScoreColor(score: number): string {
  if (score >= SCORING_BANDS.exceptional.min) return "#34d399"; // emerald-400
  if (score >= SCORING_BANDS.strong.min) return "#60a5fa"; // blue-400
  if (score >= SCORING_BANDS.adequate.min) return "#facc15"; // yellow-400
  if (score >= SCORING_BANDS.weak.min) return "#fb923c"; // orange-400
  return "#f87171"; // red-400
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  scores: number[],
  maxScore: number
): string {
  return scores
    .map((score, i) => {
      const fraction = score / maxScore;
      const point = polarToCartesian(cx, cy, radius * fraction, i, scores.length);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

const MAX_SCORE = 10000;
const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];

export function ScoreRadar({ scores, size = 280 }: ScoreRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const labelRadius = size * 0.46;

  const scoreValues = DIMENSIONS.map((dim) => scores[dim] ?? 0);
  const hasScores = scoreValues.some((s) => s > 0);

  // Compute average for fill color
  const validScores = scoreValues.filter((s) => s > 0);
  const avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;
  const fillColor = hasScores ? getScoreColor(avgScore) : "#6b7280";

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none"
      >
        {/* Grid lines */}
        {GRID_LEVELS.map((level) => {
          const points = DIMENSIONS.map((_, i) => {
            const point = polarToCartesian(cx, cy, radius * level, i, DIMENSIONS.length);
            return `${point.x},${point.y}`;
          }).join(" ");

          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth={level === 1.0 ? 1.5 : 0.5}
              className="text-muted-foreground/20"
            />
          );
        })}

        {/* Axis lines */}
        {DIMENSIONS.map((_, i) => {
          const point = polarToCartesian(cx, cy, radius, i, DIMENSIONS.length);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              strokeWidth={0.5}
              className="text-muted-foreground/20"
            />
          );
        })}

        {/* Score polygon */}
        {hasScores && (
          <polygon
            points={buildPolygonPoints(cx, cy, radius, scoreValues, MAX_SCORE)}
            fill={fillColor}
            fillOpacity={0.2}
            stroke={fillColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Score dots */}
        {hasScores &&
          scoreValues.map((score, i) => {
            const fraction = score / MAX_SCORE;
            const point = polarToCartesian(cx, cy, radius * fraction, i, DIMENSIONS.length);
            const dotColor = getScoreColor(score);
            return (
              <circle
                key={`dot-${i}`}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={dotColor}
                stroke="currentColor"
                strokeWidth={1}
                className="text-background"
              />
            );
          })}

        {/* Dimension labels */}
        {DIMENSIONS.map((dim, i) => {
          const point = polarToCartesian(cx, cy, labelRadius, i, DIMENSIONS.length);
          const score = scores[dim];
          const displayScore = score !== null && score !== undefined
            ? (score / 100).toFixed(1)
            : "--";

          return (
            <g key={`label-${dim}`}>
              <text
                x={point.x}
                y={point.y - 8}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground text-[11px] font-medium"
              >
                {DIMENSION_LABELS[dim]}
              </text>
              <text
                x={point.x}
                y={point.y + 8}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-muted-foreground text-[10px] font-mono tabular-nums"
              >
                {displayScore}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
