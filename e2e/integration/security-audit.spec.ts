import { test, expect } from "@playwright/test";
import {
  TEST_API_KEY,
  CORRUPT_JSON_PROPOSAL_ID,
  FUNDED_PROPOSAL_ID,
  PENDING_PROPOSAL_ID,
} from "../fixtures/seed-data";

const BASE_URL = "http://localhost:3001";

test.describe("Security Audit Regression Tests", () => {
  // ─── H-01: Webhook Signature Bypass ──────────────────────────────────────

  test.describe("[H-01] Webhook Signature Bypass", () => {
    test("proposals endpoint accepts unsigned request when secret exists", async ({
      request,
    }) => {
      // AUDIT: H-01 — Webhook signature verification is optional
      // Current: Request succeeds without signature (bypass exists)
      // Expected after fix: 401 UNAUTHORIZED when X-Signature-256 is missing and webhookSecret is configured
      const response = await request.post(
        `${BASE_URL}/api/webhooks/proposals`,
        {
          headers: { "X-API-Key": TEST_API_KEY },
          data: {
            title: "H-01 Test Proposal",
            description: "Testing signature bypass",
          },
        }
      );

      // The request should be rejected (401) but currently isn't — signature check is skipped
      expect(response.status()).not.toBe(401);
    });

    test("disputes endpoint accepts unsigned request when secret exists", async ({
      request,
    }) => {
      // AUDIT: H-01 — Webhook signature verification is optional
      // Current: Request succeeds without signature (bypass exists)
      // Expected after fix: 401 UNAUTHORIZED when X-Signature-256 is missing and webhookSecret is configured
      const response = await request.post(
        `${BASE_URL}/api/webhooks/disputes`,
        {
          headers: { "X-API-Key": TEST_API_KEY },
          data: {
            proposalId: FUNDED_PROPOSAL_ID,
            reason: "H-01 signature bypass test",
          },
        }
      );

      // The request should be rejected (401) but currently isn't — signature check is skipped
      expect(response.status()).not.toBe(401);
    });
  });

  // ─── H-02: Finalize Endpoint Auth Gap ────────────────────────────────────

  test.describe("[H-02] Finalize Endpoint Auth Gap", () => {
    test("finalize processes already-finalized proposal without auth", async ({
      request,
    }) => {
      // AUDIT: H-02 — Finalize endpoint has no authentication
      // Current: Returns 409 ALREADY_FINALIZED (business logic runs without auth)
      // Expected after fix: 401 UNAUTHORIZED before any business logic
      const response = await request.post(
        `${BASE_URL}/api/evaluate/${FUNDED_PROPOSAL_ID}/finalize`
      );

      // Should get 401 but instead gets business-logic response (409 or other)
      expect(response.status()).not.toBe(401);
    });

    test("finalize processes pending proposal without auth", async ({
      request,
    }) => {
      // AUDIT: H-02 — Finalize endpoint has no authentication
      // Current: Returns 400 NOT_READY (business logic runs without auth)
      // Expected after fix: 401 UNAUTHORIZED before any business logic
      const response = await request.post(
        `${BASE_URL}/api/evaluate/${PENDING_PROPOSAL_ID}/finalize`
      );

      // Should get 401 but instead gets business-logic response (400 or other)
      expect(response.status()).not.toBe(401);
    });
  });

  // ─── H-03: Rate Limiting Disabled ────────────────────────────────────────

  test.describe("[H-03] Rate Limiting Disabled", () => {
    test("6 rapid requests all succeed without 429", async ({ request }) => {
      // AUDIT: H-03 — Rate limiting silently disabled when Upstash Redis not configured
      // Current: All requests succeed because rate limiter returns { success: true }
      // Expected after fix: 6th request returns 429 (in-memory fallback or fail-closed)
      const responses = await Promise.all(
        Array.from({ length: 6 }, () =>
          request.post(`${BASE_URL}/api/webhooks/proposals`, {
            headers: { "X-API-Key": TEST_API_KEY },
            data: {
              title: "Rate limit test",
              description: "Testing rate limiting",
            },
          })
        )
      );

      const statuses = responses.map((r) => r.status());

      // None should be 429 — rate limiting is not enforced
      for (const status of statuses) {
        expect(status).not.toBe(429);
      }
    });
  });

  // ─── H-04: Cron Secret Edge Case ────────────────────────────────────────

  test.describe("[H-04] Cron Secret Edge Case", () => {
    test("empty bearer token is rejected", async ({ request }) => {
      // AUDIT: H-04 — Cron secret validation edge cases
      // Current: Empty bearer token correctly rejected (this is the working case)
      // Note: Full H-04 test (CRON_SECRET="" bypass) requires server restart with modified env
      const response = await request.get(
        `${BASE_URL}/api/cron/monitoring`,
        {
          headers: { Authorization: "Bearer " },
        }
      );

      expect(response.status()).toBe(401);
    });
  });

  // ─── M-04: JSON.parse Crash on Corrupt Data ─────────────────────────────

  test.describe("[M-04] JSON.parse Crash on Corrupt Data", () => {
    test("corrupt rubricApplied causes 500", async ({ request }) => {
      // AUDIT: M-04 — Unhandled JSON.parse on corrupt dimension_scores data
      // Current: Request crashes with 500 due to invalid JSON in rubricApplied
      // Expected after fix: Graceful error handling (sanitized response or fallback)
      const response = await request.get(
        `${BASE_URL}/api/proposals/${CORRUPT_JSON_PROPOSAL_ID}`
      );

      expect(response.status()).toBe(500);
    });
  });

  // ─── M-05: Origin Validation Dead Code ───────────────────────────────────

  test.describe("[M-05] Origin Validation Dead Code", () => {
    test("evil origin not rejected on mutating endpoint", async ({
      request,
    }) => {
      // AUDIT: M-05 — validateOrigin function exists but is never called
      // Current: Request with evil origin proceeds to business logic
      // Expected after fix: 403 FORBIDDEN for untrusted origins on mutating endpoints
      const response = await request.post(
        `${BASE_URL}/api/evaluate/${FUNDED_PROPOSAL_ID}/finalize`,
        {
          headers: { Origin: "https://evil.example.com" },
        }
      );

      // Should get 403 but origin is never validated
      expect(response.status()).not.toBe(403);
    });
  });

  // ─── M-07: SQL LIKE Wildcard Injection ───────────────────────────────────

  test.describe("[M-07] SQL LIKE Wildcard Injection", () => {
    test("percent wildcard matches all proposals", async ({ request }) => {
      // AUDIT: M-07 — SQL LIKE wildcards not escaped in search parameter
      // Current: % becomes %%% in LIKE, matches everything (returns all proposals)
      // Expected after fix: Literal % search returns 0 results
      const response = await request.get(
        `${BASE_URL}/api/proposals?search=%25&pageSize=100`
      );

      expect(response.ok()).toBe(true);
      const body = await response.json();

      // pagination.total reflects unescaped wildcard matching all rows
      expect(body.pagination.total).toBeGreaterThanOrEqual(25);
    });

    test("underscore wildcard matches proposals", async ({ request }) => {
      // AUDIT: M-07 — SQL LIKE wildcards not escaped in search parameter
      // Current: _ matches any single character in LIKE clause
      // Expected after fix: Literal _ search returns 0 results
      const response = await request.get(
        `${BASE_URL}/api/proposals?search=_`
      );

      expect(response.ok()).toBe(true);
      const body = await response.json();

      // _ wildcard matches any single character, so proposals with titles are matched
      expect(body.pagination.total).toBeGreaterThan(0);
    });
  });
});
