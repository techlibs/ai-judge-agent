import { test, expect } from "@playwright/test";
import { TEST_API_KEY } from "../fixtures/seed-data";


test.describe("POST /api/webhooks/proposals", () => {
  test("returns 401 without X-API-Key header", async ({ request }) => {
    const response = await request.post("/api/webhooks/proposals", {
      data: {},
    });
    expect(response.status()).toBe(401);
  });

  test("returns 401 with invalid X-API-Key", async ({ request }) => {
    const response = await request.post("/api/webhooks/proposals", {
      headers: { "X-API-Key": "bad-key" },
      data: {},
    });
    expect(response.status()).toBe(401);
  });

  test("returns 413 when body exceeds 256KB", async ({ request }) => {
    // Send a body larger than 256KB (256 * 1024 = 262144 bytes)
    const largeString = "x".repeat(270000);
    const response = await request.post("/api/webhooks/proposals", {
      headers: {
        "X-API-Key": TEST_API_KEY,
        "Content-Type": "text/plain",
      },
      data: largeString,
    });
    expect(response.status()).toBe(413);
  });

  test("returns 400 with invalid JSON body", async ({ request }) => {
    const response = await request.post("/api/webhooks/proposals", {
      headers: {
        "X-API-Key": TEST_API_KEY,
        "Content-Type": "text/plain",
      },
      data: "not-json",
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("returns 400 with missing required fields", async ({ request }) => {
    const response = await request.post("/api/webhooks/proposals", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.details)).toBe(true);
  });

  test("returns 401 with invalid HMAC signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/proposals", {
      headers: {
        "X-API-Key": TEST_API_KEY,
        "X-Signature-256":
          "sha256=0000000000000000000000000000000000000000000000000000000000000000",
      },
      data: { title: "Test", description: "Test proposal" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toContain("signature");
  });

  test("returns 409 for duplicate proposal", async () => {
    test.skip(true, "duplicate detection depends on computeProposalId hash — requires integration test");
  });
});
