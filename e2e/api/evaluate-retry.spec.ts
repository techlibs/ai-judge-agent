import { test, expect } from "@playwright/test";
import { seedProposal, seedEvaluation, cleanupTestData } from "../helpers/db-fixtures";

// The retry route behavior:
// - dimension not in JUDGE_DIMENSIONS        → 400 { error: "Invalid dimension" }
// - no evaluation found                      → 404 { error: "No evaluation found" }
// - evaluation.status !== "failed"           → 409 { error: "Evaluation is not in failed state" }
// - evaluation.status === "failed"           → 200 { status: "ready", stream: "/api/evaluate/{id}/{dim}" }

test.describe("POST /api/evaluate/{id}/{dimension}/retry", () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test("allows retry of failed evaluation", async ({ request }) => {
    const id = await seedProposal({ title: "Retry Test", status: "evaluating" });
    await seedEvaluation({ proposalId: id, dimension: "tech", status: "failed" });

    const response = await request.post(`/api/evaluate/${id}/tech/retry`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ready");
    expect(body.stream).toBe(`/api/evaluate/${id}/tech`);
  });

  test("rejects retry of completed evaluation (409)", async ({ request }) => {
    const id = await seedProposal({ title: "No Retry Complete", status: "evaluating" });
    await seedEvaluation({
      proposalId: id,
      dimension: "tech",
      score: 8000,
      status: "complete",
      recommendation: "fund",
      confidence: "high",
    });

    const response = await request.post(`/api/evaluate/${id}/tech/retry`);
    expect(response.status()).toBe(409);
  });

  test("rejects retry of pending evaluation (409)", async ({ request }) => {
    const id = await seedProposal({ title: "No Retry Pending", status: "evaluating" });
    await seedEvaluation({ proposalId: id, dimension: "impact", status: "pending" });

    const response = await request.post(`/api/evaluate/${id}/impact/retry`);
    expect(response.status()).toBe(409);
  });

  test("returns 404 when no evaluation exists for dimension", async ({ request }) => {
    const id = await seedProposal({ title: "No Eval Retry", status: "evaluating" });
    const response = await request.post(`/api/evaluate/${id}/cost/retry`);
    expect(response.status()).toBe(404);
  });

  test("returns 400 for invalid dimension name", async ({ request }) => {
    const id = await seedProposal({ title: "Invalid Dim Retry", status: "evaluating" });
    const response = await request.post(`/api/evaluate/${id}/invalid-dimension/retry`);
    expect(response.status()).toBe(400);
  });
});
