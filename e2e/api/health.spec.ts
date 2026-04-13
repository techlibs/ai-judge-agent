import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3000" });

test.describe("GET /api/health", () => {
  test("returns structured response with healthy status and checks", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("healthy");
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("db");
    expect(body.checks).toHaveProperty("ipfs");
    expect(body.checks).toHaveProperty("chain");
  });

  test("DB check is ok with local SQLite", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    expect(body.checks.db.status).toBe("ok");
    expect(typeof body.checks.db.latencyMs).toBe("number");
  });

  test("IPFS check reports error without PINATA_GATEWAY", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    expect(body.checks.ipfs.status).toBe("error");
  });

  test("Chain check reports a status field", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    expect(["ok", "error"]).toContain(body.checks.chain.status);
  });
});
