import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3000" });

test.describe("GET /api/cron/monitoring", () => {
  test("returns 401 without Authorization header", async ({ request }) => {
    const response = await request.get("/api/cron/monitoring");
    expect(response.status()).toBe(401);
  });

  test("returns 401 with wrong bearer token", async ({ request }) => {
    const response = await request.get("/api/cron/monitoring", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(response.status()).toBe(401);
  });

  test("returns 200 with valid CRON_SECRET", async ({ request }) => {
    const response = await request.get("/api/cron/monitoring", {
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body).toHaveProperty("projectsProcessed");
  });
});
