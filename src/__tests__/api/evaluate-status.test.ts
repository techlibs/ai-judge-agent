import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createProposalFixture, createEvaluationFixture, createAggregateFixture } from "../helpers/mocks";

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

interface MockStore {
  proposals: Array<Record<string, unknown>>;
  evaluations: Array<Record<string, unknown>>;
  aggregateScores: Array<Record<string, unknown>>;
}

const store: MockStore = {
  proposals: [],
  evaluations: [],
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
  if (chunks && chunks.length >= 4) {
    const column = chunks[1];
    const param = chunks[3];
    if (column?.name && param && "value" in param) {
      return { columnName: snakeToCamel(column.name as string), value: param.value };
    }
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
    evaluations: {
      findMany(opts?: { where?: unknown }) {
        const results = filterByCondition(store.evaluations, opts?.where);
        return Promise.resolve(results);
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

// Import route AFTER mocking
const { GET } = await import("@/app/api/evaluate/[id]/status/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest() {
  return new Request("http://localhost:3000/api/evaluate/prop-001/status", {
    method: "GET",
  });
}

function callGet(id: string) {
  return GET(createGetRequest(), {
    params: Promise.resolve({ id }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/evaluate/[id]/status", () => {
  beforeEach(() => {
    store.proposals.length = 0;
    store.evaluations.length = 0;
    store.aggregateScores.length = 0;
  });

  it("returns status with empty dimensions when no evaluations exist", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001", status: "evaluating" }));

    const result = await callGet("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.status).toBe("evaluating");
    expect(Object.keys(data.dimensions)).toHaveLength(0);
    expect(data.aggregateScore).toBeUndefined();
  });

  it("shows only completed dimensions when evaluations are partial", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001", status: "evaluating" }));
    store.evaluations.push(
      createEvaluationFixture("tech", { proposalId: "prop-001", status: "complete", score: 7500 }),
      createEvaluationFixture("impact", { proposalId: "prop-001", status: "streaming", score: null })
    );

    const result = await callGet("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(Object.keys(data.dimensions)).toHaveLength(2);
    expect(data.dimensions.tech.status).toBe("complete");
    expect(data.dimensions.impact.status).toBe("streaming");
  });

  it("returns full response with all evaluations and aggregate score", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001", status: "evaluated" }));
    store.evaluations.push(
      createEvaluationFixture("tech", { proposalId: "prop-001", status: "complete", score: 8000 }),
      createEvaluationFixture("impact", { proposalId: "prop-001", status: "complete", score: 7500 }),
      createEvaluationFixture("cost", { proposalId: "prop-001", status: "complete", score: 7000 }),
      createEvaluationFixture("team", { proposalId: "prop-001", status: "complete", score: 8500 })
    );
    store.aggregateScores.push(
      createAggregateFixture({ proposalId: "prop-001", scoreBps: 7750 })
    );

    const result = await callGet("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(Object.keys(data.dimensions)).toHaveLength(4);
    expect(data.aggregateScore).toBe(7750);
  });

  it("includes chainTxHash when proposal is published", async () => {
    store.proposals.push(
      createProposalFixture({
        id: "prop-001",
        status: "published",
        chainTxHash: "0xabc123def456",
      })
    );
    store.evaluations.push(
      createEvaluationFixture("tech", { proposalId: "prop-001", status: "complete" })
    );

    const result = await callGet("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.chainTxHash).toBe("0xabc123def456");
  });

  it("returns 404 when proposal is not found", async () => {
    const result = await callGet("nonexistent");
    const data = await result.json();

    expect(result.status).toBe(404);
    expect(data.error).toBe("Not found");
  });
});
