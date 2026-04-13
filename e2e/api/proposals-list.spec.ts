import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3000" });

test.describe("GET /api/proposals", () => {
  test("returns paginated list with expected structure", async ({
    request,
  }) => {
    const response = await request.get("/api/proposals");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toHaveProperty("page");
    expect(body.pagination).toHaveProperty("pageSize");
    expect(body.pagination).toHaveProperty("total");
    expect(body.pagination).toHaveProperty("totalPages");
    expect(body.source).toBe("cache");
  });

  test("paginates correctly with page=2 and pageSize=10", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/proposals?page=2&pageSize=10"
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.pagination.page).toBe(2);
    expect(body.data.length).toBeLessThanOrEqual(10);
  });

  test("filters by funding round", async ({ request }) => {
    const response = await request.get(
      "/api/proposals?fundingRoundId=round-1"
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.data) {
      expect(item.fundingRoundId).toBe("round-1");
    }
  });

  test("filters by status", async ({ request }) => {
    const response = await request.get(
      "/api/proposals?status=evaluated"
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.data) {
      expect(item.status).toBe("evaluated");
    }
  });

  test("filters by title search", async ({ request }) => {
    const response = await request.get("/api/proposals?search=Solar");
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.data) {
      expect(item.title.toLowerCase()).toContain("solar");
    }
  });

  test("clamps pageSize to max 100", async ({ request }) => {
    const response = await request.get(
      "/api/proposals?pageSize=200"
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(100);
  });

  test("default sort by chainTimestamp desc", async ({ request }) => {
    const response = await request.get("/api/proposals");
    expect(response.status()).toBe(200);
    const body = await response.json();
    if (body.data.length >= 2) {
      const first = new Date(body.data[0].chainTimestamp).getTime();
      const second = new Date(body.data[1].chainTimestamp).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });
});
