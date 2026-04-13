import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { getJudgePrompt } from "./prompts";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";

export const judgeAgents: Record<JudgeDimension, Agent> = Object.fromEntries(
  JUDGE_DIMENSIONS.map((dim) => [
    dim,
    new Agent({
      id: `judge-${dim}`,
      name: `Judge ${dim}`,
      model: anthropic("claude-sonnet-4-20250514"),
      instructions: getJudgePrompt(dim),
    }),
  ])
) as Record<JudgeDimension, Agent>;
