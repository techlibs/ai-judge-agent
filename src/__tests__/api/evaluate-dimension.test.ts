import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createProposalFixture,
  createEvaluationFixture,
  createMockIpfs,
} from "../helpers/mocks";

// ---------------------------------------------------------------------------
// Mock judge output
// ---------------------------------------------------------------------------

const mockJudgeOutput = {
  score: 7500,
  scoreDecimals: 2 as const,
  confidence: "high" as const,
  recommendation: "fund" as const,
  justification: "Strong proposal with clear technical approach.",
  keyFindings: ["Solid architecture", "Experienced team"],
  risks: ["Timeline ambitious"],
  ipeAlignment: { proTechnology: 80, proFreedom: 70, proHumanProgress: 90 },
};

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the route
// ---------------------------------------------------------------------------

let judgeGenerateResult: { object: typeof mockJudgeOutput | null } = {
  object: mockJudgeOutput,
};
let judgeShouldThrow = false;

mock.module("@mastra/core/agent", () => ({
  Agent: class MockAgent {
    generate() {
      if (judgeShouldThrow) {
        throw new Error("LLM call failed");
      }
      return Promise.resolve(judgeGenerateResult);
    }
  },
}));

mock.module("@ai-sdk/anthropic", () => ({
  anthropic: (_model: string) => "mock-anthropic-model",
}));

const mockMastraAgent = {
  generate() {
    if (judgeShouldThrow) {
      throw new Error("LLM call failed");
    }
    return Promise.resolve(judgeGenerateResult);
  },
};

mock.module("@/lib/mastra", () => ({
  mastra: {
    getAgent: (_name: string) => mockMastraAgent,
  },
}));

// Mock @mastra/evals/scorers/prebuilt so the real scorers.ts runs but with
// controlled outputs — avoids clobbering the @/lib/evaluation/scorers module
// entry that scorers.test.ts tests directly.
mock.module("@mastra/evals/scorers/prebuilt", () => ({
  createFaithfulnessScorer: () => ({
    score: async () => ({ score: 0.9 }),
  }),
  createHallucinationScorer: () => ({
    score: async () => ({ score: 0.1 }),
  }),
  createPromptAlignmentScorerLLM: () => ({
    score: async () => ({ score: 0.9 }),
  }),
}));

mock.module("@/lib/security-log", () => ({
  logSecurityEvent: () => undefined,
}));

mock.module("@/lib/judges/agents", () => ({
  detectInjectionPatterns: () => [],
  judgeAgents: {
    tech: {},
    impact: {},
    cost: {},
    team: {},
  },
}));

// ---------------------------------------------------------------------------
// Mock DB with Symbol-based drizzle table name resolution
// ---------------------------------------------------------------------------

interface MockDbStore {
  proposals: Array<Record<string, unknown>>;
  evaluations: Array<Record<string, unknown>>;
}

const store: MockDbStore = {
  proposals: [],
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
      return {
        columnName: snakeToCamel(column.name as string),
        value: param.value,
      };
    }
  }
  return undefined;
}

function parseAndCondition(
  condition: unknown
): Array<{ columnName: string; value: unknown }> {
  if (!condition || typeof condition !== "object") return [];
  const cond = condition as Record<string, unknown>;

  // and() wrapper
  if (cond.type === "and" && Array.isArray(cond.queryChunks)) {
    const results: Array<{ columnName: string; value: unknown }> = [];
    for (const chunk of cond.queryChunks) {
      const parsed = parseEqCondition(chunk);
      if (parsed) results.push(parsed);
      // recurse for nested and()
      const nested = parseAndCondition(chunk);
      results.push(...nested);
    }
    return results;
  }

  const single = parseEqCondition(condition);
  return single ? [single] : [];
}

