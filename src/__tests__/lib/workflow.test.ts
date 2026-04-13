import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createProposalFixture } from "../helpers/mocks";
import { JUDGE_DIMENSIONS } from "@/lib/constants";

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

  // Handle drizzle BinaryOperator format (left/right)
  const left = cond.left as Record<string, unknown> | undefined;
  const right = cond.right as Record<string, unknown> | undefined;
  if (left?.name && right && "value" in right) {
    return { columnName: snakeToCamel(left.name as string), value: right.value };
  }

  // Handle queryChunks format
  const chunks = cond.queryChunks as Array<Record<string, unknown>> | undefined;
  if (!chunks || chunks.length < 4) return undefined;
  const column = chunks[1];
  const param = chunks[3];
  if (column?.name && param && "value" in param) {
    return { columnName: snakeToCamel(column.name as string), value: param.value };
  }
  return undefined;
}

function parseAndCondition(
  condition: unknown
): Array<{ columnName: string; value: unknown }> {
  if (!condition || typeof condition !== "object") return [];
  const cond = condition as Record<string, unknown>;

  // Check if it's an AND
  if (cond.type === "and" && Array.isArray(cond.queryChunks)) {
    const results: Array<{ columnName: string; value: unknown }> = [];
    for (const chunk of cond.queryChunks) {
      const parsed = parseEqCondition(chunk);
      if (parsed) results.push(parsed);
    }
    return results;
  }

  // Single eq
  const parsed = parseEqCondition(condition);
  return parsed ? [parsed] : [];
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

function resolveStoreName(table: unknown): keyof MockStore | undefined {
  if (!table || typeof table !== "object") return undefined;

  // Check internal _.name
  const t = table as Record<string, unknown>;
  const internal = t._ as Record<string, unknown> | undefined;
  if (internal?.name) {
    const name = internal.name as string;
    if (name === "proposals") return "proposals";
    if (name === "evaluations") return "evaluations";
    if (name === "aggregate_scores") return "aggregateScores";
  }

  // Check Symbol(drizzle:Name)
  const symbols = Object.getOwnPropertySymbols(table);
  for (const sym of symbols) {
    if (sym.toString() === "Symbol(drizzle:Name)") {
      const name = (table as Record<symbol, unknown>)[sym] as string;
      if (name === "proposals") return "proposals";
      if (name === "evaluations") return "evaluations";
      if (name === "aggregate_scores") return "aggregateScores";
    }
  }
  return undefined;
}

const mockDb = {
  _store: store,
  query: {
    evaluations: {
      findMany(opts?: { where?: unknown }) {
        return Promise.resolve(filterByCondition(store.evaluations, opts?.where));
      },
      findFirst(opts?: { where?: unknown }) {
        const results = filterByCondition(store.evaluations, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
    aggregateScores: {
      findFirst(opts?: { where?: unknown }) {
        const results = filterByCondition(store.aggregateScores, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
    proposals: {
      findFirst(opts?: { where?: unknown }) {
        const results = filterByCondition(store.proposals, opts?.where);
        return Promise.resolve(results[0] ?? null);
      },
    },
  },
  insert(table: unknown) {
    return {
      values(data: Record<string, unknown>) {
        const key = resolveStoreName(table);
        if (key) store[key].push({ ...data });
        return Promise.resolve();
      },
    };
  },
  update(table: unknown) {
    return {
      set(data: Record<string, unknown>) {
        return {
          where(condition: unknown) {
            const key = resolveStoreName(table);
            const conditions = parseAndCondition(condition);
            if (key && conditions.length > 0) {
              for (const item of store[key]) {
                const matches = conditions.every((c) => item[c.columnName] === c.value);
                if (matches) Object.assign(item, data);
              }
            }
            return Promise.resolve();
          },
        };
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Mocks — BEFORE dynamic import
// ---------------------------------------------------------------------------

mock.module("@/lib/db/client", () => ({
  getDb: () => mockDb,
}));

let judgeShouldFail = false;
let judgeCallCount = 0;

mock.module("@/lib/mastra", () => ({
  mastra: {
    getAgent: () => ({
      generate: async () => {
        judgeCallCount++;
        if (judgeShouldFail) {
          throw new Error("LLM generation failed");
        }
        return {
          object: {
            score: 7500,
            confidence: "high" as const,
            recommendation: "fund" as const,
            justification: "Strong proposal with solid fundamentals.",
            keyFindings: ["Good architecture", "Experienced team"],
            risks: ["Ambitious timeline"],
            ipeAlignment: { proTechnology: 80, proFreedom: 70, proHumanProgress: 85 },
          },
        };
      },
    }),
  },
}));

const ipfsUploads: Array<{ data: Record<string, unknown>; name: string }> = [];

mock.module("@/lib/ipfs/client", () => ({
  uploadJson: async (data: Record<string, unknown>, name: string) => {
    ipfsUploads.push({ data, name });
    return { cid: `QmTest-${name}`, uri: `https://gw/ipfs/QmTest-${name}` };
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
    score: async () => ({ score: 0.85 }),
  }),
}));

const securityEvents: Array<Record<string, unknown>> = [];

mock.module("@/lib/security-log", () => ({
  logSecurityEvent: (event: Record<string, unknown>) => {
    securityEvents.push(event);
  },
}));

mock.module("@/lib/judges/agents", () => ({
  detectInjectionPatterns: () => [],
}));

// Dynamic import AFTER mocks
const { runEvaluationWorkflow } = await import("@/lib/evaluation/workflow");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROPOSAL_ID = "prop-wf-001";

function makeWorkflowInput() {
  const proposal = createProposalFixture({ id: PROPOSAL_ID, status: "evaluating" });
  return {
    proposalId: PROPOSAL_ID,
    proposal: {
      ...proposal,
      ipfsCid: proposal.ipfsCid ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runEvaluationWorkflow", () => {
  beforeEach(() => {
    store.proposals.length = 0;
    store.evaluations.length = 0;
    store.aggregateScores.length = 0;
    ipfsUploads.length = 0;
    securityEvents.length = 0;
    judgeShouldFail = false;
    judgeCallCount = 0;

    store.proposals.push(
      createProposalFixture({ id: PROPOSAL_ID, status: "evaluating" })
    );
  });

  it("is importable and defined", () => {
    expect(runEvaluationWorkflow).toBeDefined();
    expect(typeof runEvaluationWorkflow).toBe("function");
  });

  it("runs all 4 dimensions and produces aggregate score", async () => {
    const result = await runEvaluationWorkflow(makeWorkflowInput());

    expect(result.aggregateScoreBps).toBeGreaterThan(0);
    expect(result.dimensionResults).toHaveLength(4);
    expect(result.dimensionResults.map((r) => r.dimension).sort()).toEqual(
      [...JUDGE_DIMENSIONS].sort()
    );
  });

  it("creates 4 evaluation records and 1 aggregate record", async () => {
    await runEvaluationWorkflow(makeWorkflowInput());

    expect(store.evaluations).toHaveLength(4);
    expect(store.aggregateScores).toHaveLength(1);
  });

  it("uploads 5 IPFS payloads (4 dimensions + 1 aggregate)", async () => {
    await runEvaluationWorkflow(makeWorkflowInput());

    // 4 dimension uploads + 1 aggregate
    expect(ipfsUploads).toHaveLength(5);
    const aggregateUpload = ipfsUploads.find((u) =>
      u.name.startsWith("aggregate-")
    );
    expect(aggregateUpload).toBeDefined();
    expect(aggregateUpload?.data.type).toBe(
      "https://ipe.city/schemas/aggregate-evaluation-v1"
    );
  });

  it("updates proposal status to evaluated", async () => {
    await runEvaluationWorkflow(makeWorkflowInput());

    const proposal = store.proposals.find((p) => p.id === PROPOSAL_ID);
    expect(proposal?.status).toBe("evaluated");
  });

  it("marks proposal as failed when judge fails", async () => {
    judgeShouldFail = true;

    await expect(
      runEvaluationWorkflow(makeWorkflowInput())
    ).rejects.toThrow("Evaluation failed for dimensions");

    const proposal = store.proposals.find((p) => p.id === PROPOSAL_ID);
    expect(proposal?.status).toBe("failed");
  }, 30_000);

  it("computes correct weighted aggregate score", async () => {
    // All judges return 7500, so aggregate = 7500*0.25 + 7500*0.30 + 7500*0.20 + 7500*0.25 = 7500
    const result = await runEvaluationWorkflow(makeWorkflowInput());
    expect(result.aggregateScoreBps).toBe(7500);
  });

  it("returns empty anomaly flags for normal scores", async () => {
    const result = await runEvaluationWorkflow(makeWorkflowInput());
    expect(result.anomalyFlags).toHaveLength(0);
  });
});
