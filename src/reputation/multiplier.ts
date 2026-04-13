import { getReputationSummary } from "@/chain/reputation-registry";

const MIN_REPUTATION_MULTIPLIER = 1.0;
const MAX_REPUTATION_MULTIPLIER = 1.05;
const REPUTATION_DIVISOR = 10_000;
const BASIS_POINTS = 10_000;

export async function lookupReputationIndex(
  agentId: bigint
): Promise<number> {
  try {
    const summary = await getReputationSummary(agentId);
    const activeFeedback = Number(summary.activeFeedback);

    if (activeFeedback === 0) {
      return 0;
    }

    const averageValueBps = Number(summary.averageValueBps);
    return Math.floor(averageValueBps / BASIS_POINTS);
  } catch {
    return 0;
  }
}

export function computeReputationMultiplierFromIndex(
  reputationIndex: number
): number {
  const raw = MIN_REPUTATION_MULTIPLIER + reputationIndex / REPUTATION_DIVISOR;
  return Math.min(raw, MAX_REPUTATION_MULTIPLIER);
}

export async function getReputationMultiplier(
  agentId: bigint
): Promise<number> {
  const index = await lookupReputationIndex(agentId);
  return computeReputationMultiplierFromIndex(index);
}
