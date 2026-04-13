import type { JudgeDimension } from "@/lib/constants";

// ─── Proposal Fixture ────────────────────────────────────────────────

export function createProposalFixture(overrides?: Record<string, unknown>) {
  return {
    id: "prop-001",
    title: "Decentralized Identity for IPE Village",
    description:
      "A system that enables Architects to maintain portable digital identity across IPE Village sessions, preserving reputation and contribution history on-chain.",
    problemStatement:
      "Each IPE Village session starts fresh with no memory of past contributions or reputation.",
    proposedSolution:
      "Build an ERC-8004 compatible identity system that tracks Architect contributions across sessions.",
    teamMembers: [
      { name: "Alice", role: "Lead Developer" },
      { name: "Bob", role: "Smart Contract Engineer" },
    ],
    budgetAmount: 5000,
    budgetBreakdown:
      "Development: $3000, Infrastructure: $1000, Testing: $1000",
    timeline:
      "4 weeks — Week 1-2: Core identity, Week 3: Integration, Week 4: Testing",
    category: "infrastructure",
    residencyDuration: "4-weeks",
    demoDayDeliverable: "Working identity portal with QR code check-in",
    communityContribution:
      "Weekly workshop on decentralized identity for other Architects",
    priorIpeParticipation: false,
    links: ["https://github.com/alice/ipe-identity"],
    status: "pending" as const,
    ipfsCid: "QmProposal123",
    chainTokenId: null,
    chainTxHash: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

// ─── Evaluation Fixture ──────────────────────────────────────────────

export function createEvaluationFixture(
  dimension: JudgeDimension,
  overrides?: Record<string, unknown>
) {
  return {
    id: `eval-${dimension}-001`,
    proposalId: "prop-001",
    dimension,
    score: 7500,
    confidence: "high" as const,
    recommendation: "fund" as const,
    justification: `Strong proposal evaluated on ${dimension} dimension.`,
    keyFindings: ["Solid architecture", "Experienced team"],
    risks: ["Timeline ambitious"],
    ipeAlignmentTech: 80,
    ipeAlignmentFreedom: 70,
    ipeAlignmentProgress: 90,
    status: "complete" as const,
    ipfsCid: `QmEval${dimension}123`,
    feedbackTxHash: null,
    model: "claude-sonnet-4-20250514",
    promptVersion: `judge-${dimension}-v1`,
    startedAt: new Date("2026-01-15T10:01:00Z"),
    completedAt: new Date("2026-01-15T10:02:00Z"),
    ...overrides,
  };
}

// ─── Aggregate Fixture ───────────────────────────────────────────────

export function createAggregateFixture(overrides?: Record<string, unknown>) {
  return {
    id: "agg-001",
    proposalId: "prop-001",
    scoreBps: 7500,
    ipfsCid: "QmAggregate123",
    chainTxHash: null,
    computedAt: new Date("2026-01-15T10:05:00Z"),
    ...overrides,
  };
}

// ─── Mock Database ───────────────────────────────────────────────────

interface MockDbStore {
  proposals: Array<Record<string, unknown>>;
  evaluations: Array<Record<string, unknown>>;
  aggregateScores: Array<Record<string, unknown>>;
}

export function createMockDb() {
  const store: MockDbStore = {
    proposals: [],
    evaluations: [],
    aggregateScores: [],
  };

  function matchesWhere(
    item: Record<string, unknown>,
    opts?: { where?: { field: string; value: unknown } | Array<{ field: string; value: unknown }> }
  ): boolean {
    if (!opts?.where) return true;
    const conditions = Array.isArray(opts.where) ? opts.where : [opts.where];
    return conditions.every((c) => item[c.field] === c.value);
  }

  const db = {
    _store: store,

    query: {
      proposals: {
        findFirst(opts?: { where?: unknown }) {
          const mapped = mapDrizzleWhere(opts?.where);
          return Promise.resolve(
            store.proposals.find((p) => matchesWhere(p, { where: mapped })) ??
              null
          );
        },
        findMany(opts?: { where?: unknown }) {
          const mapped = mapDrizzleWhere(opts?.where);
          return Promise.resolve(
            store.proposals.filter((p) => matchesWhere(p, { where: mapped }))
          );
        },
      },
      evaluations: {
        findFirst(opts?: { where?: unknown }) {
          const mapped = mapDrizzleWhere(opts?.where);
          return Promise.resolve(
            store.evaluations.find((e) =>
              matchesWhere(e, { where: mapped })
            ) ?? null
          );
        },
        findMany(opts?: { where?: unknown }) {
          const mapped = mapDrizzleWhere(opts?.where);
          return Promise.resolve(
            store.evaluations.filter((e) =>
              matchesWhere(e, { where: mapped })
            )
          );
        },
      },
      aggregateScores: {
        findFirst(opts?: { where?: unknown }) {
          const mapped = mapDrizzleWhere(opts?.where);
          return Promise.resolve(
            store.aggregateScores.find((a) =>
              matchesWhere(a, { where: mapped })
            ) ?? null
          );
        },
      },
    },

    insert(_table: unknown) {
      return {
        values(data: Record<string, unknown>) {
          const tableName = resolveTableName(_table);
          if (tableName && tableName in store) {
            (store as unknown as Record<string, Array<Record<string, unknown>>>)[
              tableName
            ].push({ ...data });
          }
          return Promise.resolve();
        },
      };
    },

    update(_table: unknown) {
      return {
        set(data: Record<string, unknown>) {
          return {
            where(condition: unknown) {
              const tableName = resolveTableName(_table);
              const mapped = mapDrizzleWhere(condition);
              if (tableName && tableName in store) {
                const arr = (
                  store as unknown as Record<string, Array<Record<string, unknown>>>
                )[tableName];
                for (const item of arr) {
                  if (matchesWhere(item, { where: mapped })) {
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

    delete(_table: unknown) {
      return {
        where(condition: unknown) {
          const tableName = resolveTableName(_table);
          const mapped = mapDrizzleWhere(condition);
          if (tableName && tableName in store) {
            const arr = (
              store as unknown as Record<string, Array<Record<string, unknown>>>
            )[tableName];
            const idx = arr.findIndex((item) =>
              matchesWhere(item, { where: mapped })
            );
            if (idx !== -1) arr.splice(idx, 1);
          }
          return Promise.resolve();
        },
      };
    },
  };

  return db;
}

// ─── Drizzle where clause helpers ────────────────────────────────────

function mapDrizzleWhere(
  condition: unknown
): { field: string; value: unknown } | Array<{ field: string; value: unknown }> | undefined {
  if (!condition) return undefined;

  if (
    typeof condition === "object" &&
    condition !== null &&
    "field" in condition &&
    "value" in condition
  ) {
    return condition as { field: string; value: unknown };
  }

  const cond = condition as Record<string, unknown>;

  if (cond.type === "and" && Array.isArray(cond.queryChunks)) {
    const results: Array<{ field: string; value: unknown }> = [];
    for (const chunk of cond.queryChunks) {
      const mapped = mapDrizzleWhere(chunk);
      if (mapped) {
        if (Array.isArray(mapped)) results.push(...mapped);
        else results.push(mapped);
      }
    }
    return results.length > 0 ? results : undefined;
  }

  const left = cond.left as Record<string, unknown> | undefined;
  const right = cond.right as Record<string, unknown> | undefined;
  if (left?.name && right && "value" in right) {
    const columnName = left.name as string;
    const jsName = snakeToCamel(columnName);
    return { field: jsName, value: right.value };
  }

  return undefined;
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function resolveTableName(table: unknown): string | undefined {
  if (!table) return undefined;
  const t = table as Record<string, unknown>;

  const internal = t._ as Record<string, unknown> | undefined;
  if (internal?.name) {
    const name = internal.name as string;
    if (name === "proposals") return "proposals";
    if (name === "evaluations") return "evaluations";
    if (name === "aggregate_scores") return "aggregateScores";
  }

  return undefined;
}

// ─── Mock IPFS ───────────────────────────────────────────────────────

export function createMockIpfs(options?: { shouldFail?: boolean }) {
  const uploads: Array<{ data: Record<string, unknown>; name: string }> = [];

  return {
    uploads,
    uploadJson: async (data: Record<string, unknown>, name: string) => {
      if (options?.shouldFail) {
        throw new Error("IPFS upload failed after 3 attempts: Mock IPFS failure");
      }
      uploads.push({ data, name });
      return {
        cid: "QmTest123",
        uri: "https://gateway.pinata.cloud/ipfs/QmTest123",
      };
    },
    ipfsUri: (cid: string) => `ipfs://${cid}`,
    fetchJson: async () => ({}),
    verifyContentIntegrity: async () => ({ valid: true }),
    gatewayUrl: (cid: string) =>
      `https://gateway.pinata.cloud/ipfs/${cid}`,
  };
}

// ─── Mock Chain Publisher ────────────────────────────────────────────

export function createMockChainPublisher(options?: { shouldFail?: boolean }) {
  const calls: Array<Record<string, unknown>> = [];

  return {
    calls,
    publishEvaluationOnChainDetailed: async (
      params: Record<string, unknown>
    ) => {
      if (options?.shouldFail) {
        throw new Error("On-chain publishing failed");
      }
      calls.push(params);
      return {
        registerTxHash: "0xreg1234567890abcdef",
        agentId: BigInt(1),
        feedbackTxHashes: {
          tech: "0xtech1234567890abcdef",
          impact: "0ximpa1234567890abcdef",
          cost: "0xcost1234567890abcdef",
          team: "0xteam1234567890abcdef",
        },
        aggregateFeedbackTxHash: "0xagg1234567890abcdef",
      };
    },
    publishEvaluationOnChain: async (params: Record<string, unknown>) => {
      if (options?.shouldFail) {
        throw new Error("On-chain publishing failed");
      }
      calls.push(params);
      return "0xagg1234567890abcdef";
    },
  };
}