function filterByCondition(
  items: Array<Record<string, unknown>>,
  condition: unknown
): Array<Record<string, unknown>> {
  const conditions = parseAndCondition(condition);
  if (conditions.length === 0) return items;
  return items.filter((item) =>
    conditions.every((c) => item[c.columnName] === c.value)
  );
}

function resolveTableName(table: unknown): keyof MockDbStore | undefined {
  if (!table || typeof table !== "object") return undefined;
  // Drizzle stores table name via Symbol(drizzle:Name)
  for (const sym of Object.getOwnPropertySymbols(table)) {
    if (sym.toString() === "Symbol(drizzle:Name)") {
      const name = (table as Record<symbol, unknown>)[sym] as string;
      if (name === "proposals") return "proposals";
      if (name === "evaluations") return "evaluations";
    }
  }
  // Fallback: check _.name (older drizzle versions)
  const t = table as Record<string, unknown>;
  const internal = t._ as Record<string, unknown> | undefined;
  if (internal?.name) {
    const name = internal.name as string;
    if (name === "proposals") return "proposals";
    if (name === "evaluations") return "evaluations";
  }
  return undefined;
}

const mockDb = {
  _store: store,

  query: {
    proposals: {
      findFirst(opts?: { where?: unknown }) {
        const results = filterByCondition(store.proposals, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
    evaluations: {
      findFirst(opts?: { where?: unknown }) {
        const results = filterByCondition(store.evaluations, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
  },

  insert(table: unknown) {
    return {
      values(data: Record<string, unknown>) {
        const tableName = resolveTableName(table);
        if (tableName) {
          store[tableName].push({ ...data });
        }
        return Promise.resolve();
      },
    };
  },

  update(table: unknown) {
    return {
      set(data: Record<string, unknown>) {
        return {
          where(condition: unknown) {
            const tableName = resolveTableName(table);
            if (tableName) {
              const conditions = parseAndCondition(condition);
              for (const item of store[tableName]) {
                const matches = conditions.every(
                  (c) => item[c.columnName] === c.value
                );
                if (matches) {
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

const mockIpfs = createMockIpfs();
const ipfsUploadCaptures = mockIpfs.uploads;

mock.module("@/lib/ipfs/client", () => mockIpfs);

let rateLimitSuccess = true;
mock.module("@/lib/rate-limit", () => ({
  evaluationTriggerLimiter: {
    limit: async () => ({ success: rateLimitSuccess }),
  },
}));

// Import route AFTER mocking
const { GET } = await import("@/app/api/evaluate/[id]/[dimension]/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function callGet(id: string, dimension: string) {
  const request = new Request(
    `http://localhost:3000/api/evaluate/${id}/${dimension}`,
    { headers: { "x-forwarded-for": "127.0.0.1" } }
  );
  return GET(request, { params: Promise.resolve({ id, dimension }) });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/evaluate/[id]/[dimension]", () => {
  beforeEach(() => {
    store.proposals.length = 0;
    store.evaluations.length = 0;
    ipfsUploadCaptures.length = 0;
    rateLimitSuccess = true;
    judgeShouldThrow = false;
    judgeGenerateResult = { object: mockJudgeOutput };
  });

  // 1. valid proposal + dimension -> 200 with judge evaluation output
  it("returns 200 with judge evaluation output for valid proposal and dimension", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));

    const res = await callGet("prop-001", "tech");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.score).toBe(7500);
    expect(data.confidence).toBe("high");
    expect(data.recommendation).toBe("fund");
    expect(data.justification).toBe(
      "Strong proposal with clear technical approach."
    );
  });

  // 2. invalid dimension -> 400
  it("returns 400 for invalid dimension", async () => {
    const res = await callGet("prop-001", "vibes");
    const text = await res.text();

    expect(res.status).toBe(400);
    expect(text).toBe("Invalid dimension");
  });

  // 3. proposal not found -> 404
  it("returns 404 when proposal is not found", async () => {
    const res = await callGet("nonexistent", "tech");
    const text = await res.text();

    expect(res.status).toBe(404);
    expect(text).toBe("Proposal not found");
  });

  // 4. already complete evaluation -> 200 cached
  it("returns 200 with cached result for already complete evaluation", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));
    store.evaluations.push(
      createEvaluationFixture("tech", {
        proposalId: "prop-001",
        status: "complete",
      })
    );

    const res = await callGet("prop-001", "tech");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dimension).toBe("tech");
    expect(data.status).toBe("complete");
    expect(data.score).toBe(7500);
  });

  // 5. evaluation in progress -> 409
  it("returns 409 when evaluation is already in progress", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));
    store.evaluations.push(
      createEvaluationFixture("tech", {
        proposalId: "prop-001",
        status: "streaming",
      })
    );

    const res = await callGet("prop-001", "tech");
    const text = await res.text();

    expect(res.status).toBe(409);
    expect(text).toBe("Evaluation already in progress");
  });

  // 6. judge agent fails all retries -> 500
  it("returns 500 when judge agent fails all retries", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));
    judgeShouldThrow = true;

    const res = await callGet("prop-001", "tech");
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).toBe("Evaluation failed after retries");
  }, 30_000);

  // 7. creates evaluation record with status "streaming" before running judge
  it("creates evaluation record with status streaming before running judge", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));

    await callGet("prop-001", "tech");

    const evalRecord = store.evaluations.find(
      (e) => e.proposalId === "prop-001" && e.dimension === "tech"
    );
    expect(evalRecord).toBeDefined();
    expect(evalRecord?.model).toBe("claude-sonnet-4-20250514");
    expect(evalRecord?.promptVersion).toBe("judge-tech-v1");
  });

  // 8. updates evaluation to "complete" with scores after success
  it("updates evaluation to complete with scores after success", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));

    await callGet("prop-001", "tech");

    const evalRecord = store.evaluations.find(
      (e) => e.proposalId === "prop-001" && e.dimension === "tech"
    );
    expect(evalRecord?.status).toBe("complete");
    expect(evalRecord?.score).toBe(7500);
    expect(evalRecord?.scoreDecimals).toBe(2);
    expect(evalRecord?.confidence).toBe("high");
    expect(evalRecord?.recommendation).toBe("fund");
    expect(evalRecord?.ipfsCid).toBe("QmTest123");
  });

  // 9. updates evaluation to "failed" on judge failure
  it("updates evaluation to failed on judge failure", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));
    judgeShouldThrow = true;

    await callGet("prop-001", "tech");

    const evalRecord = store.evaluations.find(
      (e) => e.proposalId === "prop-001" && e.dimension === "tech"
    );
    expect(evalRecord).toBeDefined();
    expect(evalRecord?.status).toBe("failed");
  }, 30_000);

  // 10. IPFS upload includes promptTransparency metadata
  it("includes promptTransparency metadata in IPFS upload", async () => {
    store.proposals.push(createProposalFixture({ id: "prop-001" }));

    await callGet("prop-001", "tech");

    expect(ipfsUploadCaptures.length).toBe(1);
    const payload = ipfsUploadCaptures[0].data;
    expect(payload.type).toBe("https://ipe.city/schemas/judge-evaluation-v1");
    expect(payload.dimension).toBe("tech");
    expect(payload.score).toBe(7500);

    const transparency = payload.promptTransparency as Record<string, unknown>;
    expect(transparency).toBeDefined();
    expect(transparency.model).toBe("claude-sonnet-4-20250514");
    expect(transparency.structuredOutputSchema).toBe("JudgeEvaluationSchema");
    expect(typeof transparency.systemPrompt).toBe("string");
    expect(typeof transparency.userMessage).toBe("string");
    expect(transparency.methodology).toContain(
      "Single-dimension independent judge evaluation"
    );
    expect(Array.isArray(transparency.limitations)).toBe(true);
  });
});
