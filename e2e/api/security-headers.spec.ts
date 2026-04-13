import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3000" });

test.describe("Security headers on GET /", () => {
  test("X-Frame-Options is DENY", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
  });

  test("X-Content-Type-Options is nosniff", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("Content-Security-Policy contains frame-ancestors none", async ({
    request,
  }) => {
    const response = await request.get("/");
    const csp = response.headers()["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("Strict-Transport-Security is present", async ({ request }) => {
    const response = await request.get("/");
    expect(
      response.headers()["strict-transport-security"]
    ).toBeDefined();
  });

  test("Referrer-Policy is present", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["referrer-policy"]).toBeDefined();
  });
});
