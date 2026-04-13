import { describe, it, expect, mock, beforeEach } from "bun:test";

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
    mockOrchestratorResult = { complete: false };
    mockOrchestratorShouldThrow = false;
  });

  it("returns 200 with published status when all evaluations are complete", async () => {
    mockOrchestratorResult = { complete: true, aggregateScore: 7500 };

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.status).toBe("published");
    expect(data.aggregateScore).toBe(7500);
  });

  it("returns 202 with not_ready status when evaluations are incomplete", async () => {
    mockOrchestratorResult = { complete: false };

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(202);
    expect(data.status).toBe("not_ready");
  });

  it("returns 500 with failed status when orchestrator throws", async () => {
    mockOrchestratorShouldThrow = true;

    const result = await callPost("prop-001");
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data.status).toBe("failed");
  });
});
