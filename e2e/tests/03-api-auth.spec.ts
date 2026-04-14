import { test, expect } from "@playwright/test";
import {
  TEST_API_KEY,
  API_KEY_HEADER,
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "../helpers/test-env";
import validProposal from "../fixtures/proposals/valid-infrastructure.json";

const EVALUATE_ENDPOINT = "/api/evaluate";
const HEALTH_ENDPOINT = "/api/health";
const EVALUATIONS_ENDPOINT = "/api/evaluations";
const SAMPLE_EVALUATION_ID = "test-evaluation-id-12345";

const WRONG_API_KEY = "wrong-api-key-definitely-invalid";

test.describe("API Authentication", () => {
  test("POST /api/evaluate without key returns 401", async () => {
    const context = await createUnauthenticatedContext();

    const response = await context.post(EVALUATE_ENDPOINT, {
      data: { proposal: validProposal },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("MISSING_API_KEY");
    expect(body.message).toBe("x-api-key header is required");

    await context.dispose();
  });

  test("POST /api/evaluate with wrong key returns 403", async () => {
    const context = await createUnauthenticatedContext();

    const response = await context.post(EVALUATE_ENDPOINT, {
      headers: {
        [API_KEY_HEADER]: WRONG_API_KEY,
      },
      data: { proposal: validProposal },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("INVALID_API_KEY");

    await context.dispose();
  });

  test("POST /api/evaluate with correct key processes request", async () => {
    const context = await createAuthenticatedContext();

    const response = await context.post(EVALUATE_ENDPOINT, {
      data: { proposal: validProposal },
    });

    // With correct key, should get past auth.
    // May return 200 (success) or 500 (if AI providers are not configured).
    // The key test is that it does NOT return 401 or 403.
    const status = response.status();
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);

    await context.dispose();
  });

  test("GET /api/health requires no auth and returns 200", async () => {
    const context = await createUnauthenticatedContext();

    const response = await context.get(HEALTH_ENDPOINT);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("healthy");
    expect(body.version).toBe("0.1.0");
    expect(body.timestamp).toBeTruthy();

    await context.dispose();
  });

  test("GET /api/evaluations/[id] requires no auth", async () => {
    const context = await createUnauthenticatedContext();

    const response = await context.get(
      `${EVALUATIONS_ENDPOINT}/${SAMPLE_EVALUATION_ID}`
    );

    // Should not return 401 or 403 — evaluation lookup is public.
    // May return 404 (not found) or 500 (chain connection error).
    const status = response.status();
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);

    await context.dispose();
  });
});
