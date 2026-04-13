import { test, expect } from "@playwright/test";
import { seedProposal, cleanupTestData } from "../helpers/db-fixtures";

// The trigger route enforces CORS: origin must match NEXT_PUBLIC_APP_URL (default: http://localhost:3000)
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

test.describe("POST /api/evaluate/{id}", () => {
  let proposalId: string;

  test.beforeEach(async () => {
    await cleanupTestData();
    proposalId = await seedProposal({ title: "Trigger Test", status: "pending" });
  });

  test("triggers evaluation for a pending proposal", async ({ request }) => {
    const response = await request.post(`/api/evaluate/${proposalId}`, {
      headers: { origin: APP_ORIGIN },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("evaluating");
    expect(body.streams).toHaveProperty("tech");
    expect(body.streams).toHaveProperty("impact");
    expect(body.streams).toHaveProperty("cost");
    expect(body.streams).toHaveProperty("team");
  });

  test("rejects double evaluation trigger (409)", async ({ request }) => {
    await request.post(`/api/evaluate/${proposalId}`, {
      headers: { origin: APP_ORIGIN },
    });
    const response = await request.post(`/api/evaluate/${proposalId}`, {
      headers: { origin: APP_ORIGIN },
    });
    expect(response.status()).toBe(409);
  });

  test("returns 404 for non-existent proposal", async ({ request }) => {
    const response = await request.post("/api/evaluate/non-existent-id", {
      headers: { origin: APP_ORIGIN },
    });
    expect(response.status()).toBe(404);
  });

  test("returns 403 when origin header is missing", async ({ request }) => {
    const response = await request.post(`/api/evaluate/${proposalId}`);
    expect(response.status()).toBe(403);
  });
});
