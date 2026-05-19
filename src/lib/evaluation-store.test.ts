import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { StoredEvaluation } from "./evaluation-store";

let tmpDir: string;
let store: typeof import("./evaluation-store");

async function loadStore() {
  process.env.EVALUATION_STORE_DIR = tmpDir;
  // re-import so module-level dir constants pick up env
  const mod = await import("./evaluation-store?t=" + Date.now());
  return mod as unknown as typeof import("./evaluation-store");
}

function makeRecord(overrides: Partial<StoredEvaluation> = {}): StoredEvaluation {
  return {
    proposalId: "p-1",
    proposalIdHex: "0xabc",
    title: "Solar Network",
    aggregateScoreBps: 7200,
    dimensions: [],
    anomalyFlags: [],
    evaluatedAt: "2026-05-19T12:00:00.000Z",
    chain: { status: "pending" },
    ...overrides,
  };
}

describe("evaluation-store", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "eval-store-test-"));
    store = await loadStore();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("save + get round-trip", async () => {
    const rec = makeRecord();
    await store.saveEvaluation(rec);
    const got = await store.getEvaluation("p-1");
    expect(got).toEqual(rec);
  });

  it("returns null for missing id", async () => {
    expect(await store.getEvaluation("nope")).toBeNull();
  });

  it("list returns all sorted by evaluatedAt desc", async () => {
    await store.saveEvaluation(makeRecord({ proposalId: "p-1", evaluatedAt: "2026-05-19T10:00:00.000Z" }));
    await store.saveEvaluation(makeRecord({ proposalId: "p-2", evaluatedAt: "2026-05-19T12:00:00.000Z" }));
    await store.saveEvaluation(makeRecord({ proposalId: "p-3", evaluatedAt: "2026-05-19T11:00:00.000Z" }));
    const all = await store.listEvaluations();
    expect(all.map((r) => r.proposalId)).toEqual(["p-2", "p-3", "p-1"]);
  });

  it("updateChainStatus patches one record without touching others", async () => {
    await store.saveEvaluation(makeRecord({ proposalId: "p-1" }));
    await store.saveEvaluation(makeRecord({ proposalId: "p-2" }));
    await store.updateChainStatus("p-1", {
      status: "confirmed",
      txHash: "0xdead",
      blockNumber: 123,
    });
    const p1 = await store.getEvaluation("p-1");
    const p2 = await store.getEvaluation("p-2");
    expect(p1?.chain).toMatchObject({ status: "confirmed", txHash: "0xdead", blockNumber: 123 });
    expect(p2?.chain).toEqual({ status: "pending" });
  });

  it("updateChainStatus on missing id is a no-op (does not throw)", async () => {
    await expect(store.updateChainStatus("missing", { status: "failed", error: "x" })).resolves.toBeUndefined();
  });

  it("rejects path traversal in proposalId", async () => {
    await expect(
      store.saveEvaluation(makeRecord({ proposalId: "../escape" })),
    ).rejects.toThrow(/invalid proposal id/i);
    await expect(store.getEvaluation("../escape")).rejects.toThrow(/invalid proposal id/i);
  });
});
