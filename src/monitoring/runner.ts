import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { MonitoringScoreSchema, type MonitoringScore } from "@/evaluation/schemas";
import {
  MONITOR_SYSTEM_PROMPT,
  MONITOR_MODEL_ID,
} from "./agent-config";
import type { GitHubMetrics } from "./github";
import type { OnChainMetrics } from "./onchain";
import type { SocialMetrics } from "./social";

const MONITOR_TIMEOUT_MS = 90_000;

class MonitoringTimeoutError extends Error {
  constructor(projectId: string) {
    super(`Monitoring timed out for project: ${projectId}`);
    this.name = "MonitoringTimeoutError";
  }
}

interface MonitoringInput {
  readonly projectId: string;
  readonly projectName: string;
  readonly githubMetrics: GitHubMetrics;
  readonly onChainMetrics: OnChainMetrics;
  readonly socialMetrics: SocialMetrics;
}

export async function runMonitorAgent(
  input: MonitoringInput
): Promise<MonitoringScore> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MONITOR_TIMEOUT_MS);

  try {
    const result = await generateObject({
      model: openai(MONITOR_MODEL_ID),
      schema: MonitoringScoreSchema,
      system: MONITOR_SYSTEM_PROMPT,
      prompt: `Evaluate the current health and progress of the following funded project.

PROJECT: ${input.projectName} (${input.projectId})

GITHUB METRICS:
- Commit frequency: ${input.githubMetrics.commitFrequency} commits/week
- Issue velocity: ${input.githubMetrics.issueVelocity} issues closed/week
- Releases in period: ${input.githubMetrics.releases}

ON-CHAIN METRICS:
- Transaction count: ${input.onChainMetrics.transactionCount}
- Fund utilization: ${(input.onChainMetrics.fundUtilization * 100).toFixed(1)}%

SOCIAL METRICS:
- Announcements: ${input.socialMetrics.announcements}
- Community engagement score: ${input.socialMetrics.communityEngagement}/10

Produce a structured monitoring score with:
- score: 0-10 overall health score
- justification: detailed reasoning (min 50 chars)
- githubMetrics, onChainMetrics, socialMetrics: echo the input metrics
- riskFlags: any detected risks with type, severity, and description`,
      abortSignal: controller.signal,
    });

    return result.object;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new MonitoringTimeoutError(input.projectId);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { MonitoringTimeoutError };
