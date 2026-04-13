import { test, expect } from "@playwright/test";
import { TEST_API_KEY } from "../fixtures/seed-data";


test.describe("POST /api/webhooks/disputes", () => {
  test("returns 401 without X-API-Key header", async ({ request }) => {
    const response = await request.post("/api/webhooks/disputes", {
      data: {},
    });
    expect(response.status()).toBe(401);
  });

  test("returns 400 with empty body and valid API key", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks/disputes", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
