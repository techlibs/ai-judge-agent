import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createEvaluationFixture,
  createProposalFixture,
  createAggregateFixture,
} from "../helpers/mocks";
import { JUDGE_DIMENSIONS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Mock DB — custom implementation that correctly parses drizzle eq() internals
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

/**
 * Parse a drizzle `eq(column, value)` condition.
 * eq() produces queryChunks: [_, column, _, param, _]
 * where column.name is the SQL column name and param.value is the comparison value.
 */
function parseEqCondition(
  condition: unknown
): { columnName: string; value: unknown } | undefined {
  if (!condition || typeof condition !== "object") return undefined;
  const cond = condition as Record<string, unknown>;
  const chunks = cond.queryChunks as Array<Record<string, unknown>> | undefined;
  if (!chunks || chunks.length < 4) return undefined;

  const column = chunks[1];
  const param = chunks[3];
  if (column?.name && param && "value" in param) {
    return {
      columnName: snakeToCamel(column.name as string),
      value: param.value,
    };
  }
  return undefined;
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Resolve the store key from a drizzle table object.
 * Drizzle stores table name under Symbol(drizzle:Name).
 */
function resolveStoreName(table: unknown): keyof MockStore | undefined {
  if (!table || typeof table !== "object") return undefined;
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

function filterByCondition(
  items: Array<Record<string, unknown>>,
  condition: unknown
): Array<Record<string, unknown>> {
  const parsed = parseEqCondition(condition);
  if (!parsed) return items;
  return items.filter((item) => item[parsed.columnName] === parsed.value);
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
            const parsed = parseEqCondition(condition);
            if (key && parsed) {
              for (const item of store[key]) {
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

// ---------------------------------------------------------------------------
// Mock setup — must happen BEFORE dynamic import of the module under test
// ---------------------------------------------------------------------------

mock.module("@/lib/db/client", () => ({
  getDb: () => mockDb,
}));

let ipfsShouldFail = false;
const ipfsUploads: Array<{ data: Record<string, unknown>; name: string }> = [];

mock.module("@/lib/ipfs/client", () => ({
  uploadJson: async (data: Record<string, unknown>, name: string) => {
    if (ipfsShouldFail) {
      throw new Error("IPFS upload failed");
    }
    ipfsUploads.push({ data, name });
    return { cid: "QmTest123", uri: "https://gw/ipfs/QmTest123" };
  },
}));

let chainShouldFail = false;
const chainCalls: Array<Record<string, unknown>> = [];

mock.module("@/lib/evaluation/publish-chain", () => ({
  publishEvaluationOnChainDetailed: async (params: Record<string, unknown>) => {
    if (chainShouldFail) {
      throw new Error("On-chain publishing failed");
    }
    chainCalls.push(params);
    return {
      registerTxHash: "0xreg1234567890abcdef",
      agentId: BigInt(1),
      feedbackTxHashes: {
        tech: "0xtech1234567890abcdef",
        impact: "0ximpa1234567890abcdef",
        cost: "0xcost1234567890abcdef",
        team: "0xteam1234567890abcdef",
      } as Record<string, string>,
      aggregateFeedbackTxHash: "0xagg1234567890abcdef",
    };
  },
}));

const securityEvents: Array<Record<string, unknown>> = [];

mock.module("@/lib/security-log", () => ({
  logSecurityEvent: (event: Record<string, unknown>) => {
    securityEvents.push(event);
  },
}));

// Dynamic import AFTER mock.module
const { checkAndFinalizeEvaluation } = await import(
  "@/lib/evaluation/orchestrator"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedCompleteEvaluations(
  proposalId: string,
  scoreOverrides?: Partial<Record<string, number>>
) {
  const defaultScore = 7500;
  for (const dim of JUDGE_DIMENSIONS) {
    const score = scoreOverrides?.[dim] ?? defaultScore;
    store.evaluations.push(
      createEvaluationFixture(dim, {
        proposalId,
        score,
        status: "complete",
        id: `eval-${dim}-${proposalId}`,
      })
    );
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkAndFinalizeEvaluation", () => {
  const PROPOSAL_ID = "prop-001";

  beforeEach(() => {
    // Reset stores
    store.proposals.length = 0;
    store.evaluations.length = 0;
    store.aggregateScores.length = 0;

    // Reset mock tracking arrays
    ipfsUploads.length = 0;
    chainCalls.length = 0;
    securityEvents.length = 0;

    // Reset failure flags
    ipfsShouldFail = false;
    chainShouldFail = false;

    // Seed a default proposal
    store.proposals.push(
      createProposalFixture({ id: PROPOSAL_ID, status: "evaluating" })
    );
  });

  // -----------------------------------------------------------------------
  // 1. All 4 dimensions complete -> returns complete with aggregate score
  // -----------------------------------------------------------------------
  it("returns complete with aggregate score when all 4 dimensions are complete", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);

    const result = await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(result.complete).toBe(true);
    expect(result.aggregateScore).toBeGreaterThan(0);
    expect(typeof result.aggregateScore).toBe("number");
  });

  // -----------------------------------------------------------------------
  // 2. Only 3/4 complete -> returns incomplete
  // -----------------------------------------------------------------------
  it("returns incomplete when only 3 of 4 dimensions are complete", async () => {
    for (const dim of JUDGE_DIMENSIONS.slice(0, 3)) {
      store.evaluations.push(
        createEvaluationFixture(dim, {
          proposalId: PROPOSAL_ID,
          status: "complete",
        })
      );
    }

    const result = await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(result.complete).toBe(false);
    expect(result.aggregateScore).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // 3. Idempotency: existing aggregate -> returns early
  // -----------------------------------------------------------------------
  it("returns early with existing score when aggregate already exists", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);
    store.aggregateScores.push(
      createAggregateFixture({ proposalId: PROPOSAL_ID, scoreBps: 8200 })
    );

    const result = await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(result.complete).toBe(true);
    expect(result.aggregateScore).toBe(8200);
    // Should NOT have uploaded to IPFS (early return)
    expect(ipfsUploads).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // 4. Anomaly: all scores >= 9500 -> ALL_SCORES_SUSPICIOUSLY_HIGH
  // -----------------------------------------------------------------------
  it("logs anomaly when all scores are suspiciously high (>= 9500)", async () => {
    seedCompleteEvaluations(PROPOSAL_ID, {
      tech: 9500,
      impact: 9800,
      cost: 9600,
      team: 9900,
    });

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(securityEvents).toHaveLength(1);
    const event = securityEvents[0];
    expect(event.type).toBe("score_anomaly");
    expect(event.proposalId).toBe(PROPOSAL_ID);
    expect(event.flags).toContain("ALL_SCORES_SUSPICIOUSLY_HIGH");
  });

  // -----------------------------------------------------------------------
  // 5. Anomaly: all scores <= 500 -> ALL_SCORES_SUSPICIOUSLY_LOW
  // -----------------------------------------------------------------------
  it("logs anomaly when all scores are suspiciously low (<= 500)", async () => {
    seedCompleteEvaluations(PROPOSAL_ID, {
      tech: 200,
      impact: 300,
      cost: 100,
      team: 500,
    });

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(securityEvents).toHaveLength(1);
    const event = securityEvents[0];
    expect(event.flags).toContain("ALL_SCORES_SUSPICIOUSLY_LOW");
  });

  // -----------------------------------------------------------------------
  // 6. Anomaly: divergence > 5000 -> EXTREME_SCORE_DIVERGENCE
  // -----------------------------------------------------------------------
  it("logs anomaly when score divergence exceeds 5000", async () => {
    seedCompleteEvaluations(PROPOSAL_ID, {
      tech: 1000,
      impact: 7000,
      cost: 3000,
      team: 5000,
    });

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(securityEvents).toHaveLength(1);
    const event = securityEvents[0];
    expect(event.flags).toContain("EXTREME_SCORE_DIVERGENCE");
  });

  // -----------------------------------------------------------------------
  // 7. No anomaly for normal spread
  // -----------------------------------------------------------------------
  it("does not log anomaly for normal score spread", async () => {
    seedCompleteEvaluations(PROPOSAL_ID, {
      tech: 7000,
      impact: 7500,
      cost: 8000,
      team: 7200,
    });

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(securityEvents).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // 8. IPFS upload failure -> throws
  // -----------------------------------------------------------------------
  it("throws when IPFS upload fails", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);
    ipfsShouldFail = true;

    await expect(
      checkAndFinalizeEvaluation(PROPOSAL_ID)
    ).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // 9. Chain publish failure -> throws, proposal status set to "failed"
  // -----------------------------------------------------------------------
  it("throws 'On-chain publishing failed' and sets proposal to failed when chain publish fails", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);
    chainShouldFail = true;

    await expect(
      checkAndFinalizeEvaluation(PROPOSAL_ID)
    ).rejects.toThrow("On-chain publishing failed");

    const proposal = store.proposals.find((p) => p.id === PROPOSAL_ID);
    expect(proposal?.status).toBe("failed");
  });

  // -----------------------------------------------------------------------
  // 10. Correct weighted score computed and stored
  // -----------------------------------------------------------------------
  it("computes correct weighted aggregate score and stores it", async () => {
    // tech=8000*0.25 + impact=6000*0.30 + cost=7000*0.20 + team=9000*0.25
    // = 2000 + 1800 + 1400 + 2250 = 7450
    seedCompleteEvaluations(PROPOSAL_ID, {
      tech: 8000,
      impact: 6000,
      cost: 7000,
      team: 9000,
    });

    const result = await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(result.aggregateScore).toBe(7450);

    const stored = store.aggregateScores.find(
      (a) => a.proposalId === PROPOSAL_ID
    );
    expect(stored).toBeDefined();
    expect(stored?.scoreBps).toBe(7450);
    expect(stored?.ipfsCid).toBe("QmTest123");
  });

  // -----------------------------------------------------------------------
  // 11. Per-dimension tx hashes stored on evaluation records
  // -----------------------------------------------------------------------
  it("stores per-dimension feedback tx hashes on evaluation records", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    const techEval = store.evaluations.find(
      (e) => e.dimension === "tech" && e.proposalId === PROPOSAL_ID
    );
    expect(techEval?.feedbackTxHash).toBe("0xtech1234567890abcdef");

    const impactEval = store.evaluations.find(
      (e) => e.dimension === "impact" && e.proposalId === PROPOSAL_ID
    );
    expect(impactEval?.feedbackTxHash).toBe("0ximpa1234567890abcdef");

    const costEval = store.evaluations.find(
      (e) => e.dimension === "cost" && e.proposalId === PROPOSAL_ID
    );
    expect(costEval?.feedbackTxHash).toBe("0xcost1234567890abcdef");

    const teamEval = store.evaluations.find(
      (e) => e.dimension === "team" && e.proposalId === PROPOSAL_ID
    );
    expect(teamEval?.feedbackTxHash).toBe("0xteam1234567890abcdef");
  });

  // -----------------------------------------------------------------------
  // 12. Proposal status transitions: evaluating -> publishing -> published
  // -----------------------------------------------------------------------
  it("transitions proposal status to published with chain data", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    const proposal = store.proposals.find((p) => p.id === PROPOSAL_ID);
    expect(proposal?.status).toBe("published");
    expect(proposal?.chainTxHash).toBe("0xagg1234567890abcdef");
    expect(proposal?.chainTokenId).toBe(1);
  });

  // -----------------------------------------------------------------------
  // 13. Evaluations with non-complete status are excluded
  // -----------------------------------------------------------------------
  it("excludes evaluations with non-complete status", async () => {
    for (const dim of JUDGE_DIMENSIONS.slice(0, 3)) {
      store.evaluations.push(
        createEvaluationFixture(dim, {
          proposalId: PROPOSAL_ID,
          status: "complete",
        })
      );
    }
    store.evaluations.push(
      createEvaluationFixture("team", {
        proposalId: PROPOSAL_ID,
        status: "pending",
      })
    );

    const result = await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(result.complete).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 14. Sequential duplicate call — second returns early (idempotency)
  // -----------------------------------------------------------------------
  it("concurrent calls — only first publishes (idempotency)", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);

    // First call publishes normally
    const result1 = await checkAndFinalizeEvaluation(PROPOSAL_ID);
    expect(result1.complete).toBe(true);
    expect(chainCalls).toHaveLength(1);

    // Second call hits the idempotency guard (aggregate already exists)
    const result2 = await checkAndFinalizeEvaluation(PROPOSAL_ID);
    expect(result2.complete).toBe(true);
    // Chain should NOT have been called again
    expect(chainCalls).toHaveLength(1);
  });

  // -----------------------------------------------------------------------
  // 15. Rejects evaluations with non-complete status
  // -----------------------------------------------------------------------
  it("rejects evaluations with non-complete status", async () => {
    for (const dim of JUDGE_DIMENSIONS.slice(0, 3)) {
      store.evaluations.push(
        createEvaluationFixture(dim, {
          proposalId: PROPOSAL_ID,
          status: "complete",
        })
      );
    }
    store.evaluations.push(
      createEvaluationFixture("team", {
        proposalId: PROPOSAL_ID,
        status: "failed",
      })
    );

    const result = await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(result.complete).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 16. Proposal status transitions through publishing to published
  // -----------------------------------------------------------------------
  it("proposal status transitions through publishing to published", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    // After successful finalization, the proposal should be "published"
    const proposal = store.proposals.find((p) => p.id === PROPOSAL_ID);
    expect(proposal?.status).toBe("published");
  });

  // -----------------------------------------------------------------------
  // 17. IPFS aggregate data has correct schema
  // -----------------------------------------------------------------------
  it("uploads aggregate data with correct schema to IPFS", async () => {
    seedCompleteEvaluations(PROPOSAL_ID);

    await checkAndFinalizeEvaluation(PROPOSAL_ID);

    expect(ipfsUploads).toHaveLength(1);
    const uploaded = ipfsUploads[0];
    expect(uploaded.name).toBe(`aggregate-${PROPOSAL_ID}.json`);
    expect(uploaded.data.type).toBe(
      "https://ipe.city/schemas/aggregate-evaluation-v1"
    );
    expect(uploaded.data.proposalId).toBe(PROPOSAL_ID);
    expect(uploaded.data.aggregateScoreBps).toBeGreaterThan(0);
    expect(Array.isArray(uploaded.data.dimensions)).toBe(true);
    expect(
      (uploaded.data.dimensions as Array<Record<string, unknown>>).length
    ).toBe(4);
  });
});
