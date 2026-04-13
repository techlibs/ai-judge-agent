import { getScoreBand } from "@/lib/evaluation/constants";

interface ScoreBandLabelProps {
  score: number;
  className?: string;
}

export function ScoreBandLabel({ score, className }: ScoreBandLabelProps) {
  return <span className={className}>{getScoreBand(score)}</span>;
}
