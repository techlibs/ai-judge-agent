import { describe, it, expect, mock, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

interface MockStore {
  proposals: Array<Record<string, unknown>>;
  aggregateScores: Array<Record<string, unknown>>;
}

const store: MockStore = {
  proposals: [],
  aggregateScores: [],
};

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function parseEqCondition(
  condition: unknown
): { columnName: string; value: unknown } | undefined {
  if (!condition || typeof condition !== "object") return undefined;
  const cond = condition as Record<string, unknown>;

  const left = cond.left as Record<string, unknown> | undefined;
  const right = cond.right as Record<string, unknown> | undefined;
  if (left?.name && right && "value" in right) {
    return { columnName: snakeToCamel(left.name as string), value: right.value };
  }

  const chunks = cond.queryChunks as Array<Record<string, unknown>> | undefined;
  if (!chunks || chunks.length < 4) return undefined;
  const column = chunks[1];
  const param = chunks[3];
  if (column?.name && param && "value" in param) {
    return { columnName: snakeToCamel(column.name as string), value: param.value };
  }
  return undefined;
}

function filterByCondition(
  items: Array<Record<string, unknown>>,
  condition: unknown
): Array<Record<string, unknown>> {
  const parsed = parseEqCondition(condition);
  if (!parsed) return items;
  return items.filter((item) => item[parsed.columnName] === parsed.value);
}

const mockDb = {
  query: {
    proposals: {
      findFirst(opts?: { where?: unknown }) {
        const results = filterByCondition(store.proposals, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
    aggregateScores: {
      findFirst(opts?: { where?: unknown }) {
        const results = filterByCondition(store.aggregateScores, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
  },
};

mock.module("@/lib/db/client", () => ({
  getDb: () => mockDb,
}));

// ---------------------------------------------------------------------------
// Mock orchestrator
// ---------------------------------------------------------------------------

let mockOrchestratorResult: { complete: boolean; aggregateScore?: number } = {
  complete: false,
};
let mockOrchestratorShouldThrow = false;

mock.module("@/lib/evaluation/orchestrator", () => ({
  checkAndFinalizeEvaluation: async (_id: string) => {
    if (mockOrchestratorShouldThrow) {
      throw new Error("Orchestrator failure");
    }
    return mockOrchestratorResult;
  },
}));

// Import route AFTER mocking
const { POST } = await import("@/app/api/evaluate/[id]/finalize/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest() {
  return new Request("http://localhost:3000/api/evaluate/prop-001/finalize", {
    method: "POST",
  });
}

function callPost(id: string) {
  return POST(createRequest(), {
    params: Promise.resolve({ id }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/evaluate/[id]/finalize", () => {
  beforeEach(() => {
    store.proposals.length = 0;
    store.aggregateScores.length = 0;
    mockOrchestratorResult = { complete: false };
    mockOrchestratorShouldThrow = false;
  });

  it("returns 200 with published status when workflow completed and orchestrator publishes on-chain", async () => {
    store.proposals.push({ id: "prop-001", status: "evaluated" });
    store.aggregateScores.push({ proposalId: "prop-001", scoreBps: 7500 });
    mockOrchestratorResult = { complete: true, aggregateScore: 7500 };

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.status).toBe("published");
    expect(data.aggregateScore).toBe(7500);
  });

  it("returns 202 when workflow is still in progress", async () => {
    store.proposals.push({ id: "prop-001", status: "evaluating" });

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(202);
    expect(data.status).toBe("evaluating");
  });

  it("returns 500 with failed status when proposal failed", async () => {
    store.proposals.push({ id: "prop-001", status: "failed" });

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data.status).toBe("failed");
  });

  it("returns 404 for non-existent proposal", async () => {
    const result = await callPost("nonexistent-id");
    const data = await result.json();

    expect(result.status).toBe(404);
    expect(data.error).toBe("Proposal not found");
  });

  it("returns idempotent success when proposal already published", async () => {
    store.proposals.push({ id: "prop-001", status: "published" });
    store.aggregateScores.push({ proposalId: "prop-001", scoreBps: 8200 });

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.status).toBe("published");
    expect(data.aggregateScore).toBe(8200);
  });

  it("returns 500 when on-chain publish throws", async () => {
    store.proposals.push({ id: "prop-001", status: "evaluated" });
    store.aggregateScores.push({ proposalId: "prop-001", scoreBps: 7500 });
    mockOrchestratorShouldThrow = true;

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data.status).toBe("failed");
  });
});
