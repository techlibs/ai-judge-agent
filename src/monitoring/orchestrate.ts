import { type Hex } from "viem";
import { collectGitHubMetrics, DEFAULT_PERIOD_DAYS } from "./github";
import { collectOnChainMetrics } from "./onchain";
import { collectSocialMetrics } from "./social";
import { runMonitorAgent } from "./runner";
import { pinJsonToIpfs } from "@/ipfs/pin";
import { MonitoringReportSchema } from "@/ipfs/schemas";
import type { MonitoringReport } from "@/ipfs/schemas";
import { getDeploymentBlock } from "@/chain/contracts";

interface MonitoringParams {
  readonly projectId: string;
  readonly projectName: string;
  readonly projectAddress: Hex;
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly totalFunded: bigint;
}

interface MonitoringResult {
  readonly projectId: string;
  readonly score: number;
  readonly monitoringReportCid: string;
  readonly riskFlags: ReadonlyArray<{
    readonly type: string;
    readonly severity: string;
    readonly description: string;
  }>;
}

export async function orchestrateMonitoring(
  params: MonitoringParams
): Promise<MonitoringResult> {
  const fromBlock = getDeploymentBlock();

  const [githubMetrics, onChainMetrics, socialMetrics] = await Promise.all([
    collectGitHubMetrics({
      owner: params.githubOwner,
      repo: params.githubRepo,
      periodDays: DEFAULT_PERIOD_DAYS,
    }),
    collectOnChainMetrics({
      projectAddress: params.projectAddress,
      totalFunded: params.totalFunded,
      fromBlock,
    }),
    collectSocialMetrics({
      projectName: params.projectName,
    }),
  ]);

  const monitoringScore = await runMonitorAgent({
    projectId: params.projectId,
    projectName: params.projectName,
    githubMetrics,
    onChainMetrics,
    socialMetrics,
  });

  const monitoringReport: MonitoringReport = {
    version: 1,
    projectId: params.projectId,
    score: monitoringScore.score,
    justification: monitoringScore.justification,
    githubMetrics: monitoringScore.githubMetrics,
    onChainMetrics: monitoringScore.onChainMetrics,
    socialMetrics: monitoringScore.socialMetrics,
    riskFlags: [...monitoringScore.riskFlags],
    monitoredAt: new Date().toISOString(),
  };

  const monitoringReportCid = await pinJsonToIpfs(
    MonitoringReportSchema,
    monitoringReport
  );

  return {
    projectId: params.projectId,
    score: monitoringScore.score,
    monitoringReportCid,
    riskFlags: monitoringScore.riskFlags,
  };
}
