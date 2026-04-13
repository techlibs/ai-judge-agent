import { ScoreBandLabel } from "./score-band-label";
import { getScoreBand } from "@/lib/evaluation/constants";

const TOTAL_DIMENSIONS = 4;

interface AggregateScoreProps {
  score: number;
  completedDimensions: number;
  className?: string;
}

export function AggregateScore({
  score,
  completedDimensions,
  className,
}: AggregateScoreProps) {
  const isPartial = completedDimensions < TOTAL_DIMENSIONS;

  return (
    <div
      className={className}
      aria-label={`Overall evaluation score: ${score} out of 100, rated ${getScoreBand(score)}`}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-[28px] font-semibold leading-[1.2] text-primary">
          {score}
          {isPartial && "*"}
        </span>
        <span className="text-muted-foreground">/100</span>
      </div>
      <ScoreBandLabel score={score} className="text-base" />
      <p className="text-sm text-muted-foreground">Overall Score</p>
      {isPartial && (
        <p className="text-xs text-muted-foreground">
          *Based on {completedDimensions} of {TOTAL_DIMENSIONS} dimensions
        </p>
      )}
    </div>
  );
}
