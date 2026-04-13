import { test, expect } from "@playwright/test";
import { seedProposal, seedEvaluation, cleanupTestData } from "../helpers/db-fixtures";

test.describe("GET /api/evaluate/{id}/status", () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test("returns status with no dimensions when evaluating and none seeded", async ({ request }) => {
    const id = await seedProposal({ title: "Status Test", status: "evaluating" });
    const response = await request.get(`/api/evaluate/${id}/status`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("evaluating");
    expect(body.dimensions).toBeDefined();
  });

  test("returns status with completed dimensions", async ({ request }) => {
    const id = await seedProposal({ title: "Partial Status", status: "evaluating" });
    await seedEvaluation({
      proposalId: id,
      dimension: "tech",
      score: 8000,
      status: "complete",
      recommendation: "fund",
      confidence: "high",
    });
    await seedEvaluation({
      proposalId: id,
      dimension: "impact",
      score: 7500,
      status: "complete",
      recommendation: "fund",
      confidence: "high",
    });

    const response = await request.get(`/api/evaluate/${id}/status`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.dimensions.tech.status).toBe("complete");
    expect(body.dimensions.impact.status).toBe("complete");
  });

  test("returns status shape with score and recommendation for complete dimensions", async ({ request }) => {
    const id = await seedProposal({ title: "Score Shape Test", status: "evaluating" });
    await seedEvaluation({
      proposalId: id,
      dimension: "cost",
      score: 6000,
      status: "complete",
      recommendation: "fund",
      confidence: "high",
    });

    const response = await request.get(`/api/evaluate/${id}/status`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.dimensions.cost.score).toBe(6000);
    expect(body.dimensions.cost.recommendation).toBe("fund");
  });

  test("returns 404 for non-existent proposal", async ({ request }) => {
    const response = await request.get("/api/evaluate/non-existent/status");
    expect(response.status()).toBe(404);
  });
});
