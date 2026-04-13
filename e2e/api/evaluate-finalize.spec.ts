import { test, expect } from "@playwright/test";
import {
  seedProposal,
  seedEvaluation,
  seedAggregate,
  cleanupTestData,
} from "../helpers/db-fixtures";

// The finalize route behavior:
// - proposal.status === "published"           → 200 { status: "published", aggregateScore }
// - aggregate exists && status === "evaluated" → delegates to orchestrator (200 or 202)
// - proposal.status === "failed"              → 500
// - any other state (evaluating, pending)     → 202 { status: proposal.status }

test.describe("POST /api/evaluate/{id}/finalize", () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test("returns 202 when evaluations are still in progress (no aggregate)", async ({ request }) => {
    const id = await seedProposal({ title: "Incomplete Finalize", status: "evaluating" });
    await seedEvaluation({
      proposalId: id,
      dimension: "tech",
      score: 8000,
      status: "complete",
      recommendation: "fund",
      confidence: "high",
    });
    // Only 1 of 4 complete, no aggregate — workflow still running
    const response = await request.post(`/api/evaluate/${id}/finalize`);
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body.status).toBe("evaluating");
  });

  test("returns 200 with status published for an already-published proposal", async ({ request }) => {
    const id = await seedProposal({ title: "Already Published", status: "published" });
    await seedAggregate({ proposalId: id, scoreBps: 7625 });

    const response = await request.post(`/api/evaluate/${id}/finalize`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("published");
    expect(body.aggregateScore).toBe(7625);
  });

  test("returns 404 for non-existent proposal", async ({ request }) => {
    const response = await request.post("/api/evaluate/non-existent-id/finalize");
    expect(response.status()).toBe(404);
  });

  test("returns 202 with pending status for pending proposal with no aggregate", async ({ request }) => {
    const id = await seedProposal({ title: "Pending Finalize", status: "pending" });
    const response = await request.post(`/api/evaluate/${id}/finalize`);
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body.status).toBe("pending");
  });

  test("finalizes with all 4 evaluations complete and aggregate seeded", async ({ request }) => {
    const id = await seedProposal({ title: "Complete Finalize", status: "evaluated" });
    const dims = ["tech", "impact", "cost", "team"] as const;
    const scores = [8000, 7500, 6000, 8500];

    for (let i = 0; i < dims.length; i++) {
      await seedEvaluation({
        proposalId: id,
        dimension: dims[i],
        score: scores[i],
        status: "complete",
        recommendation: "fund",
        confidence: "high",
        justification: `Assessment for ${dims[i]}`,
        keyFindings: [`Finding for ${dims[i]}`],
        risks: [`Risk for ${dims[i]}`],
      });
    }

    const weightedScore = Math.round(
      scores[0] * 0.25 + scores[1] * 0.30 + scores[2] * 0.20 + scores[3] * 0.25,
    );
    await seedAggregate({ proposalId: id, scoreBps: weightedScore });

    // Route delegates to checkAndFinalizeEvaluation — may return 200 (published) or 202 (publishing)
    const response = await request.post(`/api/evaluate/${id}/finalize`);
    expect([200, 202]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.status).toBe("published");
      expect(body.aggregateScore).toBeDefined();
    }
  });
});
