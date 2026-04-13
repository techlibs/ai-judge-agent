import { test, expect } from "@playwright/test";


test.describe("GET /api/rounds/:id/stats", () => {
  test("returns round statistics for round-1", async ({ request }) => {
    const response = await request.get("/api/rounds/round-1/stats");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("fundingRoundId");
    expect(body.proposalCount).toBe(15);
    expect(body.evaluatedCount).toBe(10);
    expect(body).toHaveProperty("averageScore");
    expect(body).toHaveProperty("totalFundsReleased");
    expect(body).toHaveProperty("disputeCount");
    expect(body).toHaveProperty("source");
  });

  test("returns 404 for nonexistent round", async ({ request }) => {
    const response = await request.get(
      "/api/rounds/nonexistent/stats"
    );
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("NOT_FOUND");
  });
});
