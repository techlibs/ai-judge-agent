import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createProposalFixture } from "../helpers/mocks";

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

interface MockStore {
  proposals: Array<Record<string, unknown>>;
}

const store: MockStore = {
  proposals: [],
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
  },
  update(_table: unknown) {
    return {
      set(data: Record<string, unknown>) {
        return {
          where(condition: unknown) {
            const parsed = parseEqCondition(condition);
            if (parsed) {
              for (const item of store.proposals) {
                if (item[parsed.columnName] === parsed.value) {
                  Object.assign(item, data);
                }
              }
            }
            return Promise.resolve();
          },
        };
      },
    };
  },
};

mock.module("@/lib/db/client", () => ({
  getDb: () => mockDb,
}));

let ipRateLimitSuccess = true;
let ipRateLimitReset = Date.now() + 3600_000;
let globalRateLimitSuccess = true;

mock.module("@/lib/rate-limit", () => ({
  proposalSubmitLimiter: {
    limit: async (_key: string) => ({ success: true, reset: Date.now() }),
  },
  evaluationTriggerLimiter: {
    limit: async (_key: string) => ({
      success: ipRateLimitSuccess,
      reset: ipRateLimitReset,
    }),
  },
  globalEvaluationLimiter: {
    limit: async (_key: string) => ({
      success: globalRateLimitSuccess,
      reset: Date.now() + 60_000,
    }),
  },
}));

mock.module("@/lib/security-log", () => ({
  logSecurityEvent: () => {},
}));

// Import route AFTER mocking
const { POST } = await import("@/app/api/evaluate/[id]/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(headers?: Record<string, string>) {
  return new Request("http://localhost:3000/api/evaluate/prop-001", {
    method: "POST",
    headers: {
      "origin": "http://localhost:3000",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
  });
}

function callPost(id: string, headers?: Record<string, string>) {
  return POST(createRequest(headers), {
    params: Promise.resolve({ id }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/evaluate/[id]", () => {
  beforeEach(() => {
    store.proposals.length = 0;
    ipRateLimitSuccess = true;
    ipRateLimitReset = Date.now() + 3600_000;
    globalRateLimitSuccess = true;
  });

  it("returns 200 with evaluating status and stream URLs for pending proposal", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001", status: "pending" }));

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.status).toBe("evaluating");
    expect(data.streams).toBeDefined();
  });

  it("returns 404 when proposal is not found", async () => {
    const result = await callPost("nonexistent");
    const data = await result.json();

    expect(result.status).toBe(404);
    expect(data.error).toBe("Proposal not found");
  });

  it("returns 409 when proposal is already evaluating", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001", status: "evaluating" }));

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(409);
    expect(data.error).toBe("Proposal already being evaluated");
  });

  it("returns 429 when per-IP rate limit is exceeded", async () => {
    ipRateLimitSuccess = false;
    ipRateLimitReset = Date.now() + 1800_000;

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(429);
    expect(data.error).toBe("RATE_LIMITED");
    expect(result.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 503 when global evaluation capacity is exceeded", async () => {
    globalRateLimitSuccess = false;

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(503);
    expect(data.error).toBe("TOO_MANY_EVALUATIONS");
  });

  it("returns all 4 dimension stream URLs", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001", status: "pending" }));

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(data.streams.tech).toBe("/api/evaluate/prop-001/tech");
    expect(data.streams.impact).toBe("/api/evaluate/prop-001/impact");
    expect(data.streams.cost).toBe("/api/evaluate/prop-001/cost");
    expect(data.streams.team).toBe("/api/evaluate/prop-001/team");
  });

  it("rejects already published proposal", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001", status: "published" }));

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(409);
    expect(data.error).toBe("Proposal already being evaluated");
  });
});
