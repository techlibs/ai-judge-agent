import { promises as fs } from "node:fs";
import path from "node:path";
import type { DimensionResult } from "@/lib/evaluation/workflow";

export interface ChainStatus {
  status: "pending" | "confirmed" | "failed";
  txHash?: `0x${string}`;
  blockNumber?: number;
  proposalContentCid?: string;
  evaluationContentCid?: string;
  error?: string;
}

export interface StoredEvaluation {
  proposalId: string;
  proposalIdHex: `0x${string}` | string;
  title: string;
  aggregateScoreBps: number;
  dimensions: DimensionResult[];
  anomalyFlags: string[];
  evaluatedAt: string;
  chain: ChainStatus;
}

const VALID_ID = /^[A-Za-z0-9_-]+$/;

function getDir(): string {
  return process.env.EVALUATION_STORE_DIR ?? "/tmp/evaluations";
}

function assertId(id: string): void {
  if (!VALID_ID.test(id)) {
    throw new Error(`invalid proposal id: ${id}`);
  }
}

function recordPath(id: string): string {
  return path.join(getDir(), `${id}.json`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(getDir(), { recursive: true });
}

export async function saveEvaluation(rec: StoredEvaluation): Promise<void> {
  assertId(rec.proposalId);
  await ensureDir();
  const tmp = `${recordPath(rec.proposalId)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rec, null, 2), "utf8");
  await fs.rename(tmp, recordPath(rec.proposalId));
}

export async function getEvaluation(id: string): Promise<StoredEvaluation | null> {
  assertId(id);
  try {
    const raw = await fs.readFile(recordPath(id), "utf8");
    return JSON.parse(raw) as StoredEvaluation;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function listEvaluations(): Promise<StoredEvaluation[]> {
  try {
    await ensureDir();
    const files = await fs.readdir(getDir());
    const records: StoredEvaluation[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(getDir(), f), "utf8");
        records.push(JSON.parse(raw) as StoredEvaluation);
      } catch {
        // skip corrupt files
      }
    }
    records.sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));
    return records;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function updateChainStatus(
  id: string,
  patch: Partial<ChainStatus>,
): Promise<void> {
  const existing = await getEvaluation(id);
  if (!existing) return;
  const merged: StoredEvaluation = {
    ...existing,
    chain: { ...existing.chain, ...patch },
  };
  await saveEvaluation(merged);
}
