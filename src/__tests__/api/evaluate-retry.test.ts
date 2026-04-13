import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createEvaluationFixture } from "../helpers/mocks";

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

interface MockStore {
  evaluations: Array<Record<string, unknown>>;
}

const store: MockStore = {
  evaluations: [],
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

/**
 * Parse drizzle and() conditions which wrap multiple eq() calls.
 */
function parseConditions(
  condition: unknown
): Array<{ columnName: string; value: unknown }> {
  if (!condition || typeof condition !== "object") return [];
  const cond = condition as Record<string, unknown>;

  // Single eq()
  const single = parseEqCondition(condition);
  if (single) return [single];

  // and() wraps queryChunks with nested eq conditions
  if (cond.type === "and" && Array.isArray(cond.queryChunks)) {
    const results: Array<{ columnName: string; value: unknown }> = [];
    for (const chunk of cond.queryChunks as Array<unknown>) {
      const parsed = parseEqCondition(chunk);
      if (parsed) results.push(parsed);
    }
    return results;
  }

  return [];
}

function filterByConditions(
  items: Array<Record<string, unknown>>,
  condition: unknown
): Array<Record<string, unknown>> {
  const conditions = parseConditions(condition);
  if (conditions.length === 0) return items;
  return items.filter((item) =>
    conditions.every((c) => item[c.columnName] === c.value)
  );
}

const mockDb = {
  query: {
    evaluations: {
      findFirst(opts?: { where?: unknown }) {
        const results = filterByConditions(store.evaluations, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
  },
  delete(_table: unknown) {
    return {
      where(condition: unknown) {
        const conditions = parseConditions(condition);
        if (conditions.length > 0) {
          const idx = store.evaluations.findIndex((item) =>
            conditions.every((c) => item[c.columnName] === c.value)
          );
          if (idx !== -1) store.evaluations.splice(idx, 1);
        }
        return Promise.resolve();
      },
    };
  },
};

mock.module("@/lib/db/client", () => ({
  getDb: () => mockDb,
}));

// Import route AFTER mocking
const { POST } = await import(
  "@/app/api/evaluate/[id]/[dimension]/retry/route"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest() {
  return new Request("http://localhost:3000/api/evaluate/prop-001/tech/retry", {
    method: "POST",
  });
}

function callPost(id: string, dimension: string) {
  return POST(createRequest(), {
    params: Promise.resolve({ id, dimension }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/evaluate/[id]/[dimension]/retry", () => {
  beforeEach(() => {
    store.evaluations.length = 0;
  });

  it("returns 200 with ready status for a failed evaluation", async () => {
    store.evaluations.push(
      createEvaluationFixture("tech", {
        id: "eval-tech-001",
        proposalId: "prop-001",
        status: "failed",
      })
    );

    const result = await callPost("prop-001", "tech");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.status).toBe("ready");
    expect(data.stream).toBe("/api/evaluate/prop-001/tech");
  });

  it("returns 409 when evaluation is not in failed state", async () => {
    store.evaluations.push(
      createEvaluationFixture("tech", {
        id: "eval-tech-001",
        proposalId: "prop-001",
        status: "complete",
      })
    );

    const result = await callPost("prop-001", "tech");
    const data = await result.json();

    expect(result.status).toBe(409);
    expect(data.error).toBe("Evaluation is not in failed state");
  });

  it("returns 400 for an invalid dimension", async () => {
    const result = await callPost("prop-001", "invalid");
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data.error).toBe("Invalid dimension");
  });

  it("returns 404 when no evaluation is found", async () => {
    const result = await callPost("prop-001", "tech");
    const data = await result.json();

    expect(result.status).toBe(404);
    expect(data.error).toBe("No evaluation found");
  });
});
