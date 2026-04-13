import { test, expect } from "@playwright/test";
import {
  EVALUATED_PROPOSAL_ID,
  PENDING_PROPOSAL_ID,
} from "../fixtures/seed-data";


test.describe("GET /api/proposals/:id", () => {
  test("returns full proposal with evaluation for evaluated proposal", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/proposals/${EVALUATED_PROPOSAL_ID}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("title");
    expect(body.evaluation).toBeTruthy();
    expect(body.evaluation).toHaveProperty("finalScore");
    expect(body.evaluation.dimensions).toHaveLength(4);
    expect(body).toHaveProperty("verification");
    expect(body.source).toBe("cache");
  });

  test("each evaluation dimension has required fields", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/proposals/${EVALUATED_PROPOSAL_ID}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const dim of body.evaluation.dimensions) {
      expect(dim).toHaveProperty("dimension");
      expect(dim).toHaveProperty("weight");
      expect(dim).toHaveProperty("score");
      expect(typeof dim.rubricApplied).toBe("object");
      expect(typeof dim.reasoningChain).toBe("string");
      expect(Array.isArray(dim.inputDataConsidered)).toBe(true);
    }
  });

  test("returns 404 for nonexistent proposal", async ({ request }) => {
    const response = await request.get("/api/proposals/nonexistent");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("NOT_FOUND");
  });

  test("pending proposal returns null evaluation", async ({ request }) => {
    const response = await request.get(
      `/api/proposals/${PENDING_PROPOSAL_ID}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.evaluation).toBeNull();
  });

  test("response includes verification links", async ({ request }) => {
    const response = await request.get(
      `/api/proposals/${EVALUATED_PROPOSAL_ID}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.verification.chainExplorerUrl).toContain("basescan.org");
  });
});
