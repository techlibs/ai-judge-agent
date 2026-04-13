import { test, expect } from "@playwright/test";
import {
  FUNDED_PROPOSAL_ID,
  PENDING_PROPOSAL_ID,
} from "../fixtures/seed-data";

test.use({ baseURL: "http://localhost:3000" });

test.describe("POST /api/evaluate/:id/finalize", () => {
  test("returns 404 for nonexistent proposal", async ({ request }) => {
    const response = await request.post(
      "/api/evaluate/nonexistent/finalize"
    );
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("NOT_FOUND");
  });

  test("returns 409 for already finalized proposal", async ({ request }) => {
    const response = await request.post(
      `/api/evaluate/${FUNDED_PROPOSAL_ID}/finalize`
    );
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("ALREADY_FINALIZED");
  });

  test("returns 400 when evaluation job is not complete", async ({
    request,
  }) => {
    const response = await request.post(
      `/api/evaluate/${PENDING_PROPOSAL_ID}/finalize`
    );
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("NOT_READY");
  });
});
