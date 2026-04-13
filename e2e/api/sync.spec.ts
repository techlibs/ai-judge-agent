import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3000" });

test.describe("POST /api/sync", () => {
  test("returns 401 without authentication", async ({ request }) => {
    const response = await request.post("/api/sync");
    expect(response.status()).toBe(401);
  });
});
