import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReputationSummaryCardProps {
  readonly summary: {
    readonly feedbackCount: number;
    readonly averageScore: number;
  };
  readonly agentId: string;
}

export function ReputationSummaryCard({
  summary,
  agentId,
}: ReputationSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>On-Chain Reputation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              Average Score
            </span>
            <span
              className="text-[28px] font-semibold leading-[1.2] text-emerald-600"
              aria-label={`Score: ${summary.averageScore.toFixed(1)} out of 100`}
            >
              {summary.averageScore.toFixed(1)}/100
            </span>
          </div>

          <div className="hidden h-12 w-px bg-border md:block" />

          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              Evaluations
            </span>
            <span className="text-sm">
              Based on {summary.feedbackCount} evaluation
              {summary.feedbackCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="hidden h-12 w-px bg-border md:block" />

          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              Identity
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="text-sm text-muted-foreground">
                  Identity #{agentId}
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    ERC-8004 Identity Token #{agentId} on Base Sepolia
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
